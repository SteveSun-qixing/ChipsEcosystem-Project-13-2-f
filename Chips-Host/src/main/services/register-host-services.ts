import fs from 'node:fs/promises';
import path from 'node:path';
import { createError } from '../../shared/errors';
import { createId, deepClone } from '../../shared/utils';
import type { LogEntry, RouteDescriptor, RouteInvocationContext, ServiceRegistration } from '../../shared/types';
import { StructuredLogger } from '../../shared/logger';
import { PluginRuntime } from '../../runtime';
import type { Kernel } from '../../../packages/kernel/src';
import type { PALAdapter } from '../../../packages/pal/src';
import { CardService } from '../../../packages/card-service/src';
import { BoxService } from '../../../packages/box-service/src';
import { StoreZipService } from '../../../packages/zip-service/src';

interface HostServiceContext {
  kernel: Kernel;
  pal: PALAdapter;
  workspacePath: string;
  logger: StructuredLogger;
  getCardService: () => CardService;
  getBoxService: () => BoxService;
  getZipService: () => StoreZipService;
  runtime: PluginRuntime;
}

interface PluginRecord {
  id: string;
  manifestPath: string;
  installPath: string;
  enabled: boolean;
  type: 'app' | 'card' | 'layout' | 'module' | 'theme';
  capabilities: string[];
  entry?: string;
  installedAt: number;
}

interface ModuleRecord {
  slot: string;
  module: Record<string, unknown>;
  mountedAt: number;
}

interface ThemeRecord {
  id: string;
  name: string;
  publisher: string;
  css: string;
  tokens: Record<string, unknown>;
}

interface RouteMetric {
  count: number;
  failures: number;
  latencies: number[];
}

interface RuntimeState {
  config: Map<string, unknown>;
  modules: Map<string, ModuleRecord>;
  credentials: Map<string, string>;
  clipboard: unknown;
  themes: ThemeRecord[];
  currentThemeId: string;
  locale: string;
  locales: Record<string, Record<string, string>>;
  routeMetrics: Map<string, RouteMetric>;
  activatedServices: Set<string>;
}

const ensureWorkspace = async (workspacePath: string): Promise<void> => {
  await fs.mkdir(workspacePath, { recursive: true });
};

const updateMetric = (state: RuntimeState, route: string, failed: boolean, durationMs: number): void => {
  const current = state.routeMetrics.get(route) ?? { count: 0, failures: 0, latencies: [] };
  current.count += 1;
  if (failed) {
    current.failures += 1;
  }
  current.latencies.push(durationMs);
  if (current.latencies.length > 200) {
    current.latencies.shift();
  }
  state.routeMetrics.set(route, current);
};

const withMetrics = <I, O>(
  state: RuntimeState,
  route: string,
  handler: (input: I, ctx: RouteInvocationContext) => Promise<O>
): ((input: I, ctx: RouteInvocationContext) => Promise<O>) => {
  return async (input, ctx) => {
    const started = Date.now();
    try {
      const result = await handler(input, ctx);
      updateMetric(state, route, false, Date.now() - started);
      return result;
    } catch (error) {
      updateMetric(state, route, true, Date.now() - started);
      throw error;
    }
  };
};

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
};

const descriptor = <I, O>(
  key: `${string}.${string}`,
  permission: string[],
  timeoutMs: number,
  idempotent: boolean,
  retries: 0 | 1 | 2 | 3,
  handler: (input: I, ctx: RouteInvocationContext) => Promise<O>
): RouteDescriptor<I, O> => ({
  key,
  schemaIn: `schemas/${key}.request.json`,
  schemaOut: `schemas/${key}.response.json`,
  permission,
  timeoutMs,
  idempotent,
  retries,
  handler
});

const buildState = (): RuntimeState => ({
  config: new Map<string, unknown>(),
  modules: new Map<string, ModuleRecord>(),
  credentials: new Map<string, string>(),
  clipboard: null,
  themes: [
    {
      id: 'chips-official.default-theme',
      name: 'Default Theme',
      publisher: 'chips-official',
      css: ':root { --chip-color-bg: #ffffff; --chip-color-fg: #111111; }',
      tokens: {
        ref: { white: '#ffffff', black: '#111111' },
        sys: { bg: '{ref.white}', fg: '{ref.black}' }
      }
    }
  ],
  currentThemeId: 'chips-official.default-theme',
  locale: 'zh-CN',
  locales: {
    'zh-CN': {
      'system.ready': '系统已就绪',
      'system.error': '系统异常'
    },
    'en-US': {
      'system.ready': 'System ready',
      'system.error': 'System error'
    }
  },
  routeMetrics: new Map<string, RouteMetric>(),
  activatedServices: new Set<string>()
});

const persistConfig = async (workspacePath: string, configMap: Map<string, unknown>): Promise<void> => {
  const data = Object.fromEntries(configMap.entries());
  await fs.writeFile(path.join(workspacePath, 'config.json'), JSON.stringify(data, null, 2), 'utf-8');
};

const loadConfig = async (workspacePath: string, state: RuntimeState): Promise<void> => {
  const configPath = path.join(workspacePath, 'config.json');
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      state.config.set(key, value);
    }
  } catch {
    await persistConfig(workspacePath, state.config);
  }
};

const toPlainLogEntries = (entries: LogEntry[]): LogEntry[] => entries.map((entry) => deepClone(entry));

const ensureServiceActivation = async (ctx: HostServiceContext, state: RuntimeState, serviceName: string): Promise<void> => {
  if (state.activatedServices.has(serviceName)) {
    return;
  }

  if (serviceName === 'card') {
    ctx.getCardService();
  } else if (serviceName === 'box') {
    ctx.getBoxService();
  } else if (serviceName === 'zip') {
    ctx.getZipService();
  }

  state.activatedServices.add(serviceName);
  await ctx.kernel.events.emit('service.activated', 'host-service', { service: serviceName });
};

const bindLazyActivation = (ctx: HostServiceContext, state: RuntimeState, service: ServiceRegistration): ServiceRegistration => {
  const wrappedActions: ServiceRegistration['actions'] = {};
  for (const [actionName, actionDefinition] of Object.entries(service.actions)) {
    const descriptor = actionDefinition.descriptor;
    const originalHandler = descriptor.handler;
    wrappedActions[actionName] = {
      descriptor: {
        ...descriptor,
        handler: async (input, routeContext) => {
          await ensureServiceActivation(ctx, state, service.name);
          return originalHandler(input, routeContext);
        }
      }
    };
  }

  return {
    ...service,
    actions: wrappedActions
  };
};

const createServices = (ctx: HostServiceContext, state: RuntimeState): ServiceRegistration[] => {
  const fileService: ServiceRegistration = {
    name: 'file',
    actions: {
      read: {
        descriptor: descriptor<{ path: string; options?: { encoding?: BufferEncoding } }, { content: string | Buffer }>(
          'file.read',
          ['file.read'],
          5_000,
          true,
          0,
          withMetrics(state, 'file.read', async (input) => {
            const content = await ctx.pal.fs.readFile(input.path, input.options);
            return { content };
          })
        )
      },
      write: {
        descriptor: descriptor<{ path: string; content: string | Buffer }, { ack: true }>(
          'file.write',
          ['file.write'],
          5_000,
          false,
          0,
          withMetrics(state, 'file.write', async (input) => {
            await ctx.pal.fs.writeFile(input.path, input.content);
            return { ack: true };
          })
        )
      },
      stat: {
        descriptor: descriptor<{ path: string }, { meta: unknown }>(
          'file.stat',
          ['file.read'],
          5_000,
          true,
          0,
          withMetrics(state, 'file.stat', async (input) => {
            const meta = await ctx.pal.fs.stat(input.path);
            return { meta };
          })
        )
      },
      list: {
        descriptor: descriptor<{ dir: string; options?: { recursive?: boolean } }, { entries: string[] }>(
          'file.list',
          ['file.read'],
          5_000,
          true,
          0,
          withMetrics(state, 'file.list', async (input) => {
            const entries = await ctx.pal.fs.list(input.dir, input.options);
            return { entries };
          })
        )
      },
      watch: {
        descriptor: descriptor<{ path: string; timeoutMs?: number }, { event: unknown | null }>(
          'file.watch',
          ['file.read'],
          30_000,
          true,
          0,
          withMetrics(state, 'file.watch', async (input) => {
            const timeoutMs = typeof input.timeoutMs === 'number' && input.timeoutMs > 0 ? input.timeoutMs : 5_000;
            const event = await new Promise<unknown | null>(async (resolve, reject) => {
              let closed = false;
              let subscription: Awaited<ReturnType<typeof ctx.pal.fs.watch>> | undefined;
              const closeWatch = async () => {
                if (closed) {
                  return;
                }
                closed = true;
                await subscription?.close();
              };

              const timer = setTimeout(async () => {
                await closeWatch();
                resolve(null);
              }, timeoutMs);

              try {
                subscription = await ctx.pal.fs.watch(input.path, async (watchEvent) => {
                  clearTimeout(timer);
                  await closeWatch();
                  resolve(watchEvent);
                });
              } catch (error) {
                clearTimeout(timer);
                await closeWatch();
                reject(error);
              }
            });

            return { event };
          })
        )
      }
    }
  };

  const resourceService: ServiceRegistration = {
    name: 'resource',
    actions: {
      resolve: {
        descriptor: descriptor<{ resourceId: string }, { uri: string }>(
          'resource.resolve',
          ['resource.read'],
          5_000,
          true,
          0,
          withMetrics(state, 'resource.resolve', async (input) => {
            const uri = input.resourceId.startsWith('file://') ? input.resourceId : `file://${input.resourceId}`;
            return { uri };
          })
        )
      },
      readMetadata: {
        descriptor: descriptor<{ resourceId: string }, { metadata: unknown }>(
          'resource.readMetadata',
          ['resource.read'],
          5_000,
          true,
          0,
          withMetrics(state, 'resource.readMetadata', async (input) => {
            const normalized = input.resourceId.replace(/^file:\/\//, '');
            const meta = await ctx.pal.fs.stat(normalized);
            return { metadata: meta };
          })
        )
      },
      readBinary: {
        descriptor: descriptor<{ resourceId: string }, { data: Buffer }>(
          'resource.readBinary',
          ['resource.read'],
          5_000,
          true,
          0,
          withMetrics(state, 'resource.readBinary', async (input) => {
            const normalized = input.resourceId.replace(/^file:\/\//, '');
            const data = await ctx.pal.fs.readFile(normalized);
            if (!Buffer.isBuffer(data)) {
              return { data: Buffer.from(data, 'utf-8') };
            }
            return { data };
          })
        )
      }
    }
  };

  const configService: ServiceRegistration = {
    name: 'config',
    actions: {
      get: {
        descriptor: descriptor<{ key: string }, { value: unknown }>(
          'config.get',
          ['config.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'config.get', async (input) => {
            return { value: state.config.get(input.key) ?? null };
          })
        )
      },
      set: {
        descriptor: descriptor<{ key: string; value: unknown }, { ack: true }>(
          'config.set',
          ['config.write'],
          2_000,
          false,
          0,
          withMetrics(state, 'config.set', async (input) => {
            state.config.set(input.key, input.value);
            await persistConfig(ctx.workspacePath, state.config);
            return { ack: true };
          })
        )
      },
      batchSet: {
        descriptor: descriptor<{ entries: Record<string, unknown> }, { ack: true }>(
          'config.batchSet',
          ['config.write'],
          5_000,
          false,
          0,
          withMetrics(state, 'config.batchSet', async (input) => {
            for (const [key, value] of Object.entries(input.entries)) {
              state.config.set(key, value);
            }
            await persistConfig(ctx.workspacePath, state.config);
            return { ack: true };
          })
        )
      },
      reset: {
        descriptor: descriptor<{ key?: string }, { ack: true }>(
          'config.reset',
          ['config.write'],
          2_000,
          false,
          0,
          withMetrics(state, 'config.reset', async (input) => {
            if (input.key) {
              state.config.delete(input.key);
            } else {
              state.config.clear();
            }
            await persistConfig(ctx.workspacePath, state.config);
            return { ack: true };
          })
        )
      }
    }
  };

  const themeService: ServiceRegistration = {
    name: 'theme',
    actions: {
      list: {
        descriptor: descriptor<{ publisher?: string }, { themes: ThemeRecord[] }>(
          'theme.list',
          ['theme.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'theme.list', async (input) => {
            const themes = input.publisher
              ? state.themes.filter((theme) => theme.publisher === input.publisher)
              : state.themes;
            return { themes };
          })
        )
      },
      apply: {
        descriptor: descriptor<{ id: string }, { ack: true }>(
          'theme.apply',
          ['theme.write'],
          2_000,
          false,
          0,
          withMetrics(state, 'theme.apply', async (input) => {
            const theme = state.themes.find((candidate) => candidate.id === input.id);
            if (!theme) {
              throw createError('THEME_NOT_FOUND', `Theme not found: ${input.id}`);
            }
            state.currentThemeId = theme.id;
            await ctx.kernel.events.emit('theme.changed', 'theme-service', { id: theme.id });
            return { ack: true };
          })
        )
      },
      getCurrent: {
        descriptor: descriptor<Record<string, unknown>, { theme: ThemeRecord }>(
          'theme.getCurrent',
          ['theme.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'theme.getCurrent', async () => {
            const theme = state.themes.find((candidate) => candidate.id === state.currentThemeId);
            if (!theme) {
              throw createError('THEME_NOT_FOUND', 'Current theme not found');
            }
            return { theme };
          })
        )
      },
      getAllCss: {
        descriptor: descriptor<Record<string, unknown>, { css: string }>(
          'theme.getAllCss',
          ['theme.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'theme.getAllCss', async () => {
            const theme = state.themes.find((candidate) => candidate.id === state.currentThemeId);
            if (!theme) {
              throw createError('THEME_NOT_FOUND', 'Current theme not found');
            }
            return { css: theme.css };
          })
        )
      },
      resolve: {
        descriptor: descriptor<{ chain: string[] }, { tokens: Record<string, unknown> }>(
          'theme.resolve',
          ['theme.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'theme.resolve', async () => {
            const theme = state.themes.find((candidate) => candidate.id === state.currentThemeId);
            if (!theme) {
              throw createError('THEME_NOT_FOUND', 'Current theme not found');
            }
            return { tokens: theme.tokens };
          })
        )
      },
      contractGet: {
        descriptor: descriptor<{ component?: string }, { contract: Record<string, unknown> }>(
          'theme.contract.get',
          ['theme.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'theme.contract.get', async (input) => {
            return {
              contract: {
                component: input.component ?? 'global',
                slots: ['background', 'foreground', 'border', 'radius', 'shadow']
              }
            };
          })
        )
      }
    }
  };

  const i18nService: ServiceRegistration = {
    name: 'i18n',
    actions: {
      getCurrent: {
        descriptor: descriptor<Record<string, unknown>, { locale: string }>(
          'i18n.getCurrent',
          ['i18n.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'i18n.getCurrent', async () => ({ locale: state.locale }))
        )
      },
      setCurrent: {
        descriptor: descriptor<{ locale: string }, { ack: true }>(
          'i18n.setCurrent',
          ['i18n.write'],
          2_000,
          false,
          0,
          withMetrics(state, 'i18n.setCurrent', async (input) => {
            if (!state.locales[input.locale]) {
              throw createError('I18N_LOCALE_NOT_FOUND', `Locale not found: ${input.locale}`);
            }
            state.locale = input.locale;
            await ctx.kernel.events.emit('language.changed', 'i18n-service', { locale: input.locale });
            return { ack: true };
          })
        )
      },
      translate: {
        descriptor: descriptor<{ key: string; params?: Record<string, unknown> }, { text: string }>(
          'i18n.translate',
          ['i18n.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'i18n.translate', async (input) => {
            const table = state.locales[state.locale] ?? {};
            const template = table[input.key];
            if (!template) {
              throw createError('I18N_KEY_MISSING', `Translation key missing: ${input.key}`);
            }

            const text = Object.entries(input.params ?? {}).reduce((result, [key, value]) => {
              return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
            }, template);

            return { text };
          })
        )
      },
      listLocales: {
        descriptor: descriptor<Record<string, unknown>, { locales: string[] }>(
          'i18n.listLocales',
          ['i18n.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'i18n.listLocales', async () => ({ locales: Object.keys(state.locales) }))
        )
      }
    }
  };

  const windowService: ServiceRegistration = {
    name: 'window',
    actions: {
      open: {
        descriptor: descriptor<
          {
            config: {
              title: string;
              width: number;
              height: number;
              url?: string;
              pluginId?: string;
              sessionId?: string;
            };
          },
          { window: unknown }
        >(
          'window.open',
          ['window.control'],
          3_000,
          false,
          0,
          withMetrics(state, 'window.open', async (input) => {
            const window = await ctx.pal.window.create({ ...input.config });
            await ctx.kernel.events.emit('window.opened', 'window-service', window);
            return { window };
          })
        )
      },
      focus: {
        descriptor: descriptor<{ windowId: string }, { ack: true }>(
          'window.focus',
          ['window.control'],
          2_000,
          true,
          0,
          withMetrics(state, 'window.focus', async (input) => {
            await ctx.pal.window.focus(input.windowId);
            return { ack: true };
          })
        )
      },
      resize: {
        descriptor: descriptor<{ windowId: string; width: number; height: number }, { ack: true }>(
          'window.resize',
          ['window.control'],
          2_000,
          false,
          0,
          withMetrics(state, 'window.resize', async (input) => {
            await ctx.pal.window.resize(input.windowId, input.width, input.height);
            return { ack: true };
          })
        )
      },
      setState: {
        descriptor: descriptor<{ windowId: string; state: 'normal' | 'minimized' | 'maximized' | 'fullscreen' }, { ack: true }>(
          'window.setState',
          ['window.control'],
          2_000,
          false,
          0,
          withMetrics(state, 'window.setState', async (input) => {
            await ctx.pal.window.setState(input.windowId, input.state);
            return { ack: true };
          })
        )
      },
      getState: {
        descriptor: descriptor<{ windowId: string }, { state: unknown }>(
          'window.getState',
          ['window.control'],
          2_000,
          true,
          0,
          withMetrics(state, 'window.getState', async (input) => {
            const state = await ctx.pal.window.getState(input.windowId);
            return { state };
          })
        )
      },
      close: {
        descriptor: descriptor<{ windowId: string }, { ack: true }>(
          'window.close',
          ['window.control'],
          2_000,
          false,
          0,
          withMetrics(state, 'window.close', async (input) => {
            await ctx.pal.window.close(input.windowId);
            return { ack: true };
          })
        )
      }
    }
  };

  const pluginService: ServiceRegistration = {
    name: 'plugin',
    actions: {
      install: {
        descriptor: descriptor<{ manifestPath: string }, { pluginId: string }>(
          'plugin.install',
          ['plugin.manage'],
          8_000,
          false,
          0,
          withMetrics(state, 'plugin.install', async (input) => {
            const record = await ctx.runtime.install(input.manifestPath);
            await ctx.kernel.events.emit('plugin.installed', 'plugin-service', { pluginId: record.manifest.id });
            return { pluginId: record.manifest.id };
          })
        )
      },
      enable: {
        descriptor: descriptor<{ pluginId: string }, { ack: true }>(
          'plugin.enable',
          ['plugin.manage'],
          3_000,
          false,
          0,
          withMetrics(state, 'plugin.enable', async (input) => {
            await ctx.runtime.enable(input.pluginId);
            await ctx.kernel.events.emit('plugin.enabled', 'plugin-service', { pluginId: input.pluginId });
            return { ack: true };
          })
        )
      },
      disable: {
        descriptor: descriptor<{ pluginId: string }, { ack: true }>(
          'plugin.disable',
          ['plugin.manage'],
          3_000,
          false,
          0,
          withMetrics(state, 'plugin.disable', async (input) => {
            await ctx.runtime.disable(input.pluginId);
            await ctx.kernel.events.emit('plugin.disabled', 'plugin-service', { pluginId: input.pluginId });
            return { ack: true };
          })
        )
      },
      uninstall: {
        descriptor: descriptor<{ pluginId: string }, { ack: true }>(
          'plugin.uninstall',
          ['plugin.manage'],
          5_000,
          false,
          0,
          withMetrics(state, 'plugin.uninstall', async (input) => {
            await ctx.runtime.uninstall(input.pluginId);
            await ctx.kernel.events.emit('plugin.uninstalled', 'plugin-service', { pluginId: input.pluginId });
            return { ack: true };
          })
        )
      },
      query: {
        descriptor: descriptor<{ type?: string; capability?: string }, { plugins: PluginRecord[] }>(
          'plugin.query',
          ['plugin.manage'],
          3_000,
          true,
          0,
          withMetrics(state, 'plugin.query', async (input) => {
            const records = ctx.runtime.query({
              type: input.type as PluginRecord['type'] | undefined,
              capability: input.capability
            });
            return {
              plugins: records.map((record) => ({
                id: record.manifest.id,
                manifestPath: record.manifestPath,
                installPath: record.installPath,
                enabled: record.enabled,
                type: record.manifest.type,
                capabilities: record.manifest.capabilities ?? [],
                entry: record.manifest.entry,
                installedAt: record.installedAt
              }))
            };
          })
        )
      },
      init: {
        descriptor: descriptor<{ pluginId: string; launchParams?: Record<string, unknown> }, { session: unknown }>(
          'plugin.init',
          ['plugin.manage'],
          3_000,
          false,
          0,
          withMetrics(state, 'plugin.init', async (input) => {
            const session = ctx.runtime.pluginInit(input.pluginId, input.launchParams ?? {});
            await ctx.kernel.events.emit('plugin.init', 'plugin-service', { pluginId: input.pluginId, sessionId: session.sessionId });
            return { session };
          })
        )
      },
      handshakeComplete: {
        descriptor: descriptor<{ sessionId: string; nonce: string }, { session: unknown }>(
          'plugin.handshake.complete',
          ['plugin.manage'],
          3_000,
          false,
          0,
          withMetrics(state, 'plugin.handshake.complete', async (input) => {
            const session = ctx.runtime.completeHandshake(input.sessionId, input.nonce);
            await ctx.kernel.events.emit('plugin.ready', 'plugin-service', { pluginId: session.pluginId, sessionId: session.sessionId });
            return { session };
          })
        )
      }
    }
  };

  const moduleService: ServiceRegistration = {
    name: 'module',
    actions: {
      mount: {
        descriptor: descriptor<{ slot: string; module: Record<string, unknown> }, { ack: true }>(
          'module.mount',
          ['module.manage'],
          3_000,
          false,
          0,
          withMetrics(state, 'module.mount', async (input) => {
            state.modules.set(input.slot, {
              slot: input.slot,
              module: input.module,
              mountedAt: Date.now()
            });
            return { ack: true };
          })
        )
      },
      unmount: {
        descriptor: descriptor<{ slot: string }, { ack: true }>(
          'module.unmount',
          ['module.manage'],
          3_000,
          false,
          0,
          withMetrics(state, 'module.unmount', async (input) => {
            state.modules.delete(input.slot);
            return { ack: true };
          })
        )
      },
      query: {
        descriptor: descriptor<{ slot: string }, { module: ModuleRecord | null }>(
          'module.query',
          ['module.manage'],
          3_000,
          true,
          0,
          withMetrics(state, 'module.query', async (input) => {
            const module = state.modules.get(input.slot) ?? null;
            return { module };
          })
        )
      },
      list: {
        descriptor: descriptor<Record<string, unknown>, { modules: ModuleRecord[] }>(
          'module.list',
          ['module.manage'],
          3_000,
          true,
          0,
          withMetrics(state, 'module.list', async () => {
            return { modules: [...state.modules.values()] };
          })
        )
      }
    }
  };

  const platformService: ServiceRegistration = {
    name: 'platform',
    actions: {
      getInfo: {
        descriptor: descriptor<Record<string, unknown>, { info: unknown }>(
          'platform.getInfo',
          ['platform.read'],
          3_000,
          true,
          0,
          withMetrics(state, 'platform.getInfo', async () => {
            const info = await ctx.pal.platform.getInfo();
            return { info };
          })
        )
      },
      getCapabilities: {
        descriptor: descriptor<Record<string, unknown>, { capabilities: string[] }>(
          'platform.getCapabilities',
          ['platform.read'],
          3_000,
          true,
          0,
          withMetrics(state, 'platform.getCapabilities', async () => {
            const capabilities = await ctx.pal.platform.getCapabilities();
            return { capabilities };
          })
        )
      },
      openExternal: {
        descriptor: descriptor<{ url: string }, { ack: true }>(
          'platform.openExternal',
          ['platform.external'],
          8_000,
          false,
          0,
          withMetrics(state, 'platform.openExternal', async (input) => {
            await ctx.pal.shell.openExternal(input.url);
            return { ack: true };
          })
        )
      },
      dialogOpenFile: {
        descriptor: descriptor<{ options?: Record<string, unknown> }, { filePaths: string[] | null }>(
          'platform.dialogOpenFile',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.dialogOpenFile', async (input) => {
            const filePaths = await ctx.pal.dialog.openFile(input.options);
            return { filePaths };
          })
        )
      },
      dialogSaveFile: {
        descriptor: descriptor<{ options?: Record<string, unknown> }, { filePath: string | null }>(
          'platform.dialogSaveFile',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.dialogSaveFile', async (input) => {
            const filePath = await ctx.pal.dialog.saveFile(input.options);
            return { filePath };
          })
        )
      },
      dialogShowMessage: {
        descriptor: descriptor<{ options: Record<string, unknown> }, { response: number }>(
          'platform.dialogShowMessage',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.dialogShowMessage', async (input) => {
            if (typeof input.options.message !== 'string') {
              throw createError('DIALOG_INVALID_OPTIONS', 'platform.dialogShowMessage requires options.message');
            }
            const response = await ctx.pal.dialog.showMessage({
              title: typeof input.options.title === 'string' ? input.options.title : undefined,
              message: input.options.message,
              detail: typeof input.options.detail === 'string' ? input.options.detail : undefined
            });
            return { response };
          })
        )
      },
      dialogShowConfirm: {
        descriptor: descriptor<{ options: Record<string, unknown> }, { confirmed: boolean }>(
          'platform.dialogShowConfirm',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.dialogShowConfirm', async (input) => {
            if (typeof input.options.message !== 'string') {
              throw createError('DIALOG_INVALID_OPTIONS', 'platform.dialogShowConfirm requires options.message');
            }
            const confirmed = await ctx.pal.dialog.showConfirm({
              title: typeof input.options.title === 'string' ? input.options.title : undefined,
              message: input.options.message,
              detail: typeof input.options.detail === 'string' ? input.options.detail : undefined
            });
            return { confirmed };
          })
        )
      },
      clipboardRead: {
        descriptor: descriptor<{ format?: string }, { data: unknown }>(
          'platform.clipboardRead',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.clipboardRead', async (input) => {
            const format = input.format ?? 'text';
            if (format !== 'text' && format !== 'image' && format !== 'files') {
              throw createError('CLIPBOARD_INVALID_FORMAT', `Unsupported clipboard format: ${input.format}`);
            }
            const data = await ctx.pal.clipboard.read(format);
            state.clipboard = data;
            return { data };
          })
        )
      },
      clipboardWrite: {
        descriptor: descriptor<{ data: unknown; format?: string }, { ack: true }>(
          'platform.clipboardWrite',
          ['platform.read'],
          2_000,
          false,
          0,
          withMetrics(state, 'platform.clipboardWrite', async (input) => {
            const format = input.format ?? 'text';
            if (format === 'text' && typeof input.data !== 'string') {
              throw createError('CLIPBOARD_INVALID_PAYLOAD', 'platform.clipboardWrite requires string data when format=text');
            }
            if (format === 'image') {
              if (
                !input.data ||
                typeof input.data !== 'object' ||
                typeof (input.data as { base64?: unknown }).base64 !== 'string'
              ) {
                throw createError('CLIPBOARD_INVALID_PAYLOAD', 'platform.clipboardWrite requires { base64 } when format=image');
              }
            }
            if (format === 'files') {
              if (!Array.isArray(input.data) || input.data.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
                throw createError('CLIPBOARD_INVALID_PAYLOAD', 'platform.clipboardWrite requires string[] when format=files');
              }
            }
            if (format !== 'text' && format !== 'image' && format !== 'files') {
              throw createError('CLIPBOARD_INVALID_FORMAT', `Unsupported clipboard format: ${input.format}`);
            }
            await ctx.pal.clipboard.write(input.data as never, format);
            state.clipboard = input.data;
            return { ack: true };
          })
        )
      },
      shellOpenPath: {
        descriptor: descriptor<{ path: string }, { ack: true }>(
          'platform.shellOpenPath',
          ['platform.external'],
          5_000,
          false,
          0,
          withMetrics(state, 'platform.shellOpenPath', async (input) => {
            await ctx.pal.shell.openPath(input.path);
            return { ack: true };
          })
        )
      },
      shellOpenExternal: {
        descriptor: descriptor<{ url: string }, { ack: true }>(
          'platform.shellOpenExternal',
          ['platform.external'],
          8_000,
          false,
          0,
          withMetrics(state, 'platform.shellOpenExternal', async (input) => {
            await ctx.pal.shell.openExternal(input.url);
            return { ack: true };
          })
        )
      },
      shellShowItemInFolder: {
        descriptor: descriptor<{ path: string }, { ack: true }>(
          'platform.shellShowItemInFolder',
          ['platform.external'],
          5_000,
          true,
          0,
          withMetrics(state, 'platform.shellShowItemInFolder', async (input) => {
            await ctx.pal.shell.showItemInFolder(input.path);
            return { ack: true };
          })
        )
      },
      notificationShow: {
        descriptor: descriptor<{ options: { title: string; body: string; icon?: string; silent?: boolean } }, { ack: true }>(
          'platform.notificationShow',
          ['platform.read'],
          2_000,
          false,
          0,
          withMetrics(state, 'platform.notificationShow', async (input) => {
            if (typeof input.options.title !== 'string' || typeof input.options.body !== 'string') {
              throw createError('PLATFORM_NOTIFICATION_INVALID', 'platform.notificationShow requires title/body');
            }
            await ctx.pal.notification.show(input.options);
            return { ack: true };
          })
        )
      },
      traySet: {
        descriptor: descriptor<{ options: { icon?: string; tooltip?: string; menu?: Array<{ id: string; label: string }> } }, { tray: unknown }>(
          'platform.traySet',
          ['platform.external'],
          3_000,
          false,
          0,
          withMetrics(state, 'platform.traySet', async (input) => {
            const tray = await ctx.pal.tray.set(input.options ?? {});
            await ctx.kernel.events.emit('platform.tray.changed', 'platform-service', { tray });
            return { tray };
          })
        )
      },
      trayClear: {
        descriptor: descriptor<Record<string, unknown>, { ack: true }>(
          'platform.trayClear',
          ['platform.external'],
          3_000,
          false,
          0,
          withMetrics(state, 'platform.trayClear', async () => {
            await ctx.pal.tray.clear();
            await ctx.kernel.events.emit('platform.tray.changed', 'platform-service', { tray: { active: false } });
            return { ack: true };
          })
        )
      },
      trayGetState: {
        descriptor: descriptor<Record<string, unknown>, { tray: unknown }>(
          'platform.trayGetState',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.trayGetState', async () => {
            const tray = await ctx.pal.tray.getState();
            return { tray };
          })
        )
      },
      shortcutRegister: {
        descriptor: descriptor<{ accelerator: string; eventName?: string }, { registered: boolean }>(
          'platform.shortcutRegister',
          ['platform.external'],
          3_000,
          false,
          0,
          withMetrics(state, 'platform.shortcutRegister', async (input) => {
            if (typeof input.accelerator !== 'string' || input.accelerator.length === 0) {
              throw createError('PLATFORM_SHORTCUT_INVALID', 'platform.shortcutRegister requires accelerator');
            }
            const eventName = typeof input.eventName === 'string' && input.eventName.length > 0
              ? input.eventName
              : 'platform.shortcut.triggered';
            const registered = await ctx.pal.shortcut.register(input.accelerator, () => {
              void ctx.kernel.events.emit(eventName, 'platform-shortcut', { accelerator: input.accelerator });
            });
            if (!registered) {
              throw createError('PLATFORM_SHORTCUT_REGISTER_FAILED', `Cannot register shortcut: ${input.accelerator}`);
            }
            return { registered: true };
          })
        )
      },
      shortcutUnregister: {
        descriptor: descriptor<{ accelerator: string }, { ack: true }>(
          'platform.shortcutUnregister',
          ['platform.external'],
          3_000,
          false,
          0,
          withMetrics(state, 'platform.shortcutUnregister', async (input) => {
            await ctx.pal.shortcut.unregister(input.accelerator);
            return { ack: true };
          })
        )
      },
      shortcutIsRegistered: {
        descriptor: descriptor<{ accelerator: string }, { registered: boolean }>(
          'platform.shortcutIsRegistered',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.shortcutIsRegistered', async (input) => {
            const registered = await ctx.pal.shortcut.isRegistered(input.accelerator);
            return { registered };
          })
        )
      },
      shortcutList: {
        descriptor: descriptor<Record<string, unknown>, { accelerators: string[] }>(
          'platform.shortcutList',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.shortcutList', async () => {
            const accelerators = await ctx.pal.shortcut.list();
            return { accelerators };
          })
        )
      },
      shortcutClear: {
        descriptor: descriptor<Record<string, unknown>, { ack: true }>(
          'platform.shortcutClear',
          ['platform.external'],
          3_000,
          false,
          0,
          withMetrics(state, 'platform.shortcutClear', async () => {
            await ctx.pal.shortcut.clear();
            return { ack: true };
          })
        )
      },
      powerGetState: {
        descriptor: descriptor<Record<string, unknown>, { state: unknown }>(
          'platform.powerGetState',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.powerGetState', async () => {
            const powerState = await ctx.pal.power.getState();
            return { state: powerState };
          })
        )
      },
      powerSetPreventSleep: {
        descriptor: descriptor<{ prevent: boolean }, { preventSleep: boolean }>(
          'platform.powerSetPreventSleep',
          ['platform.external'],
          2_000,
          false,
          0,
          withMetrics(state, 'platform.powerSetPreventSleep', async (input) => {
            const preventSleep = await ctx.pal.power.setPreventSleep(Boolean(input.prevent));
            return { preventSleep };
          })
        )
      },
      ipcCreateChannel: {
        descriptor: descriptor<{ name: string; transport: 'named-pipe' | 'unix-socket' | 'shared-memory'; maxBufferBytes?: number }, { channel: unknown }>(
          'platform.ipcCreateChannel',
          ['platform.external'],
          4_000,
          false,
          0,
          withMetrics(state, 'platform.ipcCreateChannel', async (input, routeContext) => {
            if (typeof input.name !== 'string' || input.name.trim().length === 0) {
              throw createError('PLATFORM_IPC_INVALID_CHANNEL', 'platform.ipcCreateChannel requires channel name');
            }
            if (input.transport !== 'named-pipe' && input.transport !== 'unix-socket' && input.transport !== 'shared-memory') {
              throw createError('PLATFORM_IPC_INVALID_TRANSPORT', `Unsupported IPC transport: ${String(input.transport)}`);
            }
            const channel = await ctx.pal.ipc.createChannel({
              name: input.name,
              transport: input.transport,
              maxBufferBytes: input.maxBufferBytes
            });
            ctx.logger.write({
              level: 'info',
              message: 'Platform IPC channel created',
              requestId: routeContext.requestId,
              pluginId: routeContext.caller.pluginId,
              namespace: 'platform',
              action: 'ipcCreateChannel',
              result: 'success',
              metadata: { channelId: channel.channelId, transport: channel.transport }
            });
            return { channel };
          })
        )
      },
      ipcSend: {
        descriptor: descriptor<{ channelId: string; payload: string; encoding?: 'utf8' | 'base64' }, { ack: true }>(
          'platform.ipcSend',
          ['platform.external'],
          4_000,
          false,
          0,
          withMetrics(state, 'platform.ipcSend', async (input, routeContext) => {
            if (typeof input.channelId !== 'string' || input.channelId.length === 0) {
              throw createError('PLATFORM_IPC_INVALID_CHANNEL', 'platform.ipcSend requires channelId');
            }
            if (typeof input.payload !== 'string') {
              throw createError('PLATFORM_IPC_INVALID_PAYLOAD', 'platform.ipcSend requires string payload');
            }
            const encoding = input.encoding === 'base64' ? 'base64' : 'utf8';
            const payload = encoding === 'base64' ? Buffer.from(input.payload, 'base64') : input.payload;
            await ctx.pal.ipc.send(input.channelId, payload);
            ctx.logger.write({
              level: 'info',
              message: 'Platform IPC payload sent',
              requestId: routeContext.requestId,
              pluginId: routeContext.caller.pluginId,
              namespace: 'platform',
              action: 'ipcSend',
              result: 'success',
              metadata: { channelId: input.channelId, bytes: Buffer.isBuffer(payload) ? payload.length : Buffer.byteLength(payload) }
            });
            return { ack: true };
          })
        )
      },
      ipcReceive: {
        descriptor: descriptor<{ channelId: string; timeoutMs?: number }, { message: unknown }>(
          'platform.ipcReceive',
          ['platform.read'],
          35_000,
          true,
          0,
          withMetrics(state, 'platform.ipcReceive', async (input) => {
            if (typeof input.channelId !== 'string' || input.channelId.length === 0) {
              throw createError('PLATFORM_IPC_INVALID_CHANNEL', 'platform.ipcReceive requires channelId');
            }
            const response = await ctx.pal.ipc.receive(input.channelId, {
              timeoutMs: input.timeoutMs
            });
            return {
              message: {
                channelId: response.channelId,
                transport: response.transport,
                payload: response.payload.toString('base64'),
                encoding: 'base64',
                receivedAt: response.receivedAt
              }
            };
          })
        )
      },
      ipcCloseChannel: {
        descriptor: descriptor<{ channelId: string }, { ack: true }>(
          'platform.ipcCloseChannel',
          ['platform.external'],
          4_000,
          false,
          0,
          withMetrics(state, 'platform.ipcCloseChannel', async (input, routeContext) => {
            if (typeof input.channelId !== 'string' || input.channelId.length === 0) {
              throw createError('PLATFORM_IPC_INVALID_CHANNEL', 'platform.ipcCloseChannel requires channelId');
            }
            await ctx.pal.ipc.closeChannel(input.channelId);
            ctx.logger.write({
              level: 'info',
              message: 'Platform IPC channel closed',
              requestId: routeContext.requestId,
              pluginId: routeContext.caller.pluginId,
              namespace: 'platform',
              action: 'ipcCloseChannel',
              result: 'success',
              metadata: { channelId: input.channelId }
            });
            return { ack: true };
          })
        )
      },
      ipcListChannels: {
        descriptor: descriptor<Record<string, unknown>, { channels: unknown[] }>(
          'platform.ipcListChannels',
          ['platform.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'platform.ipcListChannels', async () => {
            const channels = await ctx.pal.ipc.listChannels();
            return { channels };
          })
        )
      }
    }
  };

  const logService: ServiceRegistration = {
    name: 'log',
    actions: {
      write: {
        descriptor: descriptor<{ level: 'debug' | 'info' | 'warn' | 'error'; message: string; metadata?: Record<string, unknown> }, { entry: LogEntry }>(
          'log.write',
          ['log.write'],
          2_000,
          false,
          0,
          withMetrics(state, 'log.write', async (input, routeContext) => {
            const entry = ctx.logger.write({
              level: input.level,
              message: input.message,
              metadata: input.metadata,
              requestId: routeContext.requestId,
              pluginId: routeContext.caller.pluginId,
              namespace: 'log',
              action: 'write',
              result: 'success'
            });
            return { entry };
          })
        )
      },
      query: {
        descriptor: descriptor<{ level?: 'debug' | 'info' | 'warn' | 'error'; requestId?: string }, { entries: LogEntry[] }>(
          'log.query',
          ['log.read'],
          3_000,
          true,
          0,
          withMetrics(state, 'log.query', async (input) => {
            const entries = ctx.logger.query({
              level: input.level,
              requestId: input.requestId
            });
            return { entries: toPlainLogEntries(entries) };
          })
        )
      },
      export: {
        descriptor: descriptor<Record<string, unknown>, { payload: string }>(
          'log.export',
          ['log.read'],
          3_000,
          true,
          0,
          withMetrics(state, 'log.export', async () => {
            return { payload: ctx.logger.export() };
          })
        )
      }
    }
  };

  const credentialService: ServiceRegistration = {
    name: 'credential',
    actions: {
      get: {
        descriptor: descriptor<{ ref: string }, { value: string | null }>(
          'credential.get',
          ['credential.manage'],
          2_000,
          true,
          0,
          withMetrics(state, 'credential.get', async (input, routeContext) => {
            ctx.logger.write({
              level: 'info',
              message: 'Credential accessed',
              requestId: routeContext.requestId,
              pluginId: routeContext.caller.pluginId,
              namespace: 'credential',
              action: 'get',
              result: 'success'
            });
            return { value: state.credentials.get(input.ref) ?? null };
          })
        )
      },
      set: {
        descriptor: descriptor<{ ref: string; value: string }, { ack: true }>(
          'credential.set',
          ['credential.manage'],
          2_000,
          false,
          0,
          withMetrics(state, 'credential.set', async (input, routeContext) => {
            state.credentials.set(input.ref, input.value);
            ctx.logger.write({
              level: 'warn',
              message: 'Credential updated',
              requestId: routeContext.requestId,
              pluginId: routeContext.caller.pluginId,
              namespace: 'credential',
              action: 'set',
              result: 'success'
            });
            return { ack: true };
          })
        )
      },
      delete: {
        descriptor: descriptor<{ ref: string }, { ack: true }>(
          'credential.delete',
          ['credential.manage'],
          2_000,
          false,
          0,
          withMetrics(state, 'credential.delete', async (input, routeContext) => {
            state.credentials.delete(input.ref);
            ctx.logger.write({
              level: 'warn',
              message: 'Credential deleted',
              requestId: routeContext.requestId,
              pluginId: routeContext.caller.pluginId,
              namespace: 'credential',
              action: 'delete',
              result: 'success'
            });
            return { ack: true };
          })
        )
      },
      rotate: {
        descriptor: descriptor<{ ref: string }, { value: string }>(
          'credential.rotate',
          ['credential.manage'],
          2_000,
          false,
          0,
          withMetrics(state, 'credential.rotate', async (input, routeContext) => {
            const next = createId();
            state.credentials.set(input.ref, next);
            ctx.logger.write({
              level: 'warn',
              message: 'Credential rotated',
              requestId: routeContext.requestId,
              pluginId: routeContext.caller.pluginId,
              namespace: 'credential',
              action: 'rotate',
              result: 'success'
            });
            return { value: next };
          })
        )
      }
    }
  };

  const cardService: ServiceRegistration = {
    name: 'card',
    actions: {
      parse: {
        descriptor: descriptor<{ cardFile: string }, { ast: unknown }>(
          'card.parse',
          ['card.read'],
          10_000,
          true,
          0,
          withMetrics(state, 'card.parse', async (input) => {
            const ast = await ctx.getCardService().parse(input.cardFile);
            return { ast };
          })
        )
      },
      render: {
        descriptor: descriptor<{ cardFile: string }, { view: unknown }>(
          'card.render',
          ['card.read'],
          10_000,
          false,
          0,
          withMetrics(state, 'card.render', async (input) => {
            const view = await ctx.getCardService().render(input.cardFile);
            return { view };
          })
        )
      },
      validate: {
        descriptor: descriptor<{ cardFile: string }, { valid: boolean; errors: string[] }>(
          'card.validate',
          ['card.read'],
          10_000,
          true,
          0,
          withMetrics(state, 'card.validate', async (input) => {
            const result = await ctx.getCardService().validate(input.cardFile);
            return result;
          })
        )
      }
    }
  };

  const boxService: ServiceRegistration = {
    name: 'box',
    actions: {
      pack: {
        descriptor: descriptor<{ boxDir: string; outputPath: string }, { boxFile: string }>(
          'box.pack',
          ['box.pack'],
          12_000,
          false,
          0,
          withMetrics(state, 'box.pack', async (input) => {
            const boxFile = await ctx.getBoxService().pack(input.boxDir, input.outputPath);
            return { boxFile };
          })
        )
      },
      unpack: {
        descriptor: descriptor<{ boxFile: string; outputDir: string }, { outputDir: string }>(
          'box.unpack',
          ['box.pack'],
          12_000,
          false,
          0,
          withMetrics(state, 'box.unpack', async (input) => {
            const outputDir = await ctx.getBoxService().unpack(input.boxFile, input.outputDir);
            return { outputDir };
          })
        )
      },
      inspect: {
        descriptor: descriptor<{ boxFile: string }, { inspection: unknown }>(
          'box.inspect',
          ['box.read'],
          8_000,
          true,
          0,
          withMetrics(state, 'box.inspect', async (input) => {
            const inspection = await ctx.getBoxService().inspect(input.boxFile);
            return { inspection };
          })
        )
      }
    }
  };

  const zipService: ServiceRegistration = {
    name: 'zip',
    actions: {
      compress: {
        descriptor: descriptor<{ inputDir: string; outputZip: string }, { outputZip: string }>(
          'zip.compress',
          ['zip.manage'],
          12_000,
          false,
          0,
          withMetrics(state, 'zip.compress', async (input) => {
            await ctx.getZipService().compress(input.inputDir, input.outputZip);
            return { outputZip: input.outputZip };
          })
        )
      },
      extract: {
        descriptor: descriptor<{ zipPath: string; outputDir: string }, { outputDir: string }>(
          'zip.extract',
          ['zip.manage'],
          12_000,
          false,
          0,
          withMetrics(state, 'zip.extract', async (input) => {
            await ctx.getZipService().extract(input.zipPath, input.outputDir);
            return { outputDir: input.outputDir };
          })
        )
      },
      list: {
        descriptor: descriptor<{ zipPath: string }, { entries: unknown }>(
          'zip.list',
          ['zip.manage'],
          5_000,
          true,
          0,
          withMetrics(state, 'zip.list', async (input) => {
            const entries = await ctx.getZipService().list(input.zipPath);
            return { entries };
          })
        )
      }
    }
  };

  const serializerService: ServiceRegistration = {
    name: 'serializer',
    actions: {
      encode: {
        descriptor: descriptor<{ payload: unknown }, { payload: string }>(
          'serializer.encode',
          ['serializer.use'],
          2_000,
          true,
          0,
          withMetrics(state, 'serializer.encode', async (input) => {
            return { payload: Buffer.from(JSON.stringify(input.payload)).toString('base64') };
          })
        )
      },
      decode: {
        descriptor: descriptor<{ payload: string }, { payload: unknown }>(
          'serializer.decode',
          ['serializer.use'],
          2_000,
          true,
          0,
          withMetrics(state, 'serializer.decode', async (input) => {
            const raw = Buffer.from(input.payload, 'base64').toString('utf-8');
            return { payload: JSON.parse(raw) };
          })
        )
      },
      validate: {
        descriptor: descriptor<{ payload: unknown; schema: string }, { valid: boolean }>(
          'serializer.validate',
          ['serializer.use'],
          2_000,
          true,
          0,
          withMetrics(state, 'serializer.validate', async (input) => {
            return { valid: typeof input.schema === 'string' && input.schema.length > 0 };
          })
        )
      }
    }
  };

  const controlPlaneService: ServiceRegistration = {
    name: 'control-plane',
    actions: {
      health: {
        descriptor: descriptor<Record<string, unknown>, { status: 'ok'; report: unknown }>(
          'control-plane.health',
          ['control.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'control-plane.health', async () => {
            return {
              status: 'ok',
              report: ctx.kernel.getHealthReport()
            };
          })
        )
      },
      check: {
        descriptor: descriptor<Record<string, unknown>, { services: unknown }>(
          'control-plane.check',
          ['control.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'control-plane.check', async () => {
            return { services: ctx.kernel.registry.list() };
          })
        )
      },
      metrics: {
        descriptor: descriptor<Record<string, unknown>, { metrics: Record<string, { count: number; failures: number; p50: number; p95: number }> }>(
          'control-plane.metrics',
          ['control.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'control-plane.metrics', async () => {
            return {
              metrics: Object.fromEntries(
                [...state.routeMetrics.entries()].map(([route, metric]) => [
                  route,
                  {
                    count: metric.count,
                    failures: metric.failures,
                    p50: percentile(metric.latencies, 50),
                    p95: percentile(metric.latencies, 95)
                  }
                ])
              )
            };
          })
        )
      },
      diagnose: {
        descriptor: descriptor<Record<string, unknown>, { diagnose: unknown }>(
          'control-plane.diagnose',
          ['control.write'],
          3_000,
          true,
          0,
          withMetrics(state, 'control-plane.diagnose', async () => {
            return {
              diagnose: {
                routeCount: ctx.kernel.getRouteManifest().length,
                serviceCount: ctx.kernel.registry.list().length,
                runtimeSnapshot: ctx.runtime.snapshot(),
                topFailureRoutes: [...state.routeMetrics.entries()]
                  .sort((a, b) => b[1].failures - a[1].failures)
                  .slice(0, 5)
              }
            };
          })
        )
      }
    }
  };

  const rawServices = [
    fileService,
    resourceService,
    configService,
    themeService,
    i18nService,
    windowService,
    pluginService,
    moduleService,
    platformService,
    logService,
    credentialService,
    cardService,
    boxService,
    zipService,
    serializerService,
    controlPlaneService
  ];

  return rawServices.map((service) => bindLazyActivation(ctx, state, service));
};

export const registerHostServices = async (ctx: HostServiceContext): Promise<void> => {
  await ensureWorkspace(ctx.workspacePath);

  const runtimeState = buildState();
  await loadConfig(ctx.workspacePath, runtimeState);

  const services = createServices(ctx, runtimeState);
  for (const service of services) {
    ctx.kernel.registerService(service);
  }
};

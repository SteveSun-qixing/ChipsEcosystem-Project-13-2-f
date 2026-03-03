import fs from 'node:fs/promises';
import path from 'node:path';
import { createError } from '../../shared/errors';
import { createId, deepClone } from '../../shared/utils';
import type { LogEntry, RouteDescriptor, RouteInvocationContext, ServiceRegistration } from '../../shared/types';
import { StructuredLogger } from '../../shared/logger';
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
  cardService: CardService;
  boxService: BoxService;
  zipService: StoreZipService;
}

interface PluginRecord {
  id: string;
  manifestPath: string;
  enabled: boolean;
  type: 'app' | 'card' | 'layout' | 'module' | 'theme';
  capabilities: string[];
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

interface RuntimeState {
  config: Map<string, unknown>;
  plugins: Map<string, PluginRecord>;
  modules: Map<string, ModuleRecord>;
  credentials: Map<string, string>;
  themes: ThemeRecord[];
  currentThemeId: string;
  locale: string;
  locales: Record<string, Record<string, string>>;
  routeMetrics: Map<string, { count: number; failures: number }>;
}

const ensureWorkspace = async (workspacePath: string): Promise<void> => {
  await fs.mkdir(workspacePath, { recursive: true });
};

const updateMetric = (state: RuntimeState, route: string, failed: boolean): void => {
  const current = state.routeMetrics.get(route) ?? { count: 0, failures: 0 };
  current.count += 1;
  if (failed) {
    current.failures += 1;
  }
  state.routeMetrics.set(route, current);
};

const withMetrics = <I, O>(
  state: RuntimeState,
  route: string,
  handler: (input: I, ctx: RouteInvocationContext) => Promise<O>
): ((input: I, ctx: RouteInvocationContext) => Promise<O>) => {
  return async (input, ctx) => {
    try {
      const result = await handler(input, ctx);
      updateMetric(state, route, false);
      return result;
    } catch (error) {
      updateMetric(state, route, true);
      throw error;
    }
  };
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
  plugins: new Map<string, PluginRecord>(),
  modules: new Map<string, ModuleRecord>(),
  credentials: new Map<string, string>(),
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
  routeMetrics: new Map<string, { count: number; failures: number }>()
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
        descriptor: descriptor<{ config: { title: string; width: number; height: number } }, { window: unknown }>(
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
            const id = `plugin.${createId()}`;
            const record: PluginRecord = {
              id,
              manifestPath: input.manifestPath,
              enabled: false,
              type: 'app',
              capabilities: [],
              installedAt: Date.now()
            };
            state.plugins.set(id, record);
            await ctx.kernel.events.emit('plugin.installed', 'plugin-service', { pluginId: id });
            return { pluginId: id };
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
            const plugin = state.plugins.get(input.pluginId);
            if (!plugin) {
              throw createError('PLUGIN_NOT_FOUND', `Plugin not found: ${input.pluginId}`);
            }
            plugin.enabled = true;
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
            const plugin = state.plugins.get(input.pluginId);
            if (!plugin) {
              throw createError('PLUGIN_NOT_FOUND', `Plugin not found: ${input.pluginId}`);
            }
            plugin.enabled = false;
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
            if (!state.plugins.has(input.pluginId)) {
              throw createError('PLUGIN_NOT_FOUND', `Plugin not found: ${input.pluginId}`);
            }
            state.plugins.delete(input.pluginId);
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
            let records = [...state.plugins.values()];
            if (input.type) {
              records = records.filter((plugin) => plugin.type === input.type);
            }
            if (input.capability) {
              records = records.filter((plugin) => plugin.capabilities.includes(input.capability!));
            }
            return { plugins: records };
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
            await ctx.pal.platform.openExternal(input.url);
            return { ack: true };
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
            const ast = await ctx.cardService.parse(input.cardFile);
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
            const view = await ctx.cardService.render(input.cardFile);
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
            const result = await ctx.cardService.validate(input.cardFile);
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
            const boxFile = await ctx.boxService.pack(input.boxDir, input.outputPath);
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
            const outputDir = await ctx.boxService.unpack(input.boxFile, input.outputDir);
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
            const inspection = await ctx.boxService.inspect(input.boxFile);
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
            await ctx.zipService.compress(input.inputDir, input.outputZip);
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
            await ctx.zipService.extract(input.zipPath, input.outputDir);
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
            const entries = await ctx.zipService.list(input.zipPath);
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
        descriptor: descriptor<Record<string, unknown>, { metrics: Record<string, { count: number; failures: number }> }>(
          'control-plane.metrics',
          ['control.read'],
          2_000,
          true,
          0,
          withMetrics(state, 'control-plane.metrics', async () => {
            return {
              metrics: Object.fromEntries(state.routeMetrics.entries())
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

  return [
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

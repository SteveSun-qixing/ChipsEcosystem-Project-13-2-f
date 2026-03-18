import { afterEach, describe, expect, it } from 'vitest';
import { Kernel } from '../../packages/kernel/src';
import { createBridgeForKernel } from '../../src/preload/create-bridge';
import { objectWithKeys, schemaRegistry } from '../../src/shared/schema';
import { createError } from '../../src/shared/errors';
import {
  bindKernelToElectronIpc,
  CHIPS_EMIT_CHANNEL,
  CHIPS_EVENT_CHANNEL_PREFIX,
  CHIPS_INVOKE_CHANNEL,
  CHIPS_PLATFORM_CHANNEL_PREFIX
} from '../../src/main/ipc/chips-ipc';

type IpcListener = (event: unknown, payload: unknown) => void;
type IpcInvokeHandler = (event: unknown, payload: unknown) => Promise<unknown> | unknown;

const MOCK_KEY = '__chipsElectronMock';

const createElectronMock = () => {
  const invokeHandlers = new Map<string, IpcInvokeHandler>();
  const mainListeners = new Map<string, Set<IpcListener>>();
  const rendererListeners = new Map<string, Set<IpcListener>>();

  const rendererOn = (channel: string, listener: IpcListener): void => {
    const group = rendererListeners.get(channel) ?? new Set<IpcListener>();
    group.add(listener);
    rendererListeners.set(channel, group);
  };

  const emitToRenderer = (channel: string, payload: unknown): void => {
    const listeners = rendererListeners.get(channel);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener({}, payload);
    }
  };

  return {
    invokeHandlers,
    mainListeners,
    rendererListeners,
    module: {
      ipcMain: {
        handle: (channel: string, handler: IpcInvokeHandler) => {
          invokeHandlers.set(channel, handler);
        },
        removeHandler: (channel: string) => {
          invokeHandlers.delete(channel);
        },
        on: (channel: string, listener: IpcListener) => {
          const group = mainListeners.get(channel) ?? new Set<IpcListener>();
          group.add(listener);
          mainListeners.set(channel, group);
        },
        off: (channel: string, listener: IpcListener) => {
          const group = mainListeners.get(channel);
          group?.delete(listener);
        }
      },
      ipcRenderer: {
        invoke: async (channel: string, payload: unknown) => {
          const handler = invokeHandlers.get(channel);
          if (!handler) {
            throw new Error(`No handler for channel ${channel}`);
          }
          return handler({ sender: { id: 7 } }, payload);
        },
        send: (channel: string, payload: unknown) => {
          const listeners = mainListeners.get(channel);
          if (!listeners) {
            return;
          }
          for (const listener of listeners) {
            listener({ sender: { id: 7 } }, payload);
          }
        },
        on: rendererOn,
        once: (channel: string, listener: IpcListener) => {
          const wrapped: IpcListener = (event, payload) => {
            listener(event, payload);
            const group = rendererListeners.get(channel);
            group?.delete(wrapped);
          };
          rendererOn(channel, wrapped);
        },
        removeListener: (channel: string, listener: IpcListener) => {
          const group = rendererListeners.get(channel);
          group?.delete(listener);
        }
      },
      BrowserWindow: {
        getAllWindows: () => [
          {
            isDestroyed: () => false,
            webContents: {
              send: (channel: string, payload: unknown) => {
                emitToRenderer(channel, payload);
              }
            }
          }
        ]
      }
    }
  };
};

afterEach(() => {
  const target = globalThis as Record<string, unknown>;
  delete target[MOCK_KEY];
});

describe('chips ipc bridge', () => {
  it('uses chips:invoke and chips:event channels when electron ipc is available', async () => {
    const electronMock = createElectronMock();
    (globalThis as Record<string, unknown>)[MOCK_KEY] = electronMock.module;

    const kernel = new Kernel();
    schemaRegistry.register('schemas/demo.echo.request.json', objectWithKeys(['value']));
    schemaRegistry.register('schemas/demo.echo.response.json', objectWithKeys(['value']));
    schemaRegistry.register('schemas/platform.getInfo.request.json', objectWithKeys([]));
    schemaRegistry.register('schemas/platform.getInfo.response.json', objectWithKeys(['info']));
    kernel.registerRoute({
      key: 'demo.echo',
      schemaIn: 'schemas/demo.echo.request.json',
      schemaOut: 'schemas/demo.echo.response.json',
      permission: ['demo.read'],
      timeoutMs: 1000,
      idempotent: true,
      retries: 0,
      handler: async (input: { value: string }) => ({ value: input.value })
    });
    kernel.registerRoute({
      key: 'platform.getInfo',
      schemaIn: 'schemas/platform.getInfo.request.json',
      schemaOut: 'schemas/platform.getInfo.response.json',
      permission: ['platform.read'],
      timeoutMs: 1000,
      idempotent: true,
      retries: 0,
      handler: async () => ({ info: { platform: 'test' } })
    });

    const binding = bindKernelToElectronIpc(kernel);
    expect(binding.active).toBe(true);

    const bridge = createBridgeForKernel(kernel, {
      permissions: ['demo.read', 'platform.read'],
      callerId: 'renderer-test',
      pluginId: 'chips.test.plugin'
    });

    const echoed = await bridge.invoke<{ value: string }>('demo.echo', { value: 'ok' });
    expect(echoed.value).toBe('ok');
    expect(electronMock.invokeHandlers.has(CHIPS_INVOKE_CHANNEL)).toBe(true);
    await bridge.platform.getInfo();
    expect(electronMock.invokeHandlers.has(`${CHIPS_PLATFORM_CHANNEL_PREFIX}getInfo`)).toBe(true);

    const fromKernel: unknown[] = [];
    const off = bridge.on('demo.updated', (payload) => {
      fromKernel.push(payload);
    });
    await kernel.events.emit('demo.updated', 'kernel-test', { ok: true });
    expect(fromKernel).toEqual([{ ok: true }]);
    off();

    const fromRenderer = new Promise<unknown>((resolve) => {
      const unsubscribe = kernel.events.on('demo.renderer', (payload) => {
        unsubscribe();
        resolve(payload.data);
      });
    });
    bridge.emit('demo.renderer', { source: 'renderer' });
    await expect(fromRenderer).resolves.toEqual({ source: 'renderer' });
    expect(electronMock.mainListeners.has(CHIPS_EMIT_CHANNEL)).toBe(true);
    expect(electronMock.rendererListeners.has(`${CHIPS_EVENT_CHANNEL_PREFIX}demo.updated`)).toBe(true);

    binding.dispose();
  });

  it('enforces plugin message-rate quota when quota provider is supplied', async () => {
    const electronMock = createElectronMock();
    (globalThis as Record<string, unknown>)[MOCK_KEY] = electronMock.module;

    const kernel = new Kernel();
    schemaRegistry.register('schemas/demo.echo.request.json', objectWithKeys(['value']));
    schemaRegistry.register('schemas/demo.echo.response.json', objectWithKeys(['value']));

    kernel.registerRoute({
      key: 'demo.echo',
      schemaIn: 'schemas/demo.echo.request.json',
      schemaOut: 'schemas/demo.echo.response.json',
      permission: ['demo.read'],
      timeoutMs: 1_000,
      idempotent: true,
      retries: 0,
      handler: async (input: { value: string }) => ({ value: input.value })
    });

    const binding = bindKernelToElectronIpc(kernel, {
      getPluginQuota: (pluginId) => {
        if (pluginId === 'chips.quota.plugin') {
          return { messageRateBudget: 2 };
        }
        return { messageRateBudget: 1_000 };
      }
    });
    expect(binding.active).toBe(true);

    const bridge = createBridgeForKernel(kernel, {
      permissions: ['demo.read'],
      callerId: 'renderer-quota',
      pluginId: 'chips.quota.plugin'
    });

    await bridge.invoke('demo.echo', { value: 'a' });
    await bridge.invoke('demo.echo', { value: 'b' });
    await expect(bridge.invoke('demo.echo', { value: 'c' })).rejects.toMatchObject({
      code: 'PLUGIN_QUOTA_EXCEEDED'
    });

    binding.dispose();
  });

  it('resolves scoped bridge context before permission checks', async () => {
    const electronMock = createElectronMock();
    (globalThis as Record<string, unknown>)[MOCK_KEY] = electronMock.module;

    const kernel = new Kernel();
    schemaRegistry.register('schemas/demo.secure.request.json', objectWithKeys([]));
    schemaRegistry.register('schemas/demo.secure.response.json', objectWithKeys(['ok']));

    kernel.registerRoute({
      key: 'demo.secure',
      schemaIn: 'schemas/demo.secure.request.json',
      schemaOut: 'schemas/demo.secure.response.json',
      permission: ['theme.read'],
      timeoutMs: 1_000,
      idempotent: true,
      retries: 0,
      handler: async () => ({ ok: true })
    });

    const binding = bindKernelToElectronIpc(kernel, {
      resolveScopedBridgeContext: (token) => {
        if (token === 'module-scope-token') {
          return {
            callerId: 'plugin-session:module-1',
            pluginId: 'chips.module.preview',
            permissions: ['theme.read']
          };
        }
        return null;
      }
    });
    expect(binding.active).toBe(true);

    const bridge = createBridgeForKernel(kernel, {
      permissions: ['module.invoke'],
      callerId: 'renderer-module-host',
      pluginId: 'chips.host.viewer'
    }) as ReturnType<typeof createBridgeForKernel> & {
      invokeScoped(action: string, payload: unknown, scope: { token: string }): Promise<{ ok: boolean }>;
    };

    await expect(bridge.invokeScoped('demo.secure', {}, { token: 'module-scope-token' })).resolves.toEqual({ ok: true });
    await expect(bridge.invokeScoped('demo.secure', {}, { token: 'expired-token' })).rejects.toMatchObject({
      code: 'BRIDGE_SCOPE_INVALID'
    });

    binding.dispose();
  });

  it('decodes structured errors thrown through Electron invoke handlers', async () => {
    const electronMock = createElectronMock();
    const originalInvoke = electronMock.module.ipcRenderer!.invoke;
    electronMock.module.ipcRenderer!.invoke = async (channel: string, payload: unknown) => {
      try {
        return await originalInvoke(channel, payload);
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Error invoking remote method '${channel}': ${String(error)}`);
      }
    };

    (globalThis as Record<string, unknown>)[MOCK_KEY] = electronMock.module;

    const kernel = new Kernel();
    schemaRegistry.register('schemas/demo.fail.request.json', objectWithKeys([]));
    schemaRegistry.register('schemas/demo.fail.response.json', objectWithKeys([]));
    kernel.registerRoute({
      key: 'demo.fail',
      schemaIn: 'schemas/demo.fail.request.json',
      schemaOut: 'schemas/demo.fail.response.json',
      permission: ['demo.read'],
      timeoutMs: 1_000,
      idempotent: true,
      retries: 0,
      handler: async () => {
        throw createError('DEMO_FAIL', 'Demo failure from kernel');
      }
    });

    const binding = bindKernelToElectronIpc(kernel);
    const bridge = createBridgeForKernel(kernel, {
      permissions: ['demo.read'],
      callerId: 'renderer-error',
      pluginId: 'chips.error.plugin'
    });

    await expect(bridge.invoke('demo.fail', {})).rejects.toMatchObject({
      code: 'DEMO_FAIL',
      message: 'Demo failure from kernel'
    });

    binding.dispose();
  });
});

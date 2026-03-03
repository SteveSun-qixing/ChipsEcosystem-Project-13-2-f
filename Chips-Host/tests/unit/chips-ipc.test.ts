import { afterEach, describe, expect, it } from 'vitest';
import { Kernel } from '../../packages/kernel/src';
import { createBridgeForKernel } from '../../src/preload/create-bridge';
import { objectWithKeys, schemaRegistry } from '../../src/shared/schema';
import { bindKernelToElectronIpc, CHIPS_EMIT_CHANNEL, CHIPS_EVENT_CHANNEL_PREFIX, CHIPS_INVOKE_CHANNEL } from '../../src/main/ipc/chips-ipc';

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

    const binding = bindKernelToElectronIpc(kernel);
    expect(binding.active).toBe(true);

    const bridge = createBridgeForKernel(kernel, {
      permissions: ['demo.read'],
      callerId: 'renderer-test',
      pluginId: 'chips.test.plugin'
    });

    const echoed = await bridge.invoke<{ value: string }>('demo.echo', { value: 'ok' });
    expect(echoed.value).toBe('ok');
    expect(electronMock.invokeHandlers.has(CHIPS_INVOKE_CHANNEL)).toBe(true);

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
});

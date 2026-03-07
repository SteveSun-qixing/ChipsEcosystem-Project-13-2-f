import { afterEach, describe, expect, it, vi } from 'vitest';
import { Kernel } from '../../packages/kernel/src';
import { objectWithKeys, schemaRegistry } from '../../src/shared/schema';
import {
  createAndExposeBridgeForKernel,
  createBridgeForKernel,
  exposeBridgeToMainWorld
} from '../../src/preload/create-bridge';
import { CHIPS_INVOKE_CHANNEL, CHIPS_PLATFORM_CHANNEL_PREFIX } from '../../src/main/ipc/chips-ipc';

const MOCK_KEY = '__chipsElectronMock';

afterEach(() => {
  const target = globalThis as Record<string, unknown>;
  delete target[MOCK_KEY];
  delete target.chips;
});

describe('preload contextBridge exposure', () => {
  it('exposes bridge API via contextBridge', async () => {
    const exposeInMainWorld = vi.fn();
    (globalThis as Record<string, unknown>)[MOCK_KEY] = {
      contextBridge: {
        exposeInMainWorld
      }
    };

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

    const bridge = createBridgeForKernel(kernel, {
      callerId: 'preload-test',
      permissions: ['demo.read']
    });
    exposeBridgeToMainWorld(bridge);

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(exposeInMainWorld).toHaveBeenCalledWith(
      'chips',
      expect.objectContaining({
        invoke: expect.any(Function),
        window: expect.any(Object),
        ipc: expect.any(Object)
      })
    );

    const result = await bridge.invoke<{ value: string }>('demo.echo', { value: 'ok' });
    expect(result.value).toBe('ok');
  });

  it('creates and exposes bridge with ipcRenderer only runtime', async () => {
    const exposeInMainWorld = vi.fn();
    const invoke = vi.fn().mockResolvedValue({ ok: true });

    (globalThis as Record<string, unknown>)[MOCK_KEY] = {
      contextBridge: {
        exposeInMainWorld
      },
      ipcRenderer: {
        invoke,
        send: vi.fn(),
        on: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn()
      }
    };

    const bridge = createAndExposeBridgeForKernel(null, {
      callerId: 'preload-runtime',
      permissions: ['platform.read']
    });
    const response = await bridge.invoke('platform.getInfo', {});

    expect(response).toEqual({ ok: true });
    expect(invoke).toHaveBeenCalledWith(
      `${CHIPS_PLATFORM_CHANNEL_PREFIX}getInfo`,
      expect.objectContaining({
        payload: {}
      })
    );
    expect(exposeInMainWorld).toHaveBeenCalledWith(
      'chips',
      expect.objectContaining({
        invoke: expect.any(Function),
        platform: expect.any(Object),
        ipc: expect.any(Object)
      })
    );
  });
});

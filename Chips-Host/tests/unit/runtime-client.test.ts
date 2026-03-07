import { describe, expect, it } from 'vitest';
import { RuntimeClient } from '../../src/renderer/runtime-client';
import type { ChipsBridge } from '../../packages/bridge-api/src';

const createBridge = (handler: (action: string, payload: unknown) => Promise<unknown>): ChipsBridge => ({
  invoke: (action, payload) => handler(action, payload) as Promise<any>,
  on: () => () => undefined,
  once: () => undefined,
  emit: () => undefined,
  window: {
    open: async () => ({}),
    focus: async () => undefined,
    resize: async () => undefined,
    setState: async () => undefined,
    getState: async () => ({}),
    close: async () => undefined
  },
  dialog: {
    openFile: async () => ({}),
    saveFile: async () => ({}),
    showMessage: async () => ({}),
    showConfirm: async () => true
  },
  plugin: {
    install: async () => ({}),
    enable: async () => undefined,
    disable: async () => undefined,
    uninstall: async () => undefined,
    query: async () => ({})
  },
  clipboard: {
    read: async () => ({}),
    write: async () => undefined
  },
  shell: {
    openPath: async () => undefined,
    openExternal: async () => undefined,
    showItemInFolder: async () => undefined
  },
  platform: {
    getInfo: async () => ({}),
    getCapabilities: async () => [],
    getScreenInfo: async () => ({}),
    listScreens: async () => [],
    openExternal: async () => undefined,
    powerGetState: async () => ({}),
    powerSetPreventSleep: async () => false
  },
  notification: {
    show: async () => undefined
  },
  tray: {
    set: async () => ({}),
    clear: async () => undefined,
    getState: async () => ({})
  },
  shortcut: {
    register: async () => undefined,
    unregister: async () => undefined,
    isRegistered: async () => false,
    list: async () => [],
    clear: async () => undefined
  },
  ipc: {
    createChannel: async () => ({}),
    send: async () => undefined,
    receive: async () => ({}),
    closeChannel: async () => undefined,
    listChannels: async () => []
  }
});

describe('RuntimeClient', () => {
  it('maps legacy actions and invokes bridge', async () => {
    let actionName = '';
    const runtime = new RuntimeClient(
      createBridge(async (action) => {
        actionName = action;
        return 'ok';
      })
    );

    const result = await runtime.invoke('theme.getCSS', {});
    expect(result).toBe('ok');
    expect(actionName).toBe('theme.getAllCss');
  });

  it('maps legacy platform-related aliases', async () => {
    let actionName = '';
    const runtime = new RuntimeClient(
      createBridge(async (action) => {
        actionName = action;
        return { ok: true };
      })
    );

    await runtime.invoke('dialog.openFile', {});
    expect(actionName).toBe('platform.dialogOpenFile');
  });

  it('retries retryable errors', async () => {
    let attempts = 0;
    const runtime = new RuntimeClient(
      createBridge(async () => {
        attempts += 1;
        if (attempts < 3) {
          throw { code: 'SERVICE_UNAVAILABLE', message: 'retry', retryable: true };
        }
        return { ok: true };
      }),
      {
        defaultTimeout: 1000,
        maxRetries: 3,
        retryDelay: 1,
        retryBackoff: 1,
        enableRetry: true
      }
    );

    const result = await runtime.invoke('service.call', {});
    expect(result).toMatchObject({ ok: true });
    expect(attempts).toBe(3);
  });

  it('fails on timeout with runtime code', async () => {
    const runtime = new RuntimeClient(
      createBridge(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { ok: true };
      }),
      {
        defaultTimeout: 5,
        maxRetries: 0,
        retryDelay: 1,
        retryBackoff: 1,
        enableRetry: true
      }
    );

    await expect(runtime.invoke('slow.action', {})).rejects.toMatchObject({ code: 'RUNTIME_TIMEOUT' });
  });

  it('removes event subscription via off', async () => {
    const listeners = new Map<string, Set<(payload: unknown) => void>>();
    const bridge = {
      ...createBridge(async () => ({})),
      on: (event: string, handler: (payload: unknown) => void) => {
        const bucket = listeners.get(event) ?? new Set<(payload: unknown) => void>();
        bucket.add(handler);
        listeners.set(event, bucket);
        return () => {
          bucket.delete(handler);
        };
      }
    } as ChipsBridge;

    const runtime = new RuntimeClient(bridge);
    let count = 0;
    const handler = () => {
      count += 1;
    };

    runtime.on('theme.changed', handler);
    listeners.get('theme.changed')?.forEach((listener) => listener({}));
    runtime.off('theme.changed', handler);
    listeners.get('theme.changed')?.forEach((listener) => listener({}));

    expect(count).toBe(1);
  });
});

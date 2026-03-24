import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HostApplication } from '../../src/main/core/host-application';
import { HostMainProcess } from '../../src/main/core/main-process';
import { CHIPS_RENDER_DOCUMENT_SCHEME } from '../../src/main/electron/render-document-protocol';

const ELECTRON_MOCK_KEY = '__chipsElectronMock';

class ProcessStub extends EventEmitter {
  public override on(event: 'uncaughtException' | 'unhandledRejection', listener: (error: unknown) => void): this {
    return super.on(event, listener);
  }

  public override off(event: 'uncaughtException' | 'unhandledRejection', listener: (error: unknown) => void): this {
    return super.off(event, listener);
  }
}

describe('HostMainProcess lifecycle', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY];
    vi.resetModules();
  });

  it('registers the managed render document scheme when the main-process module is loaded', async () => {
    vi.resetModules();
    const registerSchemesAsPrivileged = vi.fn();
    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      protocol: {
        registerSchemesAsPrivileged,
      },
    };

    await import('../../src/main/core/main-process');

    expect(registerSchemesAsPrivileged).toHaveBeenCalledWith([
      expect.objectContaining({
        scheme: 'chips-render',
      }),
    ]);
  });

  it('registers the managed render document scheme before Electron ready', async () => {
    const processRef = new ProcessStub();
    const loggerWrite = vi.fn();
    const callOrder: string[] = [];
    const start = vi.fn(async () => {
      callOrder.push('host.start');
    });

    const fakeHost = {
      logger: {
        write: loggerWrite,
      },
      start,
      stop: vi.fn(async () => {}),
      isRunning: vi.fn(() => true),
    } as unknown as HostApplication;

    const appEvents = new EventEmitter();
    const whenReady = vi.fn(async () => {
      callOrder.push('electron.whenReady');
    });

    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      protocol: {
        registerSchemesAsPrivileged: vi.fn(() => {
          callOrder.push('protocol.registerSchemesAsPrivileged');
        }),
      },
    };

    const electronApp = {
      whenReady,
      on: (event: string, listener: (...args: unknown[]) => void) => {
        appEvents.on(event, listener);
      },
      off: (event: string, listener: (...args: unknown[]) => void) => {
        appEvents.off(event, listener);
      },
      quit: vi.fn(() => {}),
    };

    const main = new HostMainProcess({
      hostApplication: fakeHost,
      processRef,
      electronApp: electronApp as any,
    });

    await main.start();

    const mockedElectron = (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] as {
      protocol: {
        registerSchemesAsPrivileged: ReturnType<typeof vi.fn>;
      };
    };
    expect(mockedElectron.protocol.registerSchemesAsPrivileged).toHaveBeenCalledWith([
      expect.objectContaining({
        scheme: CHIPS_RENDER_DOCUMENT_SCHEME,
      }),
    ]);
    expect(callOrder).toEqual([
      'protocol.registerSchemesAsPrivileged',
      'electron.whenReady',
      'host.start',
    ]);
  });

  it('starts with electron lifecycle hooks and handles global errors', async () => {
    const processRef = new ProcessStub();
    const loggerWrite = vi.fn();
    const start = vi.fn(async () => {});
    const stop = vi.fn(async () => {});
    const isRunning = vi.fn(() => true);

    const fakeHost = {
      logger: {
        write: loggerWrite
      },
      start,
      stop,
      isRunning
    } as unknown as HostApplication;

    const appEvents = new EventEmitter();
    const whenReady = vi.fn(async () => {});
    const quit = vi.fn(() => {});

    const electronApp = {
      whenReady,
      on: (event: string, listener: (...args: unknown[]) => void) => {
        appEvents.on(event, listener);
      },
      off: (event: string, listener: (...args: unknown[]) => void) => {
        appEvents.off(event, listener);
      },
      quit
    };

    const main = new HostMainProcess({
      hostApplication: fakeHost,
      processRef,
      electronApp: electronApp as any
    });

    await main.start();
    expect(whenReady).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);

    processRef.emit('uncaughtException', new Error('boom'));
    expect(loggerWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        action: 'exception',
        errorCode: 'HOST_UNHANDLED_ERROR'
      })
    );

    appEvents.emit('window-all-closed');
    expect(quit).toHaveBeenCalledTimes(0);
    expect(loggerWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        action: 'window-all-closed',
        result: 'success'
      })
    );

    await main.stop();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(main.isRunning()).toBe(false);
  });

  it('stops host when before-quit is triggered', async () => {
    const processRef = new ProcessStub();
    const stop = vi.fn(async () => {});

    const fakeHost = {
      logger: {
        write: vi.fn()
      },
      start: vi.fn(async () => {}),
      stop,
      isRunning: vi.fn(() => true)
    } as unknown as HostApplication;

    const appEvents = new EventEmitter();
    const electronApp = {
      whenReady: vi.fn(async () => {}),
      on: (event: string, listener: (...args: unknown[]) => void) => {
        appEvents.on(event, listener);
      },
      off: (event: string, listener: (...args: unknown[]) => void) => {
        appEvents.off(event, listener);
      },
      quit: vi.fn(() => {})
    };

    const main = new HostMainProcess({
      hostApplication: fakeHost,
      processRef,
      electronApp: electronApp as any
    });

    await main.start();
    appEvents.emit('before-quit');
    await new Promise((resolve) => setImmediate(resolve));

    expect(stop).toHaveBeenCalledTimes(1);
  });
});

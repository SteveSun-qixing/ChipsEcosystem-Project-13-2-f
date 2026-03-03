import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import type { HostApplication } from '../../src/main/core/host-application';
import { HostMainProcess } from '../../src/main/core/main-process';

class ProcessStub extends EventEmitter {
  public override on(event: 'uncaughtException' | 'unhandledRejection', listener: (error: unknown) => void): this {
    return super.on(event, listener);
  }

  public override off(event: 'uncaughtException' | 'unhandledRejection', listener: (error: unknown) => void): this {
    return super.off(event, listener);
  }
}

describe('HostMainProcess lifecycle', () => {
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
      on: (event: 'before-quit' | 'window-all-closed' | 'activate', listener: () => void) => {
        appEvents.on(event, listener);
      },
      off: (event: 'before-quit' | 'window-all-closed' | 'activate', listener: () => void) => {
        appEvents.off(event, listener);
      },
      quit
    };

    const main = new HostMainProcess({
      hostApplication: fakeHost,
      processRef,
      electronApp
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
    expect(quit).toHaveBeenCalledTimes(process.platform === 'darwin' ? 0 : 1);

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
      on: (event: 'before-quit' | 'window-all-closed' | 'activate', listener: () => void) => {
        appEvents.on(event, listener);
      },
      off: (event: 'before-quit' | 'window-all-closed' | 'activate', listener: () => void) => {
        appEvents.off(event, listener);
      },
      quit: vi.fn(() => {})
    };

    const main = new HostMainProcess({
      hostApplication: fakeHost,
      processRef,
      electronApp
    });

    await main.start();
    appEvents.emit('before-quit');
    await new Promise((resolve) => setImmediate(resolve));

    expect(stop).toHaveBeenCalledTimes(1);
  });
});

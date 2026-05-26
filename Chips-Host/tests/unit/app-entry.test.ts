import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ElectronAppLike } from '../../src/main/electron/electron-loader';
import {
  extractAssociatedFilePath,
  runElectronAppEntry,
} from '../../src/main/electron/app-entry';

class ElectronAppStub extends EventEmitter {
  public readonly whenReady = vi.fn(async () => {});
  public readonly setPath = vi.fn(() => {});
  public readonly quit = vi.fn(() => {});
  public readonly requestSingleInstanceLock = vi.fn(() => true);
}

describe('electron app entry', () => {
  const tempDirs: string[] = [];

  const createTempWorkspace = async (): Promise<string> => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-app-entry-'));
    tempDirs.push(workspacePath);
    return workspacePath;
  };

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('extracts associated file paths from argv while ignoring switches', () => {
    const target = extractAssociatedFilePath([
      '/Applications/Chips.app/Contents/MacOS/Chips',
      '--workspace=/tmp/chips-workspace',
      '/tmp/demo.png',
    ]);

    expect(target).toBe(path.resolve('/tmp/demo.png'));
    expect(extractAssociatedFilePath(['/Applications/Chips.app/Contents/MacOS/Chips', '--workspace=/tmp/chips-workspace'])).toBeNull();
  });

  it('routes initial associated file argv through openAssociatedFile', async () => {
    const electronApp = new ElectronAppStub();
    const workspacePath = await createTempWorkspace();
    const runtime = {
      invoke: vi.fn(async () => ({ window: { id: 'window-1' } })),
    };
    const openAssociatedFileFn = vi.fn(async () => undefined);
    const bootstrapMainProcess = vi.fn(async () => ({
      getHostApplication: () => ({
        createBridge: () => ({}),
        takeStartupLaunchPluginId: () => undefined,
      }),
    }));

    await runElectronAppEntry({
      argv: ['/Applications/Chips.app/Contents/MacOS/Chips', `--workspace=${workspacePath}`, '/tmp/demo.card'],
      electronApp: electronApp as unknown as ElectronAppLike,
      bootstrapMainProcess,
      createRuntime: () => runtime as any,
      openAssociatedFileFn,
      processRef: {
        stderr: {
          write: vi.fn(() => true),
        },
      },
    });

    expect(bootstrapMainProcess).toHaveBeenCalledWith({
      workspacePath,
    });
    expect(openAssociatedFileFn).toHaveBeenCalledWith(runtime, path.resolve('/tmp/demo.card'));
    expect(runtime.invoke).not.toHaveBeenCalledWith('plugin.launch', expect.anything());
  });

  it('sets Electron userData inside the selected Host workspace before requesting the single-instance lock', async () => {
    const callOrder: string[] = [];
    const workspacePath = await createTempWorkspace();
    const electronApp = new ElectronAppStub();
    electronApp.setPath.mockImplementation(() => {
      callOrder.push('setPath');
    });
    electronApp.requestSingleInstanceLock.mockImplementation(() => {
      callOrder.push('requestSingleInstanceLock');
      return true;
    });

    await runElectronAppEntry({
      argv: ['/Applications/Chips.app/Contents/MacOS/Chips', `--workspace=${workspacePath}`],
      electronApp: electronApp as unknown as ElectronAppLike,
      bootstrapMainProcess: async () => ({
        getHostApplication: () => ({
          createBridge: () => ({}),
          takeStartupLaunchPluginId: () => undefined,
        }),
      }),
      createRuntime: () => ({ invoke: vi.fn(async () => undefined) }) as any,
      processRef: {
        stderr: {
          write: vi.fn(() => true),
        },
      },
    });

    expect(electronApp.setPath).toHaveBeenCalledWith('userData', path.join(workspacePath, 'electron-user-data'));
    expect(callOrder).toEqual(['setPath', 'requestSingleInstanceLock']);
  });

  it('keeps app shortcut launch flow unchanged when plugin launch args are provided', async () => {
    const electronApp = new ElectronAppStub();
    const workspacePath = await createTempWorkspace();
    const runtime = {
      invoke: vi.fn(async () => ({ window: { id: 'window-2' } })),
    };
    const openAssociatedFileFn = vi.fn(async () => undefined);

    await runElectronAppEntry({
      argv: [
        '/Applications/Chips.app/Contents/MacOS/Chips',
        `--workspace=${workspacePath}`,
        '--chips-launch-plugin=chips.viewer',
      ],
      electronApp: electronApp as unknown as ElectronAppLike,
      bootstrapMainProcess: async () => ({
        getHostApplication: () => ({
          createBridge: () => ({}),
          takeStartupLaunchPluginId: () => undefined,
        }),
      }),
      createRuntime: () => runtime as any,
      openAssociatedFileFn,
      processRef: {
        stderr: {
          write: vi.fn(() => true),
        },
      },
    });

    expect(runtime.invoke).toHaveBeenCalledWith('plugin.launch', {
      pluginId: 'chips.viewer',
      launchParams: {
        trigger: 'app-shortcut',
      },
    });
    expect(openAssociatedFileFn).not.toHaveBeenCalled();
  });

  it('queues macOS open-file events before runtime is ready and flushes after startup', async () => {
    const electronApp = new ElectronAppStub();
    let releaseBootstrap: (() => void) | undefined;

    const runtime = {
      invoke: vi.fn(async () => ({ window: { id: 'window-3' } })),
    };
    const openAssociatedFileFn = vi.fn(async () => undefined);

    const bootPromise = runElectronAppEntry({
      argv: ['/Applications/Chips.app/Contents/MacOS/Chips'],
      electronApp: electronApp as unknown as ElectronAppLike,
      bootstrapMainProcess: () =>
        new Promise((resolve) => {
          releaseBootstrap = () => {
            resolve({
              getHostApplication: () => ({
                createBridge: () => ({}),
                takeStartupLaunchPluginId: () => undefined,
              }),
            });
          };
        }),
      createRuntime: () => runtime as any,
      openAssociatedFileFn,
      processRef: {
        stderr: {
          write: vi.fn(() => true),
        },
      },
    });

    const preventDefault = vi.fn();
    electronApp.emit('open-file', { preventDefault }, '/tmp/demo.box');
    await Promise.resolve();
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(openAssociatedFileFn).not.toHaveBeenCalled();

    if (!releaseBootstrap) {
      throw new Error('Expected bootstrap to be pending.');
    }
    releaseBootstrap();
    await bootPromise;

    expect(openAssociatedFileFn).toHaveBeenCalledWith(runtime, path.resolve('/tmp/demo.box'));
  });

  it('routes second-instance associated file argv after startup', async () => {
    const electronApp = new ElectronAppStub();
    const runtime = {
      invoke: vi.fn(async () => ({ window: { id: 'window-4' } })),
    };
    const openAssociatedFileFn = vi.fn(async () => undefined);

    await runElectronAppEntry({
      argv: ['/Applications/Chips.app/Contents/MacOS/Chips'],
      electronApp: electronApp as unknown as ElectronAppLike,
      bootstrapMainProcess: async () => ({
        getHostApplication: () => ({
          createBridge: () => ({}),
          takeStartupLaunchPluginId: () => undefined,
        }),
      }),
      createRuntime: () => runtime as any,
      openAssociatedFileFn,
      processRef: {
        stderr: {
          write: vi.fn(() => true),
        },
      },
    });

    electronApp.emit('second-instance', {}, ['/Applications/Chips.app/Contents/MacOS/Chips', '/tmp/again.card'], '/tmp');
    await new Promise((resolve) => setImmediate(resolve));

    expect(openAssociatedFileFn).toHaveBeenCalledWith(runtime, path.resolve('/tmp/again.card'));
  });

  it('launches bundled startup plugin when no explicit startup input is provided', async () => {
    const electronApp = new ElectronAppStub();
    const runtime = {
      invoke: vi.fn(async () => ({ window: { id: 'window-5' } })),
    };

    await runElectronAppEntry({
      argv: ['/Applications/Chips.app/Contents/MacOS/Chips'],
      electronApp: electronApp as unknown as ElectronAppLike,
      bootstrapMainProcess: async () => ({
        getHostApplication: () => ({
          createBridge: () => ({}),
          takeStartupLaunchPluginId: () => 'com.chips.eco-settings-panel',
        }),
      }),
      createRuntime: () => runtime as any,
      processRef: {
        stderr: {
          write: vi.fn(() => true),
        },
      },
    });

    expect(runtime.invoke).toHaveBeenCalledWith('plugin.launch', {
      pluginId: 'com.chips.eco-settings-panel',
      launchParams: {
        trigger: 'host-first-run',
      },
    });
  });
});

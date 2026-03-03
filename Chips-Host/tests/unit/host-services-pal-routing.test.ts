import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Kernel } from '../../packages/kernel/src';
import type { PALAdapter } from '../../packages/pal/src';
import { BoxService } from '../../packages/box-service/src';
import { CardService } from '../../packages/card-service/src';
import { StoreZipService } from '../../packages/zip-service/src';
import { PluginRuntime } from '../../src/runtime';
import { StructuredLogger } from '../../src/shared/logger';
import type { RouteInvocationContext } from '../../src/shared/types';
import { registerHostSchemas } from '../../src/main/services/register-schemas';
import { registerHostServices } from '../../src/main/services/register-host-services';

interface PalState {
  clipboard: string;
  dialogOpenArgs: unknown[];
  dialogSaveArgs: unknown[];
  dialogMessageArgs: unknown[];
  dialogConfirmArgs: unknown[];
  shellOpenPath: string[];
  shellOpenExternal: string[];
  shellShowInFolder: string[];
  notifications: Array<{ title: string; body: string }>;
  trayActive: boolean;
  shortcuts: string[];
  preventSleep: boolean;
}

const createContextFactory = () => {
  let sequence = 0;
  return (permissions: string[]): RouteInvocationContext => {
    sequence += 1;
    return {
      requestId: `req-${sequence}`,
      timestamp: Date.now(),
      caller: {
        id: 'unit-test',
        type: 'service',
        permissions
      }
    };
  };
};

const createPal = (state: PalState): PALAdapter => {
  return {
    window: {
      async create(options) {
        return {
          id: 'window-1',
          title: options.title,
          width: options.width,
          height: options.height,
          focused: false,
          state: 'normal'
        };
      },
      async focus() {},
      async resize() {},
      async setState() {},
      async getState() {
        return {
          id: 'window-1',
          title: 'Window',
          width: 800,
          height: 600,
          focused: false,
          state: 'normal'
        };
      },
      async close() {}
    },
    fs: {
      normalize: (inputPath) => path.normalize(inputPath),
      async readFile(inputPath, options) {
        if (options?.encoding) {
          return fs.readFile(inputPath, { encoding: options.encoding });
        }
        return fs.readFile(inputPath);
      },
      async writeFile(inputPath, data) {
        await fs.mkdir(path.dirname(inputPath), { recursive: true });
        await fs.writeFile(inputPath, data);
      },
      async stat(inputPath) {
        const stats = await fs.stat(inputPath);
        return {
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          size: stats.size,
          mtimeMs: stats.mtimeMs
        };
      },
      async list(inputPath) {
        return fs.readdir(inputPath);
      }
    },
    dialog: {
      async openFile(options) {
        state.dialogOpenArgs.push(options ?? null);
        return ['/virtual/opened.txt'];
      },
      async saveFile(options) {
        state.dialogSaveArgs.push(options ?? null);
        return '/virtual/saved.txt';
      },
      async showMessage(options) {
        state.dialogMessageArgs.push(options);
        return 0;
      },
      async showConfirm(options) {
        state.dialogConfirmArgs.push(options);
        return true;
      }
    },
    clipboard: {
      async read() {
        return state.clipboard;
      },
      async write(data) {
        state.clipboard = data;
      }
    },
    shell: {
      async openPath(targetPath) {
        state.shellOpenPath.push(targetPath);
      },
      async openExternal(url) {
        state.shellOpenExternal.push(url);
      },
      async showItemInFolder(targetPath) {
        state.shellShowInFolder.push(targetPath);
      }
    },
    platform: {
      async getInfo() {
        return {
          platform: process.platform,
          arch: process.arch,
          release: 'test'
        };
      },
      async getCapabilities() {
        return ['dialog', 'clipboard', 'shell', 'tray', 'notification', 'shortcut', 'power'];
      }
    },
    tray: {
      async set() {
        state.trayActive = true;
        return { active: true };
      },
      async clear() {
        state.trayActive = false;
      },
      async getState() {
        return { active: state.trayActive };
      }
    },
    notification: {
      async show(options) {
        state.notifications.push({ title: options.title, body: options.body });
      }
    },
    shortcut: {
      async register(accelerator) {
        if (!state.shortcuts.includes(accelerator)) {
          state.shortcuts.push(accelerator);
        }
        return true;
      },
      async unregister(accelerator) {
        state.shortcuts = state.shortcuts.filter((item) => item !== accelerator);
      },
      async isRegistered(accelerator) {
        return state.shortcuts.includes(accelerator);
      },
      async list() {
        return [...state.shortcuts];
      },
      async clear() {
        state.shortcuts = [];
      }
    },
    power: {
      async getState() {
        return {
          idleSeconds: 0,
          preventSleep: state.preventSleep
        };
      },
      async setPreventSleep(prevent) {
        state.preventSleep = prevent;
        return prevent;
      }
    }
  };
};

describe('Host services PAL routing', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-host-pal-'));
  });

  afterEach(async () => {
    await fs.rm(workspace, { recursive: true, force: true });
  });

  it('forwards dialog routes to PAL dialog implementation', async () => {
    const state: PalState = {
      clipboard: '',
      dialogOpenArgs: [],
      dialogSaveArgs: [],
      dialogMessageArgs: [],
      dialogConfirmArgs: [],
      shellOpenPath: [],
      shellOpenExternal: [],
      shellShowInFolder: [],
      notifications: [],
      trayActive: false,
      shortcuts: [],
      preventSleep: false
    };
    const kernel = new Kernel();
    const runtime = new PluginRuntime(workspace, { locale: 'zh-CN', themeId: 'chips-official.default-theme' });
    await runtime.load();
    registerHostSchemas();
    await registerHostServices({
      kernel,
      pal: createPal(state),
      workspacePath: workspace,
      logger: new StructuredLogger(),
      getCardService: () => new CardService(),
      getBoxService: () => new BoxService(),
      getZipService: () => new StoreZipService(),
      runtime
    });
    const context = createContextFactory();
    const platformRead = ['platform.read'];

    const opened = await kernel.invoke<{ options: { defaultPath: string } }, { filePaths: string[] | null }>(
      'platform.dialogOpenFile',
      { options: { defaultPath: '/tmp/demo.txt' } },
      context(platformRead)
    );
    const saved = await kernel.invoke<{ options: { defaultPath: string } }, { filePath: string | null }>(
      'platform.dialogSaveFile',
      { options: { defaultPath: '/tmp/output.txt' } },
      context(platformRead)
    );
    const message = await kernel.invoke<{ options: { message: string } }, { response: number }>(
      'platform.dialogShowMessage',
      { options: { message: 'hello' } },
      context(platformRead)
    );
    const confirm = await kernel.invoke<{ options: { message: string } }, { confirmed: boolean }>(
      'platform.dialogShowConfirm',
      { options: { message: 'ok?' } },
      context(platformRead)
    );

    expect(opened.filePaths).toEqual(['/virtual/opened.txt']);
    expect(saved.filePath).toBe('/virtual/saved.txt');
    expect(message.response).toBe(0);
    expect(confirm.confirmed).toBe(true);
    expect(state.dialogOpenArgs).toHaveLength(1);
    expect(state.dialogSaveArgs).toHaveLength(1);
    expect(state.dialogMessageArgs).toHaveLength(1);
    expect(state.dialogConfirmArgs).toHaveLength(1);
  });

  it('forwards clipboard and shell routes to PAL clipboard/shell implementation', async () => {
    const state: PalState = {
      clipboard: '',
      dialogOpenArgs: [],
      dialogSaveArgs: [],
      dialogMessageArgs: [],
      dialogConfirmArgs: [],
      shellOpenPath: [],
      shellOpenExternal: [],
      shellShowInFolder: [],
      notifications: [],
      trayActive: false,
      shortcuts: [],
      preventSleep: false
    };
    const kernel = new Kernel();
    const runtime = new PluginRuntime(workspace, { locale: 'zh-CN', themeId: 'chips-official.default-theme' });
    await runtime.load();
    registerHostSchemas();
    await registerHostServices({
      kernel,
      pal: createPal(state),
      workspacePath: workspace,
      logger: new StructuredLogger(),
      getCardService: () => new CardService(),
      getBoxService: () => new BoxService(),
      getZipService: () => new StoreZipService(),
      runtime
    });
    const context = createContextFactory();
    const platformRead = ['platform.read'];
    const platformExternal = ['platform.external'];

    await kernel.invoke('platform.clipboardWrite', { data: 'chips-data', format: 'text' }, context(platformRead));
    const readBack = await kernel.invoke<{ format: 'text' }, { data: string }>(
      'platform.clipboardRead',
      { format: 'text' },
      context(platformRead)
    );

    await kernel.invoke('platform.shellOpenPath', { path: '/tmp/chips/a.txt' }, context(platformExternal));
    await kernel.invoke('platform.shellOpenExternal', { url: 'https://chips.example' }, context(platformExternal));
    await kernel.invoke('platform.shellShowItemInFolder', { path: '/tmp/chips/a.txt' }, context(platformExternal));
    await kernel.invoke('platform.openExternal', { url: 'https://chips.example/platform' }, context(platformExternal));
    await kernel.invoke('platform.notificationShow', { options: { title: 'chips', body: 'ready' } }, context(platformRead));
    await kernel.invoke('platform.traySet', { options: { tooltip: 'chips' } }, context(platformExternal));
    await kernel.invoke('platform.shortcutRegister', { accelerator: 'CommandOrControl+Shift+N' }, context(platformExternal));
    await kernel.invoke('platform.powerSetPreventSleep', { prevent: true }, context(platformExternal));

    expect(readBack.data).toBe('chips-data');
    expect(state.shellOpenPath).toEqual(['/tmp/chips/a.txt']);
    expect(state.shellShowInFolder).toEqual(['/tmp/chips/a.txt']);
    expect(state.shellOpenExternal).toEqual(['https://chips.example', 'https://chips.example/platform']);
    expect(state.notifications).toEqual([{ title: 'chips', body: 'ready' }]);
    expect(state.trayActive).toBe(true);
    expect(state.shortcuts).toContain('CommandOrControl+Shift+N');
    expect(state.preventSleep).toBe(true);
  });
});

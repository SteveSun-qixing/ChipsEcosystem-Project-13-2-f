import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { NodePalAdapter } from '../../packages/pal/src';

const ELECTRON_MOCK_KEY = '__chipsElectronMock';

class MockBrowserWindow {
  public static instances: MockBrowserWindow[] = [];
  public static sequence = 0;
  public static getAllWindows(): MockBrowserWindow[] {
    return MockBrowserWindow.instances.filter((window) => !window.destroyed);
  }

  public readonly id: number;
  public readonly options: Record<string, unknown>;
  public readonly webContents: { id: number; send: (channel: string, payload: unknown) => void };
  public loadedUrl?: string;
  public loadedFile?: string;

  private title: string;
  private focused = false;
  private minimized = false;
  private maximized = false;
  private fullscreen = false;
  private destroyed = false;
  private width: number;
  private height: number;
  private onClosed?: () => void;

  public constructor(options: Record<string, unknown>) {
    MockBrowserWindow.sequence += 1;
    this.id = MockBrowserWindow.sequence;
    this.options = options;
    this.title = String(options.title ?? '');
    this.width = Number(options.width ?? 800);
    this.height = Number(options.height ?? 600);
    this.webContents = {
      id: this.id,
      send: () => {}
    };
    MockBrowserWindow.instances.push(this);
  }

  public focus(): void {
    this.focused = true;
    this.minimized = false;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public getBounds(): { width: number; height: number } {
    return {
      width: this.width,
      height: this.height
    };
  }

  public setTitle(title: string): void {
    this.title = title;
  }

  public isFocused(): boolean {
    return this.focused;
  }

  public isMinimized(): boolean {
    return this.minimized;
  }

  public isMaximized(): boolean {
    return this.maximized;
  }

  public isFullScreen(): boolean {
    return this.fullscreen;
  }

  public minimize(): void {
    this.minimized = true;
    this.maximized = false;
    this.fullscreen = false;
    this.focused = false;
  }

  public maximize(): void {
    this.maximized = true;
    this.minimized = false;
    this.fullscreen = false;
  }

  public setFullScreen(flag: boolean): void {
    this.fullscreen = flag;
    if (flag) {
      this.maximized = false;
      this.minimized = false;
    }
  }

  public restore(): void {
    this.maximized = false;
    this.minimized = false;
    this.fullscreen = false;
  }

  public close(): void {
    this.destroyed = true;
    this.focused = false;
    this.onClosed?.();
  }

  public isDestroyed(): boolean {
    return this.destroyed;
  }

  public on(event: 'closed', listener: () => void): void {
    if (event === 'closed') {
      this.onClosed = listener;
    }
  }

  public async loadURL(url: string): Promise<void> {
    this.loadedUrl = url;
  }

  public async loadFile(filePath: string): Promise<void> {
    this.loadedFile = filePath;
  }
}

class MockTray {
  public static instances: MockTray[] = [];
  public tooltip?: string;
  public image: string;
  public menu: unknown;
  private destroyed = false;

  public constructor(image: string) {
    this.image = image;
    MockTray.instances.push(this);
  }

  public setImage(image: string): void {
    this.image = image;
  }

  public setToolTip(text: string): void {
    this.tooltip = text;
  }

  public setContextMenu(menu: unknown): void {
    this.menu = menu;
  }

  public destroy(): void {
    this.destroyed = true;
  }

  public isDestroyed(): boolean {
    return this.destroyed;
  }
}

class MockNotification {
  public static payloads: Array<Record<string, unknown>> = [];
  private readonly options: Record<string, unknown>;

  public constructor(options: Record<string, unknown>) {
    this.options = options;
  }

  public show(): void {
    MockNotification.payloads.push(this.options);
  }
}

afterEach(() => {
  const globalValue = globalThis as Record<string, unknown>;
  delete globalValue[ELECTRON_MOCK_KEY];
  MockBrowserWindow.instances = [];
  MockBrowserWindow.sequence = 0;
  MockTray.instances = [];
  MockNotification.payloads = [];
});

describe('Node PAL BrowserWindow host chain', () => {
  it('uses BrowserWindow for create/focus/resize/state/close actions', async () => {
    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      BrowserWindow: MockBrowserWindow
    };

    const pal = new NodePalAdapter({
      window: {
        electronPreloadPath: __filename
      }
    });
    const opened = await pal.window.create({
      title: 'Demo App',
      width: 900,
      height: 700,
      url: 'https://chips.local/app',
      pluginId: 'chips.demo.app',
      sessionId: 'session-1',
      permissions: ['theme.read', 'i18n.read']
    });

    expect(MockBrowserWindow.instances).toHaveLength(1);
    const browserWindow = MockBrowserWindow.instances[0]!;
    expect(browserWindow.loadedUrl).toBe('https://chips.local/app');
    expect(browserWindow.options.webPreferences).toMatchObject({
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(__filename),
      additionalArguments: [
        expect.stringContaining('--chips-bridge-context=')
      ]
    });
    expect(opened.pluginId).toBe('chips.demo.app');
    expect(opened.sessionId).toBe('session-1');
    expect(opened.url).toBe('https://chips.local/app');

    await pal.window.focus(opened.id);
    await pal.window.resize(opened.id, 1280, 800);
    await pal.window.setState(opened.id, 'maximized');
    const state = await pal.window.getState(opened.id);
    expect(state.focused).toBe(true);
    expect(state.width).toBe(1280);
    expect(state.height).toBe(800);
    expect(state.state).toBe('maximized');

    await pal.window.close(opened.id);
    await expect(pal.window.getState(opened.id)).rejects.toMatchObject({
      code: 'PAL_WINDOW_NOT_FOUND'
    });
  });

  it('loads local html entry with loadFile in Electron mode', async () => {
    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      BrowserWindow: MockBrowserWindow
    };

    const pal = new NodePalAdapter();
    const htmlEntry = path.join('/tmp', 'chips-plugin', 'index.html');
    await pal.window.create({
      title: 'Local Entry',
      width: 800,
      height: 600,
      url: htmlEntry
    });

    const browserWindow = MockBrowserWindow.instances[0]!;
    expect(browserWindow.loadedFile).toBe(path.resolve(htmlEntry));
    expect(browserWindow.loadedUrl).toBeUndefined();
  });

  it('supports tray/notification/shortcut/power capabilities in Electron mode', async () => {
    const registeredShortcuts = new Map<string, () => void>();
    const powerBlockers = new Set<number>();
    let blockerSequence = 0;

    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      BrowserWindow: MockBrowserWindow,
      Notification: MockNotification,
      Tray: MockTray,
      Menu: {
        buildFromTemplate: (template: unknown[]) => ({ template })
      },
      globalShortcut: {
        register: (accelerator: string, callback: () => void) => {
          registeredShortcuts.set(accelerator, callback);
          return true;
        },
        unregister: (accelerator: string) => {
          registeredShortcuts.delete(accelerator);
        },
        unregisterAll: () => {
          registeredShortcuts.clear();
        },
        isRegistered: (accelerator: string) => registeredShortcuts.has(accelerator)
      },
      powerMonitor: {
        getSystemIdleTime: () => 12
      },
      powerSaveBlocker: {
        start: () => {
          blockerSequence += 1;
          powerBlockers.add(blockerSequence);
          return blockerSequence;
        },
        stop: (id: number) => {
          powerBlockers.delete(id);
          return true;
        },
        isStarted: (id: number) => powerBlockers.has(id)
      }
    };

    const pal = new NodePalAdapter();
    await pal.notification.show({ title: 'chips', body: 'ready' });
    expect(MockNotification.payloads).toEqual([
      { title: 'chips', body: 'ready', icon: undefined, silent: false }
    ]);

    const trayState = await pal.tray.set({
      icon: '/tmp/chips-icon.png',
      tooltip: 'chips',
      menu: [{ id: 'open', label: 'Open' }]
    });
    expect(trayState.active).toBe(true);
    expect(MockTray.instances).toHaveLength(1);
    expect(MockTray.instances[0]!.tooltip).toBe('chips');

    const onShortcut = { called: 0 };
    await pal.shortcut.register('CommandOrControl+Shift+N', () => {
      onShortcut.called += 1;
    });
    expect(await pal.shortcut.isRegistered('CommandOrControl+Shift+N')).toBe(true);
    registeredShortcuts.get('CommandOrControl+Shift+N')?.();
    expect(onShortcut.called).toBe(1);

    expect(await pal.power.getState()).toMatchObject({ idleSeconds: 12, preventSleep: false });
    expect(await pal.power.setPreventSleep(true)).toBe(true);
    expect(await pal.power.getState()).toMatchObject({ preventSleep: true });
    expect(await pal.power.setPreventSleep(false)).toBe(false);
  });
});

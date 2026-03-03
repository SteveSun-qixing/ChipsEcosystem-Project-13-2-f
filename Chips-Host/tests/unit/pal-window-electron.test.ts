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

afterEach(() => {
  const globalValue = globalThis as Record<string, unknown>;
  delete globalValue[ELECTRON_MOCK_KEY];
  MockBrowserWindow.instances = [];
  MockBrowserWindow.sequence = 0;
});

describe('Node PAL BrowserWindow host chain', () => {
  it('uses BrowserWindow for create/focus/resize/state/close actions', async () => {
    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      BrowserWindow: MockBrowserWindow
    };

    const pal = new NodePalAdapter();
    const opened = await pal.window.create({
      title: 'Demo App',
      width: 900,
      height: 700,
      url: 'https://chips.local/app',
      pluginId: 'chips.demo.app',
      sessionId: 'session-1'
    });

    expect(MockBrowserWindow.instances).toHaveLength(1);
    const browserWindow = MockBrowserWindow.instances[0]!;
    expect(browserWindow.loadedUrl).toBe('https://chips.local/app');
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
});

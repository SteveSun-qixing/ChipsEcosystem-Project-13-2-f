const ELECTRON_MOCK_KEY = '__chipsElectronMock';

export interface ElectronIpcMainLike {
  handle(channel: string, listener: (event: unknown, payload: unknown) => Promise<unknown> | unknown): void;
  removeHandler(channel: string): void;
  on(channel: string, listener: (event: unknown, payload: unknown) => void): void;
  off(channel: string, listener: (event: unknown, payload: unknown) => void): void;
}

export interface ElectronIpcRendererLike {
  invoke(channel: string, payload: unknown): Promise<unknown>;
  send(channel: string, payload: unknown): void;
  on(channel: string, listener: (event: unknown, payload: unknown) => void): void;
  once(channel: string, listener: (event: unknown, payload: unknown) => void): void;
  removeListener(channel: string, listener: (event: unknown, payload: unknown) => void): void;
}

export interface ElectronContextBridgeLike {
  exposeInMainWorld(name: string, api: unknown): void;
}

export interface ElectronAppLike {
  whenReady(): Promise<void>;
  on(event: 'before-quit' | 'window-all-closed' | 'activate', listener: () => void): void;
  off(event: 'before-quit' | 'window-all-closed' | 'activate', listener: () => void): void;
  quit(): void;
}

export interface ElectronWebContentsLike {
  id: number;
  send(channel: string, payload: unknown): void;
}

export interface ElectronBrowserWindowLike {
  id: number;
  focus(): void;
  setSize(width: number, height: number): void;
  getBounds(): { width: number; height: number };
  setTitle(title: string): void;
  isFocused(): boolean;
  isMinimized(): boolean;
  isMaximized(): boolean;
  isFullScreen(): boolean;
  minimize(): void;
  maximize(): void;
  setFullScreen(flag: boolean): void;
  restore(): void;
  close(): void;
  isDestroyed(): boolean;
  on(event: 'closed', listener: () => void): void;
  loadURL(url: string): Promise<void> | void;
  loadFile(filePath: string): Promise<void> | void;
  webContents: ElectronWebContentsLike;
}

export interface ElectronBrowserWindowCtorLike {
  new (options: Record<string, unknown>): ElectronBrowserWindowLike;
  fromWebContents?(webContents: unknown): ElectronBrowserWindowLike | null;
  getAllWindows?(): ElectronBrowserWindowLike[];
}

export interface ElectronNotificationLike {
  show(): void;
}

export interface ElectronNotificationCtorLike {
  new (options: Record<string, unknown>): ElectronNotificationLike;
  isSupported?(): boolean;
}

export interface ElectronShortcutLike {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
  unregisterAll(): void;
  isRegistered(accelerator: string): boolean;
}

export interface ElectronTrayLike {
  setImage(image: string): void;
  setToolTip(text: string): void;
  setContextMenu(menu: unknown): void;
  destroy(): void;
  isDestroyed?(): boolean;
}

export interface ElectronTrayCtorLike {
  new (image: string): ElectronTrayLike;
}

export interface ElectronMenuLike {
  buildFromTemplate(template: Array<Record<string, unknown>>): unknown;
}

export interface ElectronPowerMonitorLike {
  getSystemIdleTime?(): number;
}

export interface ElectronPowerSaveBlockerLike {
  start(type: 'prevent-app-suspension' | 'prevent-display-sleep'): number;
  stop(id: number): boolean;
  isStarted(id: number): boolean;
}

export interface ElectronNativeImageLike {
  toPNG(): Buffer;
}

export interface ElectronNativeImageModuleLike {
  createFromBuffer(buffer: Buffer): ElectronNativeImageLike;
}

export interface ElectronClipboardLike {
  readText(): string;
  writeText(text: string): void;
  readImage(): ElectronNativeImageLike;
  writeImage(image: ElectronNativeImageLike): void;
  readBuffer(format: string): Buffer;
  writeBuffer(format: string, buffer: Buffer): void;
}

export interface ElectronModuleLike {
  app?: ElectronAppLike;
  ipcMain?: ElectronIpcMainLike;
  ipcRenderer?: ElectronIpcRendererLike;
  contextBridge?: ElectronContextBridgeLike;
  BrowserWindow?: ElectronBrowserWindowCtorLike;
  Notification?: ElectronNotificationCtorLike;
  globalShortcut?: ElectronShortcutLike;
  Tray?: ElectronTrayCtorLike;
  Menu?: ElectronMenuLike;
  powerMonitor?: ElectronPowerMonitorLike;
  powerSaveBlocker?: ElectronPowerSaveBlockerLike;
  clipboard?: ElectronClipboardLike;
  nativeImage?: ElectronNativeImageModuleLike;
}

const readElectronMock = (): ElectronModuleLike | undefined => {
  const globalValue = globalThis as Record<string, unknown>;
  const mock = globalValue[ELECTRON_MOCK_KEY];
  if (!mock || typeof mock !== 'object') {
    return undefined;
  }
  return mock as ElectronModuleLike;
};

const readElectronRuntime = (): ElectronModuleLike | null => {
  try {
    const runtime = globalThis as { require?: NodeRequire };
    const req =
      typeof require === 'function'
        ? require
        : typeof runtime.require === 'function'
          ? runtime.require
          : ((0, eval)('require') as NodeRequire);
    const module = req('electron') as ElectronModuleLike;
    if (!module || typeof module !== 'object') {
      return null;
    }
    return module;
  } catch {
    return null;
  }
};

export const loadElectronModule = (): ElectronModuleLike | null => {
  return readElectronMock() ?? readElectronRuntime();
};

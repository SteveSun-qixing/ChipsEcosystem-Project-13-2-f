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

export interface ElectronModuleLike {
  ipcMain?: ElectronIpcMainLike;
  ipcRenderer?: ElectronIpcRendererLike;
  contextBridge?: ElectronContextBridgeLike;
  BrowserWindow?: ElectronBrowserWindowCtorLike;
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
    const req = (0, eval)('require') as NodeRequire;
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

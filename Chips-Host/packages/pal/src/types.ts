import type { StandardError } from '../../../src/shared/types';

export interface WindowOptions {
  title: string;
  width: number;
  height: number;
  resizable?: boolean;
  alwaysOnTop?: boolean;
  url?: string;
  pluginId?: string;
  sessionId?: string;
}

export interface WindowState {
  id: string;
  title: string;
  width: number;
  height: number;
  focused: boolean;
  state: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
  url?: string;
  pluginId?: string;
  sessionId?: string;
}

export interface FileReadOptions {
  encoding?: BufferEncoding;
}

export interface FileListOptions {
  recursive?: boolean;
}

export interface FileStat {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtimeMs: number;
}

export interface PlatformInfo {
  platform: NodeJS.Platform;
  arch: string;
  release: string;
}

export interface DialogFileOptions {
  defaultPath?: string;
  mode?: 'file' | 'directory';
  allowMultiple?: boolean;
  mustExist?: boolean;
  title?: string;
}

export interface DialogSaveOptions {
  defaultPath?: string;
  title?: string;
}

export interface DialogMessageOptions {
  title?: string;
  message: string;
  detail?: string;
}

export interface PALWindow {
  create(options: WindowOptions): Promise<WindowState>;
  focus(id: string): Promise<void>;
  resize(id: string, width: number, height: number): Promise<void>;
  setState(id: string, state: WindowState['state']): Promise<void>;
  getState(id: string): Promise<WindowState>;
  close(id: string): Promise<void>;
}

export interface PALFileSystem {
  normalize(path: string): string;
  readFile(path: string, options?: FileReadOptions): Promise<string | Buffer>;
  writeFile(path: string, data: string | Buffer): Promise<void>;
  stat(path: string): Promise<FileStat>;
  list(path: string, options?: FileListOptions): Promise<string[]>;
}

export interface PALDialog {
  openFile(options?: DialogFileOptions): Promise<string[] | null>;
  saveFile(options?: DialogSaveOptions): Promise<string | null>;
  showMessage(options: DialogMessageOptions): Promise<number>;
  showConfirm(options: DialogMessageOptions): Promise<boolean>;
}

export interface PALClipboard {
  read(format?: 'text'): Promise<string>;
  write(data: string, format?: 'text'): Promise<void>;
}

export interface PALShell {
  openPath(targetPath: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  showItemInFolder(targetPath: string): Promise<void>;
}

export interface PALPlatform {
  getInfo(): Promise<PlatformInfo>;
  getCapabilities(): Promise<string[]>;
}

export interface PALAdapter {
  window: PALWindow;
  fs: PALFileSystem;
  dialog: PALDialog;
  clipboard: PALClipboard;
  shell: PALShell;
  platform: PALPlatform;
}

export interface PALError extends StandardError {
  platform?: string;
}

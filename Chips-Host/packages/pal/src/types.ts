import type { StandardError } from '../../../src/shared/types';

export interface WindowOptions {
  title: string;
  width: number;
  height: number;
  resizable?: boolean;
  alwaysOnTop?: boolean;
}

export interface WindowState {
  id: string;
  title: string;
  width: number;
  height: number;
  focused: boolean;
  state: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
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

export interface PALPlatform {
  getInfo(): Promise<PlatformInfo>;
  getCapabilities(): Promise<string[]>;
  openExternal(url: string): Promise<void>;
}

export interface PALAdapter {
  window: PALWindow;
  fs: PALFileSystem;
  platform: PALPlatform;
}

export interface PALError extends StandardError {
  platform?: string;
}

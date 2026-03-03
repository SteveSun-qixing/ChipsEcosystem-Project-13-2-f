import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createError } from '../../../src/shared/errors';
import { createId } from '../../../src/shared/utils';
import type {
  FileListOptions,
  FileReadOptions,
  PALAdapter,
  PALFileSystem,
  PALPlatform,
  PALWindow,
  WindowOptions,
  WindowState
} from './types';

const execFileAsync = promisify(execFile);

class NodeWindowManager implements PALWindow {
  private readonly windows = new Map<string, WindowState>();

  public async create(options: WindowOptions): Promise<WindowState> {
    const id = createId();
    const state: WindowState = {
      id,
      title: options.title,
      width: options.width,
      height: options.height,
      focused: false,
      state: 'normal'
    };
    this.windows.set(id, state);
    return state;
  }

  public async focus(id: string): Promise<void> {
    const target = this.windows.get(id);
    if (!target) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    for (const value of this.windows.values()) {
      value.focused = false;
    }

    target.focused = true;
  }

  public async resize(id: string, width: number, height: number): Promise<void> {
    const target = this.windows.get(id);
    if (!target) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    target.width = width;
    target.height = height;
  }

  public async setState(id: string, state: WindowState['state']): Promise<void> {
    const target = this.windows.get(id);
    if (!target) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    target.state = state;
  }

  public async getState(id: string): Promise<WindowState> {
    const target = this.windows.get(id);
    if (!target) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    return { ...target };
  }

  public async close(id: string): Promise<void> {
    if (!this.windows.has(id)) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    this.windows.delete(id);
  }
}

class NodeFileSystem implements PALFileSystem {
  public normalize(inputPath: string): string {
    return path.normalize(inputPath);
  }

  public async readFile(inputPath: string, options?: FileReadOptions): Promise<string | Buffer> {
    const normalizedPath = this.normalize(inputPath);
    const encoding = options?.encoding;
    if (encoding) {
      return fs.readFile(normalizedPath, { encoding });
    }
    return fs.readFile(normalizedPath);
  }

  public async writeFile(inputPath: string, data: string | Buffer): Promise<void> {
    const normalizedPath = this.normalize(inputPath);
    await fs.mkdir(path.dirname(normalizedPath), { recursive: true });
    await fs.writeFile(normalizedPath, data);
  }

  public async stat(inputPath: string) {
    const normalizedPath = this.normalize(inputPath);
    const stats = await fs.stat(normalizedPath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtimeMs: stats.mtimeMs
    };
  }

  public async list(inputPath: string, options?: FileListOptions): Promise<string[]> {
    const normalizedPath = this.normalize(inputPath);
    const recursive = options?.recursive ?? false;

    if (!recursive) {
      return fs.readdir(normalizedPath);
    }

    const list: string[] = [];
    const stack = [normalizedPath];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }

      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        const relative = path.relative(normalizedPath, fullPath);
        list.push(relative);
        if (entry.isDirectory()) {
          stack.push(fullPath);
        }
      }
    }

    return list;
  }
}

class NodePlatform implements PALPlatform {
  public async getInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      release: os.release()
    };
  }

  public async getCapabilities(): Promise<string[]> {
    return [
      'window',
      'file',
      'dialog',
      'clipboard',
      'tray',
      'power',
      'shortcut',
      'ipc'
    ];
  }

  public async openExternal(url: string): Promise<void> {
    if (process.platform === 'darwin') {
      await execFileAsync('open', [url]);
      return;
    }

    if (process.platform === 'win32') {
      await execFileAsync('cmd', ['/c', 'start', '', url]);
      return;
    }

    await execFileAsync('xdg-open', [url]);
  }
}

export class NodePalAdapter implements PALAdapter {
  public readonly window: PALWindow = new NodeWindowManager();
  public readonly fs: PALFileSystem = new NodeFileSystem();
  public readonly platform: PALPlatform = new NodePlatform();
}

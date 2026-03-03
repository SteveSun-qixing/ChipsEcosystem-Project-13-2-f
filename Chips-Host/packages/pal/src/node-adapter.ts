import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createError } from '../../../src/shared/errors';
import { createId } from '../../../src/shared/utils';
import type {
  DialogFileOptions,
  DialogMessageOptions,
  DialogSaveOptions,
  FileListOptions,
  FileReadOptions,
  PALAdapter,
  PALClipboard,
  PALDialog,
  PALFileSystem,
  PALPlatform,
  PALShell,
  PALWindow,
  WindowOptions,
  WindowState
} from './types';

const quoteAppleScript = (value: string): string => value.replaceAll('"', '\\"');

const runCommand = async (command: string, args: string[], input?: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      const asError = error as NodeJS.ErrnoException;
      if (asError.code === 'ENOENT') {
        reject(createError('PAL_COMMAND_NOT_FOUND', `Command not found: ${command}`));
        return;
      }
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          createError('PAL_COMMAND_FAILED', `Command failed: ${command}`, {
            args,
            code,
            stderr: stderr.trim()
          })
        );
        return;
      }
      resolve(stdout);
    });

    if (typeof input === 'string') {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
};

const commandExists = async (command: string): Promise<boolean> => {
  try {
    if (process.platform === 'win32') {
      await runCommand('where', [command]);
    } else {
      await runCommand('which', [command]);
    }
    return true;
  } catch {
    return false;
  }
};

const statSafe = async (inputPath: string): Promise<{ isFile: boolean; isDirectory: boolean } | null> => {
  try {
    const stats = await fs.stat(inputPath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch {
    return null;
  }
};

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

class NodeDialog implements PALDialog {
  public async openFile(options?: DialogFileOptions): Promise<string[] | null> {
    const normalizedDefault = options?.defaultPath ? path.resolve(options.defaultPath) : undefined;
    const mustExist = options?.mustExist ?? true;
    const mode = options?.mode ?? 'file';

    if (normalizedDefault) {
      const stats = await statSafe(normalizedDefault);
      if (!stats && mustExist) {
        throw createError('PAL_DIALOG_PATH_NOT_FOUND', `Path not found: ${normalizedDefault}`);
      }
      if (stats) {
        if (mode === 'file' && !stats.isFile) {
          throw createError('PAL_DIALOG_EXPECT_FILE', `Expected file path: ${normalizedDefault}`);
        }
        if (mode === 'directory' && !stats.isDirectory) {
          throw createError('PAL_DIALOG_EXPECT_DIRECTORY', `Expected directory path: ${normalizedDefault}`);
        }
      }
      return [normalizedDefault];
    }

    if (process.platform === 'darwin') {
      return this.openFileDarwin(options);
    }
    if (process.platform === 'linux') {
      return this.openFileLinux(options);
    }
    if (process.platform === 'win32') {
      return this.openFileWindows(options);
    }

    throw createError('PAL_DIALOG_UNSUPPORTED', 'Dialog openFile not supported on this platform');
  }

  public async saveFile(options?: DialogSaveOptions): Promise<string | null> {
    const normalizedDefault = options?.defaultPath ? path.resolve(options.defaultPath) : undefined;
    if (normalizedDefault) {
      await fs.mkdir(path.dirname(normalizedDefault), { recursive: true });
      return normalizedDefault;
    }

    if (process.platform === 'darwin') {
      return this.saveFileDarwin(options);
    }
    if (process.platform === 'linux') {
      return this.saveFileLinux(options);
    }
    if (process.platform === 'win32') {
      return this.saveFileWindows(options);
    }

    throw createError('PAL_DIALOG_UNSUPPORTED', 'Dialog saveFile not supported on this platform');
  }

  public async showMessage(options: DialogMessageOptions): Promise<number> {
    const title = options.title ?? 'Chips Host';
    if (process.platform === 'darwin') {
      const script = [`display dialog "${quoteAppleScript(options.message)}" with title "${quoteAppleScript(title)}" buttons {"OK"}`];
      await runCommand('osascript', script.flatMap((line) => ['-e', line]));
      return 0;
    }

    process.stdout.write(`[${title}] ${options.message}${options.detail ? `\n${options.detail}` : ''}\n`);
    return 0;
  }

  public async showConfirm(options: DialogMessageOptions): Promise<boolean> {
    const title = options.title ?? 'Chips Host';
    if (process.platform === 'darwin') {
      const script = [
        `display dialog "${quoteAppleScript(options.message)}" with title "${quoteAppleScript(title)}" buttons {"Cancel", "OK"} default button "OK"`
      ];
      try {
        const output = await runCommand('osascript', script.flatMap((line) => ['-e', line]));
        return output.includes('button returned:OK');
      } catch {
        return false;
      }
    }

    return true;
  }

  private async openFileDarwin(options?: DialogFileOptions): Promise<string[] | null> {
    const allowMultiple = options?.allowMultiple ?? false;
    const mode = options?.mode ?? 'file';
    const title = quoteAppleScript(options?.title ?? 'Select item');

    const selectionExpr = mode === 'directory' ? 'choose folder' : 'choose file';
    const script = allowMultiple
      ? [
          `set selectedItems to ${selectionExpr} with prompt "${title}" with multiple selections allowed true`,
          'set output to ""',
          'repeat with itemPath in selectedItems',
          'set output to output & POSIX path of itemPath & linefeed',
          'end repeat',
          'return output'
        ]
      : [`POSIX path of (${selectionExpr} with prompt "${title}")`];

    try {
      const raw = await runCommand('osascript', script.flatMap((line) => ['-e', line]));
      const paths = raw.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      return paths.length > 0 ? paths : null;
    } catch {
      return null;
    }
  }

  private async openFileLinux(options?: DialogFileOptions): Promise<string[] | null> {
    if (!(await commandExists('zenity'))) {
      throw createError('PAL_DIALOG_UNSUPPORTED', 'zenity is required for dialog support on Linux');
    }

    const args = ['--file-selection'];
    if (options?.mode === 'directory') {
      args.push('--directory');
    }
    if (options?.allowMultiple) {
      args.push('--multiple', '--separator=\n');
    }
    if (options?.title) {
      args.push(`--title=${options.title}`);
    }

    try {
      const raw = await runCommand('zenity', args);
      const paths = raw.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      return paths.length > 0 ? paths : null;
    } catch {
      return null;
    }
  }

  private async openFileWindows(options?: DialogFileOptions): Promise<string[] | null> {
    const multiple = options?.allowMultiple ? '$dialog.Multiselect = $true;' : '';
    const directoryMode = options?.mode === 'directory';
    const script = directoryMode
      ? [
          'Add-Type -AssemblyName System.Windows.Forms;',
          '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;',
          '$result = $dialog.ShowDialog();',
          'if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }'
        ]
      : [
          'Add-Type -AssemblyName System.Windows.Forms;',
          '$dialog = New-Object System.Windows.Forms.OpenFileDialog;',
          multiple,
          '$result = $dialog.ShowDialog();',
          'if ($result -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.FileNames | ForEach-Object { Write-Output $_ } }'
        ];

    try {
      const raw = await runCommand('powershell', ['-NoProfile', '-Command', script.join(' ')]);
      const paths = raw.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      return paths.length > 0 ? paths : null;
    } catch {
      return null;
    }
  }

  private async saveFileDarwin(options?: DialogSaveOptions): Promise<string | null> {
    const title = quoteAppleScript(options?.title ?? 'Save file');
    const script = [`POSIX path of (choose file name with prompt "${title}")`];
    try {
      const result = await runCommand('osascript', script.flatMap((line) => ['-e', line]));
      const normalized = result.trim();
      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  }

  private async saveFileLinux(options?: DialogSaveOptions): Promise<string | null> {
    if (!(await commandExists('zenity'))) {
      throw createError('PAL_DIALOG_UNSUPPORTED', 'zenity is required for dialog support on Linux');
    }

    const args = ['--file-selection', '--save', '--confirm-overwrite'];
    if (options?.title) {
      args.push(`--title=${options.title}`);
    }

    try {
      const result = await runCommand('zenity', args);
      const normalized = result.trim();
      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  }

  private async saveFileWindows(options?: DialogSaveOptions): Promise<string | null> {
    const script = [
      'Add-Type -AssemblyName System.Windows.Forms;',
      '$dialog = New-Object System.Windows.Forms.SaveFileDialog;',
      options?.title ? `$dialog.Title = "${options.title.replaceAll('"', '`"')}";` : '',
      '$result = $dialog.ShowDialog();',
      'if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.FileName }'
    ]
      .filter(Boolean)
      .join(' ');

    try {
      const result = await runCommand('powershell', ['-NoProfile', '-Command', script]);
      const normalized = result.trim();
      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  }
}

class NodeClipboard implements PALClipboard {
  public async read(format: 'text' = 'text'): Promise<string> {
    if (format !== 'text') {
      throw createError('PAL_CLIPBOARD_UNSUPPORTED_FORMAT', `Unsupported clipboard format: ${format}`);
    }

    if (process.platform === 'darwin') {
      return runCommand('pbpaste', []);
    }

    if (process.platform === 'win32') {
      return runCommand('powershell', ['-NoProfile', '-Command', 'Get-Clipboard']);
    }

    if (await commandExists('wl-paste')) {
      return runCommand('wl-paste', ['--no-newline']);
    }
    if (await commandExists('xclip')) {
      return runCommand('xclip', ['-selection', 'clipboard', '-o']);
    }
    if (await commandExists('xsel')) {
      return runCommand('xsel', ['--clipboard', '--output']);
    }

    throw createError('PAL_CLIPBOARD_UNSUPPORTED', 'Clipboard read requires pbpaste, powershell, wl-paste, xclip, or xsel');
  }

  public async write(data: string, format: 'text' = 'text'): Promise<void> {
    if (format !== 'text') {
      throw createError('PAL_CLIPBOARD_UNSUPPORTED_FORMAT', `Unsupported clipboard format: ${format}`);
    }

    if (process.platform === 'darwin') {
      await runCommand('pbcopy', [], data);
      return;
    }

    if (process.platform === 'win32') {
      const escaped = data.replaceAll('"', '`"');
      await runCommand('powershell', ['-NoProfile', '-Command', `Set-Clipboard -Value "${escaped}"`]);
      return;
    }

    if (await commandExists('wl-copy')) {
      await runCommand('wl-copy', [], data);
      return;
    }
    if (await commandExists('xclip')) {
      await runCommand('xclip', ['-selection', 'clipboard'], data);
      return;
    }
    if (await commandExists('xsel')) {
      await runCommand('xsel', ['--clipboard', '--input'], data);
      return;
    }

    throw createError('PAL_CLIPBOARD_UNSUPPORTED', 'Clipboard write requires pbcopy, powershell, wl-copy, xclip, or xsel');
  }
}

class NodeShell implements PALShell {
  public async openPath(targetPath: string): Promise<void> {
    const resolved = path.resolve(targetPath);
    if (process.platform === 'darwin') {
      await runCommand('open', [resolved]);
      return;
    }
    if (process.platform === 'win32') {
      await runCommand('explorer', [resolved]);
      return;
    }
    await runCommand('xdg-open', [resolved]);
  }

  public async openExternal(url: string): Promise<void> {
    if (process.platform === 'darwin') {
      await runCommand('open', [url]);
      return;
    }
    if (process.platform === 'win32') {
      await runCommand('cmd', ['/c', 'start', '', url]);
      return;
    }
    await runCommand('xdg-open', [url]);
  }

  public async showItemInFolder(targetPath: string): Promise<void> {
    const resolved = path.resolve(targetPath);
    if (process.platform === 'darwin') {
      await runCommand('open', ['-R', resolved]);
      return;
    }
    if (process.platform === 'win32') {
      await runCommand('explorer', ['/select,', resolved]);
      return;
    }
    await runCommand('xdg-open', [path.dirname(resolved)]);
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
    return ['window', 'file', 'dialog', 'clipboard', 'shell', 'tray', 'power', 'shortcut', 'ipc'];
  }
}

export class NodePalAdapter implements PALAdapter {
  public readonly window: PALWindow = new NodeWindowManager();
  public readonly fs: PALFileSystem = new NodeFileSystem();
  public readonly dialog: PALDialog = new NodeDialog();
  public readonly clipboard: PALClipboard = new NodeClipboard();
  public readonly shell: PALShell = new NodeShell();
  public readonly platform: PALPlatform = new NodePlatform();
}

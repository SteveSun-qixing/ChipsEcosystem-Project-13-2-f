import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createError } from '../../../src/shared/errors';
import {
  loadElectronModule,
  type ElectronBrowserWindowCtorLike,
  type ElectronBrowserWindowLike
} from '../../../src/main/electron/electron-loader';
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
  PALNotification,
  PALPlatform,
  PALPower,
  PALShell,
  PALShortcut,
  PALTray,
  PALWindow,
  NotificationOptions,
  PowerState,
  TrayOptions,
  TrayState,
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
  private readonly electronWindows = new Map<string, ElectronBrowserWindowLike>();
  private readonly electronBrowserWindow?: ElectronBrowserWindowCtorLike;

  public constructor() {
    const electron = loadElectronModule();
    this.electronBrowserWindow = electron?.BrowserWindow;
  }

  public async create(options: WindowOptions): Promise<WindowState> {
    const id = createId();
    const title = options.title;
    const width = options.width;
    const height = options.height;
    const state: WindowState = {
      id,
      title,
      width,
      height,
      focused: false,
      state: 'normal',
      url: options.url,
      pluginId: options.pluginId,
      sessionId: options.sessionId
    };

    if (this.electronBrowserWindow) {
      const browserWindow = new this.electronBrowserWindow({
        title,
        width,
        height,
        resizable: options.resizable ?? true,
        alwaysOnTop: options.alwaysOnTop ?? false,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      this.electronWindows.set(id, browserWindow);
      browserWindow.on('closed', () => {
        this.electronWindows.delete(id);
        this.windows.delete(id);
      });
      await this.loadWindowContent(browserWindow, options.url);
      state.focused = browserWindow.isFocused();
      state.state = this.resolveWindowState(browserWindow);
    }

    this.windows.set(id, state);
    return state;
  }

  public async focus(id: string): Promise<void> {
    const target = this.getWindowState(id);
    if (!target) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    const browserWindow = this.electronWindows.get(id);
    if (browserWindow && !browserWindow.isDestroyed()) {
      browserWindow.focus();
    }

    for (const value of this.windows.values()) {
      value.focused = false;
    }

    target.focused = true;
  }

  public async resize(id: string, width: number, height: number): Promise<void> {
    const target = this.getWindowState(id);
    if (!target) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    const browserWindow = this.electronWindows.get(id);
    if (browserWindow && !browserWindow.isDestroyed()) {
      browserWindow.setSize(width, height);
    }

    target.width = width;
    target.height = height;
  }

  public async setState(id: string, state: WindowState['state']): Promise<void> {
    const target = this.getWindowState(id);
    if (!target) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    const browserWindow = this.electronWindows.get(id);
    if (browserWindow && !browserWindow.isDestroyed()) {
      if (state === 'minimized') {
        browserWindow.minimize();
      } else if (state === 'maximized') {
        browserWindow.maximize();
      } else if (state === 'fullscreen') {
        browserWindow.setFullScreen(true);
      } else {
        browserWindow.setFullScreen(false);
        browserWindow.restore();
      }
    }

    target.state = state;
  }

  public async getState(id: string): Promise<WindowState> {
    const target = this.getWindowState(id);
    if (!target) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    const browserWindow = this.electronWindows.get(id);
    if (browserWindow && !browserWindow.isDestroyed()) {
      const bounds = browserWindow.getBounds();
      target.width = bounds.width;
      target.height = bounds.height;
      target.focused = browserWindow.isFocused();
      target.state = this.resolveWindowState(browserWindow);
    }

    return { ...target };
  }

  public async close(id: string): Promise<void> {
    const target = this.getWindowState(id);
    if (!target) {
      throw createError('PAL_WINDOW_NOT_FOUND', `Window not found: ${id}`);
    }

    const browserWindow = this.electronWindows.get(id);
    if (browserWindow && !browserWindow.isDestroyed()) {
      browserWindow.close();
      this.electronWindows.delete(id);
    }

    this.windows.delete(id);
  }

  private getWindowState(id: string): WindowState | undefined {
    return this.windows.get(id);
  }

  private resolveWindowState(window: ElectronBrowserWindowLike): WindowState['state'] {
    if (window.isFullScreen()) {
      return 'fullscreen';
    }
    if (window.isMinimized()) {
      return 'minimized';
    }
    if (window.isMaximized()) {
      return 'maximized';
    }
    return 'normal';
  }

  private async loadWindowContent(window: ElectronBrowserWindowLike, url: string | undefined): Promise<void> {
    if (!url || url.length === 0) {
      return;
    }

    if (/^(https?:|file:|chips:)/i.test(url)) {
      await Promise.resolve(window.loadURL(url));
      return;
    }

    const normalizedPath = path.resolve(url);
    if (path.extname(normalizedPath).toLowerCase() === '.html') {
      await Promise.resolve(window.loadFile(normalizedPath));
      return;
    }

    await Promise.resolve(window.loadURL(`file://${normalizedPath}`));
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

class NodeTray implements PALTray {
  private readonly electron = loadElectronModule();
  private tray: { setImage(image: string): void; setToolTip(text: string): void; setContextMenu(menu: unknown): void; destroy(): void; isDestroyed?(): boolean } | null = null;
  private state: TrayState = { active: false };

  public async set(options: TrayOptions): Promise<TrayState> {
    this.state = {
      ...this.state,
      ...options,
      menu: options.menu ? [...options.menu] : this.state.menu,
      active: true
    };

    if (this.electron?.Tray) {
      if (!this.tray) {
        if (!options.icon) {
          throw createError('PAL_TRAY_ICON_REQUIRED', 'Tray icon is required when Electron tray is enabled');
        }
        this.tray = new this.electron.Tray(options.icon);
      } else if (options.icon) {
        this.tray.setImage(options.icon);
      }

      if (options.tooltip) {
        this.tray.setToolTip(options.tooltip);
      }

      if (options.menu && this.electron.Menu?.buildFromTemplate) {
        const menu = this.electron.Menu.buildFromTemplate(
          options.menu.map((item) => ({
            id: item.id,
            label: item.label
          }))
        );
        this.tray.setContextMenu(menu);
      }
    }

    return {
      ...this.state,
      menu: this.state.menu ? [...this.state.menu] : undefined
    };
  }

  public async clear(): Promise<void> {
    if (this.tray && !(this.tray.isDestroyed?.() ?? false)) {
      this.tray.destroy();
    }
    this.tray = null;
    this.state = { active: false };
  }

  public async getState(): Promise<TrayState> {
    return {
      ...this.state,
      menu: this.state.menu ? [...this.state.menu] : undefined
    };
  }
}

class NodeNotification implements PALNotification {
  private readonly electron = loadElectronModule();

  public async show(options: NotificationOptions): Promise<void> {
    if (this.electron?.Notification) {
      const notification = new this.electron.Notification({
        title: options.title,
        body: options.body,
        icon: options.icon,
        silent: options.silent ?? false
      });
      notification.show();
      return;
    }

    if (process.platform === 'darwin') {
      const title = quoteAppleScript(options.title);
      const body = quoteAppleScript(options.body);
      await runCommand('osascript', ['-e', `display notification "${body}" with title "${title}"`]);
      return;
    }

    if (process.platform === 'linux' && (await commandExists('notify-send'))) {
      await runCommand('notify-send', [options.title, options.body]);
      return;
    }

    process.stdout.write(`[notification] ${options.title}: ${options.body}\n`);
  }
}

class NodeShortcut implements PALShortcut {
  private readonly electron = loadElectronModule();
  private readonly callbacks = new Map<string, () => void>();

  public async register(accelerator: string, onTrigger?: () => void): Promise<boolean> {
    if (this.electron?.globalShortcut) {
      const registered = this.electron.globalShortcut.register(accelerator, () => {
        const callback = this.callbacks.get(accelerator);
        callback?.();
      });
      if (!registered) {
        return false;
      }
      if (onTrigger) {
        this.callbacks.set(accelerator, onTrigger);
      }
      return true;
    }

    if (onTrigger) {
      this.callbacks.set(accelerator, onTrigger);
    } else if (!this.callbacks.has(accelerator)) {
      this.callbacks.set(accelerator, () => {});
    }
    return true;
  }

  public async unregister(accelerator: string): Promise<void> {
    this.electron?.globalShortcut?.unregister(accelerator);
    this.callbacks.delete(accelerator);
  }

  public async isRegistered(accelerator: string): Promise<boolean> {
    if (this.electron?.globalShortcut) {
      return this.electron.globalShortcut.isRegistered(accelerator);
    }
    return this.callbacks.has(accelerator);
  }

  public async list(): Promise<string[]> {
    return [...this.callbacks.keys()];
  }

  public async clear(): Promise<void> {
    this.electron?.globalShortcut?.unregisterAll();
    this.callbacks.clear();
  }
}

class NodePower implements PALPower {
  private readonly electron = loadElectronModule();
  private blockerId: number | null = null;
  private preventSleep = false;

  public async getState(): Promise<PowerState> {
    const idleSeconds = this.electron?.powerMonitor?.getSystemIdleTime?.() ?? 0;
    return {
      idleSeconds,
      preventSleep: this.preventSleep
    };
  }

  public async setPreventSleep(prevent: boolean): Promise<boolean> {
    if (!prevent) {
      if (this.blockerId !== null && this.electron?.powerSaveBlocker?.isStarted(this.blockerId)) {
        this.electron.powerSaveBlocker.stop(this.blockerId);
      }
      this.blockerId = null;
      this.preventSleep = false;
      return false;
    }

    if (this.electron?.powerSaveBlocker) {
      if (this.blockerId !== null && this.electron.powerSaveBlocker.isStarted(this.blockerId)) {
        this.preventSleep = true;
        return true;
      }
      this.blockerId = this.electron.powerSaveBlocker.start('prevent-app-suspension');
    }

    this.preventSleep = true;
    return true;
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
    return ['window', 'file', 'dialog', 'clipboard', 'shell', 'tray', 'notification', 'power', 'shortcut', 'ipc'];
  }
}

export class NodePalAdapter implements PALAdapter {
  public readonly window: PALWindow = new NodeWindowManager();
  public readonly fs: PALFileSystem = new NodeFileSystem();
  public readonly dialog: PALDialog = new NodeDialog();
  public readonly clipboard: PALClipboard = new NodeClipboard();
  public readonly shell: PALShell = new NodeShell();
  public readonly platform: PALPlatform = new NodePlatform();
  public readonly tray: PALTray = new NodeTray();
  public readonly notification: PALNotification = new NodeNotification();
  public readonly shortcut: PALShortcut = new NodeShortcut();
  public readonly power: PALPower = new NodePower();
}

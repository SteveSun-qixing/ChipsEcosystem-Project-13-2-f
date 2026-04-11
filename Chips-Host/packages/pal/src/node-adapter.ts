import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createError } from '../../../src/shared/errors';
import {
  loadElectronModule,
  type ElectronBrowserWindowCtorLike,
  type ElectronBrowserWindowLike
} from '../../../src/main/electron/electron-loader';
import { createId } from '../../../src/shared/utils';
import type {
  ClipboardFormat,
  ClipboardImagePayload,
  ClipboardPayload,
  DialogFileOptions,
  DialogMessageOptions,
  DialogSaveOptions,
  FileWatchEvent,
  FileWatchSubscription,
  FileListOptions,
  FileReadOptions,
  HostKind,
  PALAssociation,
  PALAdapter,
  PALBackground,
  PALClipboard,
  PALDevice,
  PALDialog,
  PALEnvironment,
  PALFileSystem,
  PALIPC,
  PALLauncher,
  PALNotification,
  PALOffscreenRender,
  PALPlatform,
  PALPower,
  PALScreen,
  PALSelection,
  PALSurface,
  PALStorage,
  PALSystemUi,
  PALTransfer,
  PALIpcChannelInfo,
  PALIpcCreateOptions,
  PALIpcMessage,
  PALIpcReceiveOptions,
  PALIpcTransport,
  PalCapabilitySnapshot,
  PalPlatformId,
  PALShell,
  PALShortcut,
  PALTray,
  PALWindow,
  RenderHtmlToImageRequest,
  RenderHtmlToImageResult,
  RenderHtmlToPdfRequest,
  RenderHtmlToPdfResult,
  NotificationOptions,
  PowerState,
  ScreenInfo,
  SurfaceOpenRequest,
  SurfaceState,
  LauncherCreateOptions,
  LauncherLocation,
  LauncherRecord,
  TrayOptions,
  TrayState,
  WindowChromeOptions,
  WindowOptions,
  WindowState
} from './types';

const quoteAppleScript = (value: string): string => value.replaceAll('"', '\\"');
const quoteShellArg = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
const quotePowerShell = (value: string): string => value.replaceAll('`', '``').replaceAll('"', '`"');
const sanitizeLauncherName = (value: string): string => {
  const sanitized = value.replace(/[\\/:*?"<>|]/g, '-').trim();
  return sanitized.length > 0 ? sanitized : 'Chips App';
};

const cloneWindowChromeOptions = (chrome: WindowChromeOptions | undefined): WindowChromeOptions | undefined => {
  if (!chrome) {
    return undefined;
  }

  return {
    ...chrome,
    titleBarOverlay:
      chrome.titleBarOverlay && typeof chrome.titleBarOverlay === 'object'
        ? { ...chrome.titleBarOverlay }
        : chrome.titleBarOverlay
  };
};

const cloneWindowState = (state: WindowState): WindowState => {
  return {
    ...state,
    chrome: cloneWindowChromeOptions(state.chrome)
  };
};

const buildElectronWindowChromeOptions = (chrome: WindowChromeOptions | undefined): Record<string, unknown> => {
  if (!chrome) {
    return {};
  }

  const resolved: Record<string, unknown> = {};

  if (typeof chrome.frame === 'boolean') {
    resolved.frame = chrome.frame;
  }
  if (typeof chrome.transparent === 'boolean') {
    resolved.transparent = chrome.transparent;
  }
  if (typeof chrome.backgroundColor === 'string') {
    resolved.backgroundColor = chrome.backgroundColor;
  }
  if (typeof chrome.titleBarStyle === 'string') {
    resolved.titleBarStyle = chrome.titleBarStyle;
  }
  if (typeof chrome.titleBarOverlay !== 'undefined') {
    resolved.titleBarOverlay =
      chrome.titleBarOverlay && typeof chrome.titleBarOverlay === 'object'
        ? { ...chrome.titleBarOverlay }
        : chrome.titleBarOverlay;
  }

  return resolved;
};

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

const CHIPS_BRIDGE_CONTEXT_ARG_PREFIX = '--chips-bridge-context=';

interface WindowManagerOptions {
  electronPreloadPath?: string;
}

class NodeWindowManager implements PALWindow, PALSurface {
  private readonly windows = new Map<string, WindowState>();
  private readonly electronWindows = new Map<string, ElectronBrowserWindowLike>();
  private readonly electronBrowserWindow?: ElectronBrowserWindowCtorLike;
  private readonly electronPreloadPath?: string;

  public constructor(options?: WindowManagerOptions) {
    const electron = loadElectronModule();
    this.electronBrowserWindow = electron?.BrowserWindow;
    this.electronPreloadPath = options?.electronPreloadPath;
  }

  public async open(request: SurfaceOpenRequest): Promise<SurfaceState> {
    const target = request.target;
    const presentation = request.presentation ?? {};
    const requestedKind = request.kind ?? 'window';
    const created = await this.create({
      title:
        presentation.title ??
        (target.type === 'plugin'
          ? target.pluginId
          : target.type === 'document'
            ? target.title ?? target.documentId
            : target.url),
      width: presentation.width ?? 1280,
      height: presentation.height ?? 800,
      resizable: presentation.resizable,
      alwaysOnTop: presentation.alwaysOnTop,
      url:
        target.type === 'url'
          ? target.url
          : target.type === 'document'
            ? target.url ?? target.documentId
            : target.url,
      pluginId: target.type === 'plugin' ? target.pluginId : undefined,
      sessionId: target.type === 'plugin' ? target.sessionId : undefined,
      permissions: target.type === 'plugin' ? target.permissions : undefined,
      launchParams: target.type === 'plugin' ? target.launchParams : undefined,
      chrome: presentation.chrome
    });

    return {
      ...created,
      kind: 'window',
      metadata:
        requestedKind === 'window'
          ? undefined
          : {
              requestedKind,
              targetType: target.type
            }
    };
  }

  public async create(options: WindowOptions): Promise<WindowState> {
    const id = createId();
    const title = options.title;
    const width = options.width;
    const height = options.height;
    const state: WindowState = {
      id,
      kind: 'window',
      title,
      width,
      height,
      focused: false,
      state: 'normal',
      url: options.url,
      pluginId: options.pluginId,
      sessionId: options.sessionId,
      chrome: cloneWindowChromeOptions(options.chrome)
    };

    if (this.electronBrowserWindow) {
      const webPreferences: Record<string, unknown> = {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      };
      const additionalArguments = this.buildBridgeArguments(options);
      if (additionalArguments.length > 0) {
        webPreferences.additionalArguments = additionalArguments;
      }
      if (options.pluginId) {
        const preloadPath = this.resolveElectronPreloadPath();
        if (!preloadPath) {
          throw createError(
            'PAL_WINDOW_PRELOAD_MISSING',
            'Electron preload script is required for plugin windows',
            {
              pluginId: options.pluginId
            }
          );
        }
        webPreferences.preload = preloadPath;
      }
      const browserWindow = new this.electronBrowserWindow({
        title,
        width,
        height,
        resizable: options.resizable ?? true,
        alwaysOnTop: options.alwaysOnTop ?? false,
        show: true,
        ...buildElectronWindowChromeOptions(options.chrome),
        webPreferences
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
    return cloneWindowState(state);
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

    return {
      ...target,
      chrome: cloneWindowChromeOptions(target.chrome)
    };
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

  public async list(): Promise<WindowState[]> {
    return [...this.windows.values()].map((state) => cloneWindowState(state));
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

  private resolveElectronPreloadPath(): string | undefined {
    if (!this.electronPreloadPath || this.electronPreloadPath.length === 0) {
      return undefined;
    }

    const normalizedPath = path.resolve(this.electronPreloadPath);
    if (!fsSync.existsSync(normalizedPath)) {
      throw createError('PAL_WINDOW_PRELOAD_NOT_FOUND', `Electron preload not found: ${normalizedPath}`, {
        preloadPath: normalizedPath
      });
    }
    return normalizedPath;
  }

  private buildBridgeArguments(options: WindowOptions): string[] {
    if (!options.pluginId) {
      return [];
    }

    const payload = {
      pluginId: options.pluginId,
      permissions: options.permissions ?? [],
      sessionId: options.sessionId,
      launchParams: options.launchParams ?? {}
    };

    return [
      `${CHIPS_BRIDGE_CONTEXT_ARG_PREFIX}${Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url')}`
    ];
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

  public async watch(inputPath: string, onEvent: (event: FileWatchEvent) => void): Promise<FileWatchSubscription> {
    const normalizedPath = this.normalize(inputPath);
    const watchId = createId();

    let watcher: fsSync.FSWatcher;
    try {
      watcher = fsSync.watch(normalizedPath, { persistent: false }, (eventType, filename) => {
        const resolvedPath =
          typeof filename === 'string' && filename.length > 0
            ? path.join(path.dirname(normalizedPath), filename)
            : normalizedPath;
        onEvent({
          type: eventType === 'rename' ? 'rename' : 'change',
          path: resolvedPath,
          timestamp: Date.now()
        });
      });
    } catch (error) {
      throw createError('PAL_FS_WATCH_FAILED', `Unable to watch path: ${normalizedPath}`, {
        path: normalizedPath,
        reason: String(error)
      });
    }

    return {
      id: watchId,
      close: async () => {
        watcher.close();
      }
    };
  }

  public async mkdir(inputPath: string, options?: { recursive?: boolean }): Promise<void> {
    const normalizedPath = this.normalize(inputPath);
    await fs.mkdir(normalizedPath, { recursive: options?.recursive ?? false });
  }

  public async delete(inputPath: string, options?: { recursive?: boolean }): Promise<void> {
    const normalizedPath = this.normalize(inputPath);
    const stats = await fs.stat(normalizedPath);
    if (stats.isDirectory()) {
      await fs.rm(normalizedPath, { recursive: options?.recursive ?? false });
    } else {
      await fs.unlink(normalizedPath);
    }
  }

  public async move(sourcePath: string, destPath: string): Promise<void> {
    const normalizedSource = this.normalize(sourcePath);
    const normalizedDest = this.normalize(destPath);
    await fs.rename(normalizedSource, normalizedDest);
  }

  public async copy(sourcePath: string, destPath: string): Promise<void> {
    const normalizedSource = this.normalize(sourcePath);
    const normalizedDest = this.normalize(destPath);
    const stats = await fs.stat(normalizedSource);
    if (stats.isDirectory()) {
      await this.copyDirectory(normalizedSource, normalizedDest);
    } else {
      await fs.copyFile(normalizedSource, normalizedDest);
    }
  }

  private async copyDirectory(sourcePath: string, destPath: string): Promise<void> {
    await fs.mkdir(destPath, { recursive: true });
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      const src = path.join(sourcePath, entry.name);
      const dest = path.join(destPath, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirectory(src, dest);
      } else {
        await fs.copyFile(src, dest);
      }
    }
  }
}

class NodeDialog implements PALDialog {
  private readonly electron = loadElectronModule();

  public async openFile(options?: DialogFileOptions): Promise<string[] | null> {
    const normalizedDefault = options?.defaultPath ? path.resolve(options.defaultPath) : undefined;
    if (this.electron?.dialog?.showOpenDialog) {
      const properties = [options?.mode === 'directory' ? 'openDirectory' : 'openFile'];
      if (options?.allowMultiple) {
        properties.push('multiSelections');
      }
      const result = await this.electron.dialog.showOpenDialog({
        title: options?.title,
        defaultPath: normalizedDefault,
        properties
      });
      const filePaths = Array.isArray(result.filePaths)
        ? result.filePaths.map((item) => path.resolve(item)).filter(Boolean)
        : [];
      return result.canceled === true || filePaths.length === 0 ? null : filePaths;
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
    if (this.electron?.dialog?.showSaveDialog) {
      const result = await this.electron.dialog.showSaveDialog({
        title: options?.title,
        defaultPath: normalizedDefault
      });
      if (result.canceled === true) {
        return null;
      }
      const filePath = typeof result.filePath === 'string' ? result.filePath.trim() : '';
      return filePath.length > 0 ? path.resolve(filePath) : null;
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
    const defaultLocation = await this.resolveOpenDialogLocation(options?.defaultPath);
    const defaultLocationArg = defaultLocation
      ? ` default location POSIX file "${quoteAppleScript(defaultLocation)}"`
      : '';

    const selectionExpr = mode === 'directory' ? 'choose folder' : 'choose file';
    const script = allowMultiple
      ? [
          `set selectedItems to ${selectionExpr} with prompt "${title}"${defaultLocationArg} with multiple selections allowed true`,
          'set output to ""',
          'repeat with itemPath in selectedItems',
          'set output to output & POSIX path of itemPath & linefeed',
          'end repeat',
          'return output'
        ]
      : [`POSIX path of (${selectionExpr} with prompt "${title}"${defaultLocationArg})`];

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
    if (options?.defaultPath) {
      args.push(`--filename=${path.resolve(options.defaultPath)}`);
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
    const normalizedDefault = options?.defaultPath ? path.resolve(options.defaultPath) : undefined;
    const defaultDirectory = normalizedDefault ? path.dirname(normalizedDefault) : undefined;
    const defaultName = normalizedDefault ? path.basename(normalizedDefault) : undefined;
    const script = directoryMode
      ? [
          'Add-Type -AssemblyName System.Windows.Forms;',
          '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;',
          normalizedDefault ? `$dialog.SelectedPath = "${quotePowerShell(normalizedDefault)}";` : '',
          '$result = $dialog.ShowDialog();',
          'if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }'
        ]
      : [
          'Add-Type -AssemblyName System.Windows.Forms;',
          '$dialog = New-Object System.Windows.Forms.OpenFileDialog;',
          defaultDirectory ? `$dialog.InitialDirectory = "${quotePowerShell(defaultDirectory)}";` : '',
          defaultName ? `$dialog.FileName = "${quotePowerShell(defaultName)}";` : '',
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
    const normalizedDefault = options?.defaultPath ? path.resolve(options.defaultPath) : undefined;
    const defaultDirectory = normalizedDefault ? path.dirname(normalizedDefault) : undefined;
    const defaultName = normalizedDefault ? path.basename(normalizedDefault) : undefined;
    const defaultLocationArg = defaultDirectory
      ? ` default location POSIX file "${quoteAppleScript(defaultDirectory)}"`
      : '';
    const defaultNameArg = defaultName ? ` default name "${quoteAppleScript(defaultName)}"` : '';
    const script = [
      `POSIX path of (choose file name with prompt "${title}"${defaultLocationArg}${defaultNameArg})`
    ];
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
    if (options?.defaultPath) {
      args.push(`--filename=${path.resolve(options.defaultPath)}`);
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
    const normalizedDefault = options?.defaultPath ? path.resolve(options.defaultPath) : undefined;
    const defaultDirectory = normalizedDefault ? path.dirname(normalizedDefault) : undefined;
    const defaultName = normalizedDefault ? path.basename(normalizedDefault) : undefined;
    const script = [
      'Add-Type -AssemblyName System.Windows.Forms;',
      '$dialog = New-Object System.Windows.Forms.SaveFileDialog;',
      options?.title ? `$dialog.Title = "${quotePowerShell(options.title)}";` : '',
      defaultDirectory ? `$dialog.InitialDirectory = "${quotePowerShell(defaultDirectory)}";` : '',
      defaultName ? `$dialog.FileName = "${quotePowerShell(defaultName)}";` : '',
      '$dialog.OverwritePrompt = $true;',
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

  private async resolveOpenDialogLocation(defaultPath?: string): Promise<string | undefined> {
    if (!defaultPath) {
      return undefined;
    }

    const normalized = path.resolve(defaultPath);
    const stats = await statSafe(normalized);
    if (stats?.isDirectory) {
      return normalized;
    }

    const parentDirectory = path.dirname(normalized);
    const parentStats = await statSafe(parentDirectory);
    return parentStats?.isDirectory ? parentDirectory : undefined;
  }
}

class NodeClipboard implements PALClipboard {
  private static readonly filesBufferFormat = 'chips/files';
  private readonly electron = loadElectronModule();

  public async read(format: ClipboardFormat = 'text'): Promise<ClipboardPayload> {
    if (this.electron?.clipboard) {
      if (format === 'text') {
        return this.electron.clipboard.readText();
      }

      if (format === 'image') {
        const image = this.electron.clipboard.readImage();
        const png = image.toPNG();
        return {
          base64: png.toString('base64'),
          mimeType: 'image/png'
        };
      }

      const raw = this.electron.clipboard.readBuffer(NodeClipboard.filesBufferFormat);
      if (raw.length > 0) {
        try {
          const parsed = JSON.parse(raw.toString('utf-8'));
          return NodeClipboard.asFileList(parsed);
        } catch {
          throw createError('PAL_CLIPBOARD_FILE_LIST_INVALID', 'Clipboard file list is corrupted');
        }
      }

      const text = this.electron.clipboard.readText();
      const files: string[] = [];
      for (const candidate of text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
        const stats = await statSafe(candidate);
        if (stats) {
          files.push(path.resolve(candidate));
        }
      }
      return files;
    }

    if (format !== 'text') {
      throw createError('PAL_CLIPBOARD_UNSUPPORTED_FORMAT', `Unsupported clipboard format without Electron runtime: ${format}`);
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

  public async write(data: ClipboardPayload, format: ClipboardFormat = 'text'): Promise<void> {
    if (this.electron?.clipboard) {
      if (format === 'text') {
        if (typeof data !== 'string') {
          throw createError('PAL_CLIPBOARD_INVALID_PAYLOAD', 'Text clipboard data must be a string');
        }
        this.electron.clipboard.writeText(data);
        return;
      }

      if (format === 'image') {
        const payload = NodeClipboard.asImagePayload(data);
        if (!this.electron.nativeImage) {
          throw createError('PAL_CLIPBOARD_UNSUPPORTED', 'Electron nativeImage is required for image clipboard writes');
        }
        const image = this.electron.nativeImage.createFromBuffer(Buffer.from(payload.base64, 'base64'));
        this.electron.clipboard.writeImage(image);
        return;
      }

      const files = NodeClipboard.asFileList(data).map((item) => path.resolve(item));
      this.electron.clipboard.writeBuffer(NodeClipboard.filesBufferFormat, Buffer.from(JSON.stringify(files), 'utf-8'));
      this.electron.clipboard.writeText(files.join(os.EOL));
      return;
    }

    if (format !== 'text') {
      throw createError('PAL_CLIPBOARD_UNSUPPORTED_FORMAT', `Unsupported clipboard format without Electron runtime: ${format}`);
    }

    if (typeof data !== 'string') {
      throw createError('PAL_CLIPBOARD_INVALID_PAYLOAD', 'Text clipboard data must be a string');
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

  private static asImagePayload(data: ClipboardPayload): ClipboardImagePayload {
    if (!data || typeof data !== 'object') {
      throw createError('PAL_CLIPBOARD_INVALID_PAYLOAD', 'Image clipboard payload must be object');
    }
    const candidate = data as unknown as Record<string, unknown>;
    if (typeof candidate.base64 !== 'string' || candidate.base64.length === 0) {
      throw createError('PAL_CLIPBOARD_INVALID_PAYLOAD', 'Image clipboard payload requires base64');
    }
    return {
      base64: candidate.base64,
      mimeType: typeof candidate.mimeType === 'string' ? candidate.mimeType : undefined
    };
  }

  private static asFileList(data: unknown): string[] {
    if (!Array.isArray(data)) {
      throw createError('PAL_CLIPBOARD_INVALID_PAYLOAD', 'Files clipboard payload must be string[]');
    }
    const files = data.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length > 0);
    if (files.length !== data.length) {
      throw createError('PAL_CLIPBOARD_INVALID_PAYLOAD', 'Files clipboard payload must contain only non-empty strings');
    }
    return files;
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

class NodeLauncher implements PALLauncher {
  public async getDefaultPath(name: string): Promise<{ launcherPath: string; location: LauncherLocation }> {
    const normalizedName = sanitizeLauncherName(name);
    if (process.platform === 'win32') {
      const desktopDir = await this.resolveWindowsDesktopDir();
      return {
        launcherPath: path.join(desktopDir, `${normalizedName}.lnk`),
        location: 'desktop'
      };
    }

    if (process.platform === 'darwin') {
      const applicationsDir = path.join(os.homedir(), 'Applications', 'Chips Apps');
      return {
        launcherPath: path.join(applicationsDir, `${normalizedName}.app`),
        location: 'launchpad'
      };
    }

    return {
      launcherPath: path.join(os.homedir(), 'Desktop', `${normalizedName}.desktop`),
      location: 'desktop'
    };
  }

  public async create(options: LauncherCreateOptions & { launcherPath?: string }): Promise<LauncherRecord> {
    const target = options.launcherPath ? await this.resolveExplicitTarget(options.launcherPath) : await this.getDefaultPath(options.name);

    if (process.platform === 'win32') {
      await this.createWindowsLauncher(target.launcherPath, options);
    } else if (process.platform === 'darwin') {
      await this.createDarwinLauncher(target.launcherPath, options);
    } else {
      await this.createFreedesktopLauncher(target.launcherPath, options);
    }

    return this.getRecord({
      pluginId: options.pluginId,
      name: options.name,
      launcherPath: target.launcherPath
    });
  }

  public async getRecord(options: { pluginId: string; name: string; launcherPath?: string }): Promise<LauncherRecord> {
    const target = options.launcherPath ? await this.resolveExplicitTarget(options.launcherPath) : await this.getDefaultPath(options.name);
    const iconPath = await this.resolveExistingIconPath(target.launcherPath);

    return {
      pluginId: options.pluginId,
      name: options.name,
      location: target.location,
      launcherPath: target.launcherPath,
      executablePath: '',
      args: [],
      iconPath
    };
  }

  public async remove(options: {
    pluginId: string;
    name: string;
    launcherPath?: string;
  }): Promise<{ removed: boolean; launcherPath: string; location: LauncherLocation }> {
    const target = options.launcherPath ? await this.resolveExplicitTarget(options.launcherPath) : await this.getDefaultPath(options.name);
    const existing = await statSafe(target.launcherPath);
    if (!existing) {
      return {
        removed: false,
        launcherPath: target.launcherPath,
        location: target.location
      };
    }

    await fs.rm(target.launcherPath, { recursive: true, force: true });
    return {
      removed: true,
      launcherPath: target.launcherPath,
      location: target.location
    };
  }

  private async resolveExplicitTarget(launcherPath: string): Promise<{ launcherPath: string; location: LauncherLocation }> {
    const normalizedPath = path.resolve(launcherPath);
    return {
      launcherPath: normalizedPath,
      location: process.platform === 'darwin' ? 'launchpad' : 'desktop'
    };
  }

  private async resolveWindowsDesktopDir(): Promise<string> {
    const preferred = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'Desktop') : path.join(os.homedir(), 'Desktop');
    if (await statSafe(preferred)) {
      return preferred;
    }

    try {
      const result = await runCommand('powershell', [
        '-NoProfile',
        '-Command',
        '[Environment]::GetFolderPath("Desktop")'
      ]);
      const resolved = result.trim();
      if (resolved.length > 0) {
        return resolved;
      }
    } catch {
      // ignore and fall back to home desktop path
    }

    return preferred;
  }

  private async createWindowsLauncher(launcherPath: string, options: LauncherCreateOptions): Promise<void> {
    await fs.mkdir(path.dirname(launcherPath), { recursive: true });
    const argumentsLiteral = options.args
      .map((item) => (/\s/.test(item) ? `"${item.replaceAll('"', '`"')}"` : item.replaceAll('"', '`"')))
      .join(' ');
    const iconLiteral = options.iconPath ? `\n$shortcut.IconLocation = "${options.iconPath.replaceAll('"', '`"')}";` : '';
    const script = [
      '$wshell = New-Object -ComObject WScript.Shell;',
      `$shortcut = $wshell.CreateShortcut("${launcherPath.replaceAll('"', '`"')}");`,
      `$shortcut.TargetPath = "${options.executablePath.replaceAll('"', '`"')}";`,
      `$shortcut.Arguments = "${argumentsLiteral.replaceAll('"', '`"')}";`,
      `$shortcut.WorkingDirectory = "${path.dirname(options.executablePath).replaceAll('"', '`"')}";`,
      `$shortcut.Description = "${options.name.replaceAll('"', '`"')}";`,
      iconLiteral,
      '$shortcut.Save();'
    ]
      .filter(Boolean)
      .join(' ');

    await runCommand('powershell', ['-NoProfile', '-Command', script]);
  }

  private async createDarwinLauncher(launcherPath: string, options: LauncherCreateOptions): Promise<void> {
    const appName = path.basename(launcherPath, '.app');
    const contentsDir = path.join(launcherPath, 'Contents');
    const macOSDir = path.join(contentsDir, 'MacOS');
    const resourcesDir = path.join(contentsDir, 'Resources');
    const executableName = sanitizeLauncherName(appName).replace(/\s+/g, '-');
    const executablePath = path.join(macOSDir, executableName);
    const bundleId = `chips.launcher.${options.pluginId.replace(/[^a-zA-Z0-9.-]/g, '-')}`;

    await fs.rm(launcherPath, { recursive: true, force: true });
    await fs.mkdir(macOSDir, { recursive: true });
    await fs.mkdir(resourcesDir, { recursive: true });

    let iconFileName = '';
    if (options.iconPath) {
      const copiedIcon = await this.materializeDarwinIcon(options.iconPath, resourcesDir);
      if (copiedIcon) {
        iconFileName = copiedIcon;
      }
    }

    const infoPlist = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      '<dict>',
      '  <key>CFBundleDevelopmentRegion</key>',
      '  <string>zh_CN</string>',
      '  <key>CFBundleExecutable</key>',
      `  <string>${executableName}</string>`,
      '  <key>CFBundleIdentifier</key>',
      `  <string>${bundleId}</string>`,
      '  <key>CFBundleName</key>',
      `  <string>${appName}</string>`,
      '  <key>CFBundlePackageType</key>',
      '  <string>APPL</string>',
      '  <key>CFBundleVersion</key>',
      '  <string>1</string>',
      '  <key>LSApplicationCategoryType</key>',
      '  <string>public.app-category.productivity</string>',
      iconFileName ? '  <key>CFBundleIconFile</key>' : '',
      iconFileName ? `  <string>${iconFileName}</string>` : '',
      '</dict>',
      '</plist>',
      ''
    ]
      .filter(Boolean)
      .join('\n');
    await fs.writeFile(path.join(contentsDir, 'Info.plist'), infoPlist, 'utf-8');

    const commandArgs = [options.executablePath, ...options.args].map((item) => quoteShellArg(item)).join(' ');
    const shellScript = [
      '#!/bin/sh',
      `exec ${commandArgs} >/dev/null 2>&1 &`,
      ''
    ].join('\n');
    await fs.writeFile(executablePath, shellScript, 'utf-8');
    await fs.chmod(executablePath, 0o755);
  }

  private async createFreedesktopLauncher(launcherPath: string, options: LauncherCreateOptions): Promise<void> {
    await fs.mkdir(path.dirname(launcherPath), { recursive: true });
    const desktopEntry = [
      '[Desktop Entry]',
      'Type=Application',
      `Name=${options.name}`,
      `Exec=${[options.executablePath, ...options.args].map((item) => quoteShellArg(item)).join(' ')}`,
      options.iconPath ? `Icon=${options.iconPath}` : '',
      'Terminal=false',
      ''
    ]
      .filter(Boolean)
      .join('\n');
    await fs.writeFile(launcherPath, desktopEntry, 'utf-8');
    await fs.chmod(launcherPath, 0o755);
  }

  private async materializeDarwinIcon(sourcePath: string, resourcesDir: string): Promise<string | null> {
    const normalizedSource = path.resolve(sourcePath);
    const extension = path.extname(normalizedSource).toLowerCase();
    if (extension === '.icns') {
      const targetName = 'AppIcon.icns';
      await fs.copyFile(normalizedSource, path.join(resourcesDir, targetName));
      return targetName;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-iconset-'));
    try {
      const iconsetDir = path.join(tempDir, 'AppIcon.iconset');
      await fs.mkdir(iconsetDir, { recursive: true });
      const pngPath = path.join(tempDir, 'AppIcon.png');

      await runCommand('sips', ['-s', 'format', 'png', normalizedSource, '--out', pngPath]);

      const sizes = [
        ['icon_16x16.png', '16'],
        ['icon_16x16@2x.png', '32'],
        ['icon_32x32.png', '32'],
        ['icon_32x32@2x.png', '64'],
        ['icon_128x128.png', '128'],
        ['icon_128x128@2x.png', '256'],
        ['icon_256x256.png', '256'],
        ['icon_256x256@2x.png', '512'],
        ['icon_512x512.png', '512'],
        ['icon_512x512@2x.png', '1024']
      ] as const;

      for (const [fileName, size] of sizes) {
        await runCommand('sips', ['-z', size, size, pngPath, '--out', path.join(iconsetDir, fileName)]);
      }

      const targetName = 'AppIcon.icns';
      await runCommand('iconutil', ['-c', 'icns', iconsetDir, '-o', path.join(resourcesDir, targetName)]);
      return targetName;
    } catch {
      return null;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private async resolveExistingIconPath(launcherPath: string): Promise<string | undefined> {
    if (process.platform === 'darwin') {
      const iconPath = path.join(launcherPath, 'Contents', 'Resources', 'AppIcon.icns');
      const existing = await statSafe(iconPath);
      return existing?.isFile ? iconPath : undefined;
    }

    return undefined;
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

const buildDesktopCapabilitySnapshot = (): PalCapabilitySnapshot => {
  return {
    hostKind: 'desktop',
    platform: process.platform,
    facets: {
      surface: {
        supported: true,
        interactive: true,
        supportedKinds: ['window']
      },
      storage: {
        localWorkspace: true,
        sandboxFilePicker: false,
        remoteBacked: false
      },
      selection: {
        openFile: true,
        saveFile: true,
        directory: true,
        multiple: true
      },
      transfer: {
        upload: false,
        download: true,
        share: false,
        externalOpen: true,
        revealInShell: true
      },
      association: {
        fileAssociation: true,
        urlScheme: true,
        shareTarget: false
      },
      device: {
        screen: true,
        power: true,
        network: false
      },
      systemUi: {
        clipboard: true,
        tray: true,
        globalShortcut: true,
        notification: true
      },
      background: {
        keepAlive: true,
        wakeEvents: true
      },
      ipc: {
        namedPipe: true,
        unixSocket: process.platform !== 'win32',
        sharedMemory: true
      },
      offscreenRender: {
        htmlToPdf: true,
        htmlToImage: true
      }
    }
  };
};

const buildHeadlessCapabilitySnapshot = (): PalCapabilitySnapshot => {
  return {
    hostKind: 'headless',
    platform: 'server',
    facets: {
      surface: {
        supported: false,
        interactive: false,
        supportedKinds: []
      },
      storage: {
        localWorkspace: true,
        sandboxFilePicker: false,
        remoteBacked: false
      },
      selection: {
        openFile: false,
        saveFile: false,
        directory: false,
        multiple: false
      },
      transfer: {
        upload: false,
        download: false,
        share: false,
        externalOpen: false,
        revealInShell: false
      },
      association: {
        fileAssociation: false,
        urlScheme: false,
        shareTarget: false
      },
      device: {
        screen: false,
        power: true,
        network: false
      },
      systemUi: {
        clipboard: false,
        tray: false,
        globalShortcut: false,
        notification: false
      },
      background: {
        keepAlive: true,
        wakeEvents: false
      },
      ipc: {
        namedPipe: true,
        unixSocket: process.platform !== 'win32',
        sharedMemory: true
      },
      offscreenRender: {
        htmlToPdf: false,
        htmlToImage: false
      }
    }
  };
};

const toLegacyCapabilities = (snapshot: PalCapabilitySnapshot): string[] => {
  const capabilities = new Set<string>();
  if (snapshot.facets.surface.supported) {
    capabilities.add('window');
  }
  if (snapshot.facets.storage.localWorkspace) {
    capabilities.add('file');
  }
  if (snapshot.facets.selection.openFile || snapshot.facets.selection.saveFile) {
    capabilities.add('dialog');
  }
  if (snapshot.facets.systemUi.clipboard) {
    capabilities.add('clipboard');
  }
  if (snapshot.facets.transfer.externalOpen || snapshot.facets.transfer.revealInShell) {
    capabilities.add('shell');
  }
  if (snapshot.facets.device.screen) {
    capabilities.add('screen');
  }
  if (snapshot.facets.systemUi.tray) {
    capabilities.add('tray');
  }
  if (snapshot.facets.systemUi.notification) {
    capabilities.add('notification');
  }
  if (snapshot.facets.device.power) {
    capabilities.add('power');
  }
  if (snapshot.facets.systemUi.globalShortcut) {
    capabilities.add('shortcut');
  }
  if (snapshot.facets.ipc.namedPipe || snapshot.facets.ipc.sharedMemory || snapshot.facets.ipc.unixSocket) {
    capabilities.add('ipc');
  }
  if (snapshot.facets.offscreenRender.htmlToPdf || snapshot.facets.offscreenRender.htmlToImage) {
    capabilities.add('offscreen-render');
  }

  return [...capabilities];
};

class NodeEnvironment implements PALEnvironment {
  public constructor(private readonly hostKind: HostKind) {}

  public async getInfo() {
    const platform: PalPlatformId = this.hostKind === 'headless' ? 'server' : process.platform;
    return {
      hostKind: this.hostKind,
      platform,
      arch: process.arch,
      release: os.release()
    };
  }

  public async getCapabilities(): Promise<PalCapabilitySnapshot> {
    return this.hostKind === 'headless' ? buildHeadlessCapabilitySnapshot() : buildDesktopCapabilitySnapshot();
  }
}

class NodeAssociation implements PALAssociation {
  public constructor(private readonly environment: PALEnvironment) {}

  public async getCapabilities(): Promise<PalCapabilitySnapshot['facets']['association']> {
    const snapshot = await this.environment.getCapabilities();
    return { ...snapshot.facets.association };
  }
}

class NodeDevice implements PALDevice {
  public constructor(
    private readonly screen: PALScreen,
    private readonly power: PALPower
  ) {}

  public async getPrimaryScreen(): Promise<ScreenInfo> {
    return this.screen.getPrimary();
  }

  public async getAllScreens(): Promise<ScreenInfo[]> {
    return this.screen.getAll();
  }

  public async getPowerState(): Promise<PowerState> {
    return this.power.getState();
  }
}

class NodeSystemUi implements PALSystemUi {
  public constructor(
    public readonly clipboard: PALClipboard,
    public readonly tray: PALTray,
    public readonly notification: PALNotification,
    public readonly shortcut: PALShortcut
  ) {}
}

class NodeBackground implements PALBackground {
  public constructor(private readonly power: PALPower) {}

  public async getState(): Promise<PowerState> {
    return this.power.getState();
  }

  public async setPreventSleep(prevent: boolean): Promise<boolean> {
    return this.power.setPreventSleep(prevent);
  }
}

class NodeTransfer implements PALTransfer {
  public constructor(private readonly shell: PALShell) {}

  public async openPath(targetPath: string): Promise<void> {
    await this.shell.openPath(targetPath);
  }

  public async openExternal(url: string): Promise<void> {
    await this.shell.openExternal(url);
  }

  public async revealInShell(targetPath: string): Promise<void> {
    await this.shell.showItemInFolder(targetPath);
  }

  public async share(): Promise<{ shared: boolean }> {
    throw createError('PAL_TRANSFER_UNSUPPORTED', 'Share is not supported by the current PAL adapter');
  }
}

class NodePlatform implements PALPlatform {
  public constructor(private readonly environment: PALEnvironment) {}

  public async getInfo() {
    const info = await this.environment.getInfo();
    return {
      platform: info.platform,
      arch: info.arch,
      release: info.release
    };
  }

  public async getCapabilities(): Promise<string[]> {
    return toLegacyCapabilities(await this.environment.getCapabilities());
  }
}

class NodeScreen implements PALScreen {
  private readonly electron = loadElectronModule();

  public async getPrimary(): Promise<ScreenInfo> {
    const screens = await this.getAll();
    const primary = screens.find((item) => item.primary);
    return primary ?? screens[0]!;
  }

  public async getAll(): Promise<ScreenInfo[]> {
    if (this.electron?.screen?.getAllDisplays) {
      const primaryDisplay = this.electron.screen.getPrimaryDisplay?.();
      return this.electron.screen.getAllDisplays().map((display) => ({
        id: String(display.id),
        width: display.size.width,
        height: display.size.height,
        scaleFactor: display.scaleFactor ?? 1,
        x: display.bounds.x,
        y: display.bounds.y,
        primary: primaryDisplay ? display.id === primaryDisplay.id : display.bounds.x === 0 && display.bounds.y === 0
      }));
    }

    return [
      {
        id: 'default-screen',
        width: 0,
        height: 0,
        scaleFactor: 1,
        x: 0,
        y: 0,
        primary: true
      }
    ];
  }
}

const asPositiveFiniteNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
};

const isPathInside = (parentPath: string, targetPath: string): boolean => {
  const relative = path.relative(parentPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const normalizeHtmlEntryFile = (entryFile?: string): string => {
  const normalized = (typeof entryFile === 'string' && entryFile.trim().length > 0 ? entryFile.trim() : 'index.html').replace(/\\/g, '/');
  const candidate = path.posix.normalize(normalized);
  if (candidate.startsWith('/') || candidate === '..' || candidate.startsWith('../')) {
    throw createError('INVALID_ARGUMENT', 'entryFile must stay inside htmlDir', { entryFile });
  }
  return candidate;
};

const resolveHtmlExportPaths = async (input: {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
}): Promise<{ entryPath: string; outputFile: string }> => {
  const htmlDir = path.resolve(input.htmlDir);
  const htmlDirStat = await fs.stat(htmlDir).catch(() => null);
  if (!htmlDirStat?.isDirectory()) {
    throw createError('FILE_NOT_FOUND', 'htmlDir does not exist or is not a directory', { htmlDir });
  }

  const entryFile = normalizeHtmlEntryFile(input.entryFile);
  const entryPath = path.resolve(htmlDir, entryFile);
  if (!isPathInside(htmlDir, entryPath)) {
    throw createError('INVALID_ARGUMENT', 'entryFile must stay inside htmlDir', { entryFile });
  }

  const entryStat = await fs.stat(entryPath).catch(() => null);
  if (!entryStat?.isFile()) {
    throw createError('FILE_NOT_FOUND', 'HTML entry file does not exist', { htmlDir, entryFile, entryPath });
  }

  const outputFile = path.resolve(input.outputFile);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  return { entryPath, outputFile };
};

const countPdfPages = (buffer: Buffer): number | undefined => {
  const matches = buffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
  return matches && matches.length > 0 ? matches.length : undefined;
};

const waitForExportDocumentReady = async (browserWindow: {
  webContents: { executeJavaScript?: <T = unknown>(code: string, userGesture?: boolean) => Promise<T> };
}): Promise<void> => {
  if (typeof browserWindow.webContents.executeJavaScript !== 'function') {
    return;
  }

  await browserWindow.webContents.executeJavaScript(
    [
      'new Promise((resolve) => {',
      '  let settled = false;',
      '  const finish = () => {',
      '    if (settled) { return; }',
      '    settled = true;',
      '    const raf = typeof window.requestAnimationFrame === "function"',
      '      ? window.requestAnimationFrame.bind(window)',
      '      : (callback) => window.setTimeout(callback, 0);',
      '    raf(() => raf(() => resolve(true)));',
      '  };',
      '  const waitImages = Promise.all(Array.from(document.images || []).map((image) => {',
      '    if (image.complete) { return Promise.resolve(); }',
      '    return new Promise((done) => {',
      '      image.addEventListener("load", () => done(undefined), { once: true });',
      '      image.addEventListener("error", () => done(undefined), { once: true });',
      '    });',
      '  }));',
      '  const waitFonts = document.fonts && typeof document.fonts.ready?.then === "function"',
      '    ? document.fonts.ready',
      '    : Promise.resolve();',
      '  const waitWindowLoad = document.readyState === "complete"',
      '    ? Promise.resolve()',
      '    : new Promise((done) => window.addEventListener("load", () => done(undefined), { once: true }));',
      '  const frameList = Array.from(document.querySelectorAll(".chips-composite__frame"));',
      '  const compositeBodyDataset = document.body?.dataset;',
      '  for (const frame of frameList) {',
      '    try {',
      '      frame.loading = "eager";',
      '      frame.setAttribute("loading", "eager");',
      '    } catch {}',
      '  }',
      '  const waitFrames = Promise.all(frameList.map((frame) => new Promise((done) => {',
      '    const finishFrame = () => done(undefined);',
      '    if (frame.dataset.loaded === "true") {',
      '      finishFrame();',
      '      return;',
      '    }',
      '    frame.addEventListener("load", finishFrame, { once: true });',
      '    frame.addEventListener("error", finishFrame, { once: true });',
      '    window.setTimeout(finishFrame, 3000);',
      '  })));',
      '  const isCompositeSettled = () => {',
      '    if (frameList.length === 0) {',
      '      return true;',
      '    }',
      '    const ready = compositeBodyDataset?.chipsCompositeReady === "true";',
      '    const lastResizeAt = Number(compositeBodyDataset?.chipsCompositeLastResizeAt ?? "0");',
      '    const quietForMs = Number.isFinite(lastResizeAt) && lastResizeAt > 0 ? Date.now() - lastResizeAt : Number.POSITIVE_INFINITY;',
      '    const framesReady = frameList.every((frame) => frame.dataset.loaded === "true" && frame.dataset.renderReady === "true");',
      '    return ready && framesReady && quietForMs >= 180;',
      '  };',
      '  const waitCompositeSettled = frameList.length === 0',
      '    ? Promise.resolve()',
      '    : new Promise((done) => {',
      '        const startedAt = Date.now();',
      '        const scheduleCheck = () => {',
      '          if (isCompositeSettled()) {',
      '            window.setTimeout(() => done(undefined), 120);',
      '            return;',
      '          }',
      '          if (Date.now() - startedAt >= 8000) {',
      '            done(undefined);',
      '            return;',
      '          }',
      '          window.setTimeout(scheduleCheck, 60);',
      '        };',
      '        window.addEventListener("message", (event) => {',
      '          const type = event?.data?.type;',
      '          if (type === "chips.composite:ready" || type === "chips.composite:resize" || type === "chips.basecard:height" || type === "chips.basecard:error") {',
      '            window.setTimeout(scheduleCheck, 0);',
      '          }',
      '        });',
      '        scheduleCheck();',
      '      });',
      '  Promise.all([waitWindowLoad, waitImages, waitFonts, waitFrames, waitCompositeSettled])',
      '    .then(() => window.setTimeout(finish, 80))',
      '    .catch(() => window.setTimeout(finish, 80));',
      '  window.setTimeout(finish, 10000);',
      '})'
    ].join('\n'),
    true
  );
};

const measureExportDocumentBounds = async (browserWindow: {
  webContents: { executeJavaScript?: <T = unknown>(code: string, userGesture?: boolean) => Promise<T> };
}): Promise<{ width?: number; height?: number }> => {
  let measuredWidth: number | undefined;
  let measuredHeight: number | undefined;

  if (typeof browserWindow.webContents.executeJavaScript === 'function') {
    const measured = await browserWindow.webContents
      .executeJavaScript<{ width?: number; height?: number }>(
        [
          '(() => ({',
          '  width: Math.max(',
          '    document.documentElement?.scrollWidth ?? 0,',
          '    document.body?.scrollWidth ?? 0,',
          '    document.documentElement?.offsetWidth ?? 0,',
          '    document.body?.offsetWidth ?? 0,',
          '    window.innerWidth ?? 0',
          '  ),',
          '  height: Math.max(',
          '    document.documentElement?.scrollHeight ?? 0,',
          '    document.body?.scrollHeight ?? 0,',
          '    document.documentElement?.offsetHeight ?? 0,',
          '    document.body?.offsetHeight ?? 0,',
          '    Number(document.body?.dataset?.chipsCompositeLastHeight ?? "0") || 0,',
          '    window.innerHeight ?? 0',
          '  )',
          '}))()'
        ].join('\n'),
        true
      )
      .catch(() => ({ width: undefined, height: undefined }));
    measuredWidth = asPositiveFiniteNumber(measured.width);
    measuredHeight = asPositiveFiniteNumber(measured.height);
  }

  return { width: measuredWidth, height: measuredHeight };
};

const resolveExportViewport = (
  measuredBounds: { width?: number; height?: number },
  requestedWidth?: number,
  requestedHeight?: number,
  scaleFactor = 1
): { width: number; height: number } => {
  const effectiveScale = asPositiveFiniteNumber(scaleFactor) ?? 1;
  const width = Math.max(1, Math.ceil((requestedWidth ?? measuredBounds.width ?? 1200) * effectiveScale));
  const height = Math.max(1, Math.ceil((requestedHeight ?? measuredBounds.height ?? 900) * effectiveScale));
  return { width, height };
};

class NodeOffscreenRender implements PALOffscreenRender {
  public async renderHtmlToPdf(input: RenderHtmlToPdfRequest): Promise<RenderHtmlToPdfResult> {
    const electron = loadElectronModule();
    if (!electron?.BrowserWindow) {
      throw createError('PLATFORM_UNSUPPORTED', 'HTML to PDF export requires Electron BrowserWindow support');
    }

    const resolved = await resolveHtmlExportPaths(input);
    const browserWindow = new electron.BrowserWindow({
      show: false,
      width: 1280,
      height: 960,
      backgroundColor: '#ffffff',
      webPreferences: {
        sandbox: true,
        contextIsolation: true
      }
    });

    try {
      await Promise.resolve(browserWindow.loadURL(pathToFileURL(resolved.entryPath).href));
      await waitForExportDocumentReady(browserWindow);

      if (typeof browserWindow.webContents.printToPDF !== 'function') {
        throw createError('PLATFORM_UNSUPPORTED', 'Current Electron runtime does not expose printToPDF');
      }

      const marginMm = input.options?.marginMm;
      const pdfBuffer = await browserWindow.webContents.printToPDF({
        pageSize: input.options?.pageSize ?? 'A4',
        landscape: input.options?.landscape === true,
        printBackground: input.options?.printBackground !== false,
        margins: marginMm
          ? {
              top: (marginMm.top ?? 0) / 25.4,
              right: (marginMm.right ?? 0) / 25.4,
              bottom: (marginMm.bottom ?? 0) / 25.4,
              left: (marginMm.left ?? 0) / 25.4
            }
          : undefined
      });

      await fs.writeFile(resolved.outputFile, pdfBuffer);
      return {
        outputFile: resolved.outputFile,
        pageCount: countPdfPages(pdfBuffer)
      };
    } finally {
      if (!browserWindow.isDestroyed()) {
        browserWindow.close();
      }
    }
  }

  public async renderHtmlToImage(input: RenderHtmlToImageRequest): Promise<RenderHtmlToImageResult> {
    const electron = loadElectronModule();
    if (!electron?.BrowserWindow) {
      throw createError('PLATFORM_UNSUPPORTED', 'HTML to image export requires Electron BrowserWindow support');
    }

    const resolved = await resolveHtmlExportPaths(input);
    const format = input.options?.format ?? 'png';
    const background = input.options?.background ?? (format === 'jpeg' ? 'white' : 'transparent');
    const themeBackgroundColor =
      typeof (input.options as Record<string, unknown> | undefined)?.themeBackgroundColor === 'string'
        ? String((input.options as Record<string, unknown>).themeBackgroundColor)
        : undefined;
    const backgroundColor = background === 'theme' ? themeBackgroundColor ?? '#ffffff' : background === 'white' ? '#ffffff' : '#00000000';
    const browserWindow = new electron.BrowserWindow({
      show: false,
      width: 1280,
      height: 960,
      transparent: background === 'transparent' && format !== 'jpeg',
      backgroundColor,
      webPreferences: {
        sandbox: true,
        contextIsolation: true
      }
    });

    try {
      await Promise.resolve(browserWindow.loadURL(pathToFileURL(resolved.entryPath).href));
      await waitForExportDocumentReady(browserWindow);

      if (typeof browserWindow.webContents.capturePage !== 'function') {
        throw createError('PLATFORM_UNSUPPORTED', 'Current Electron runtime does not expose capturePage');
      }

      const initialBounds = await measureExportDocumentBounds(browserWindow);
      let viewport = resolveExportViewport(
        initialBounds,
        asPositiveFiniteNumber(input.options?.width),
        asPositiveFiniteNumber(input.options?.height),
        asPositiveFiniteNumber(input.options?.scaleFactor) ?? 1
      );
      browserWindow.setSize(viewport.width, viewport.height);
      await waitForExportDocumentReady(browserWindow);

      const settledBounds = await measureExportDocumentBounds(browserWindow);
      const settledViewport = resolveExportViewport(
        {
          width: Math.max(initialBounds.width ?? 0, settledBounds.width ?? 0) || undefined,
          height: Math.max(initialBounds.height ?? 0, settledBounds.height ?? 0) || undefined
        },
        asPositiveFiniteNumber(input.options?.width),
        asPositiveFiniteNumber(input.options?.height),
        asPositiveFiniteNumber(input.options?.scaleFactor) ?? 1
      );

      if (settledViewport.width !== viewport.width || settledViewport.height !== viewport.height) {
        viewport = settledViewport;
        browserWindow.setSize(viewport.width, viewport.height);
        await waitForExportDocumentReady(browserWindow);
      }

      const image = await browserWindow.webContents.capturePage({
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height
      });

      const output =
        format === 'jpeg'
          ? typeof image.toJPEG === 'function'
            ? image.toJPEG(90)
            : image.toPNG()
          : image.toPNG();
      const size = typeof image.getSize === 'function' ? image.getSize() : { width: viewport.width, height: viewport.height };

      await fs.writeFile(resolved.outputFile, output);
      return {
        outputFile: resolved.outputFile,
        width: size.width,
        height: size.height,
        format
      };
    } finally {
      if (!browserWindow.isDestroyed()) {
        browserWindow.close();
      }
    }
  }
}

interface PendingIpcReceiver {
  resolve: (message: PALIpcMessage) => void;
  reject: (error: unknown) => void;
  timer?: NodeJS.Timeout;
}

interface NodeIpcChannelState {
  info: PALIpcChannelInfo;
  maxBufferBytes: number;
  queue: PALIpcMessage[];
  pending: PendingIpcReceiver[];
  server?: net.Server;
}

class NodeIPC implements PALIPC {
  private readonly channels = new Map<string, NodeIpcChannelState>();

  public async createChannel(options: PALIpcCreateOptions): Promise<PALIpcChannelInfo> {
    const trimmedName = options.name.trim();
    if (trimmedName.length === 0) {
      throw createError('PAL_IPC_INVALID_CHANNEL', 'IPC channel name is required');
    }
    if (options.transport === 'unix-socket' && process.platform === 'win32') {
      throw createError('PAL_IPC_UNSUPPORTED_TRANSPORT', 'Unix domain socket is not supported on Windows');
    }

    const channelId = createId();
    const endpoint = this.createEndpoint(trimmedName, channelId, options.transport);
    const info: PALIpcChannelInfo = {
      channelId,
      name: trimmedName,
      transport: options.transport,
      endpoint
    };
    const state: NodeIpcChannelState = {
      info,
      maxBufferBytes: options.maxBufferBytes ?? 4 * 1024 * 1024,
      queue: [],
      pending: []
    };
    this.channels.set(channelId, state);

    if (options.transport !== 'shared-memory') {
      state.server = await this.createServer(state);
    }

    return { ...info };
  }

  public async send(channelId: string, payload: Buffer | string): Promise<void> {
    const state = this.requireChannel(channelId);
    const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf-8');
    if (body.length > state.maxBufferBytes) {
      throw createError('PAL_IPC_PAYLOAD_TOO_LARGE', `IPC payload exceeds limit for channel: ${state.info.name}`, {
        size: body.length,
        maxBufferBytes: state.maxBufferBytes
      });
    }

    if (state.info.transport === 'shared-memory') {
      this.pushMessage(state, body);
      return;
    }

    const endpoint = state.info.endpoint;
    if (!endpoint) {
      throw createError('PAL_IPC_ENDPOINT_MISSING', `IPC endpoint missing for channel: ${state.info.name}`);
    }

    await new Promise<void>((resolve, reject) => {
      const client = net.createConnection(endpoint);
      client.once('error', (error) => {
        reject(createError('PAL_IPC_SEND_FAILED', `IPC send failed for channel: ${state.info.name}`, { reason: String(error) }));
      });
      client.once('connect', () => {
        client.write(body);
        client.end();
      });
      client.once('close', () => {
        resolve();
      });
    });
  }

  public async receive(channelId: string, options?: PALIpcReceiveOptions): Promise<PALIpcMessage> {
    const state = this.requireChannel(channelId);
    const immediate = state.queue.shift();
    if (immediate) {
      return immediate;
    }

    return new Promise<PALIpcMessage>((resolve, reject) => {
      const pending: PendingIpcReceiver = {
        resolve,
        reject
      };
      const timeoutMs = options?.timeoutMs;
      if (typeof timeoutMs === 'number' && timeoutMs > 0) {
        pending.timer = setTimeout(() => {
          state.pending = state.pending.filter((item) => item !== pending);
          reject(createError('PAL_IPC_RECEIVE_TIMEOUT', `IPC receive timeout for channel: ${state.info.name}`, { timeoutMs }));
        }, timeoutMs);
      }
      state.pending.push(pending);
    });
  }

  public async closeChannel(channelId: string): Promise<void> {
    const state = this.channels.get(channelId);
    if (!state) {
      return;
    }

    this.channels.delete(channelId);
    for (const pending of state.pending) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.reject(createError('PAL_IPC_CHANNEL_CLOSED', `IPC channel closed: ${state.info.name}`));
    }
    state.pending = [];

    if (state.server) {
      await new Promise<void>((resolve) => {
        state.server!.close(() => resolve());
      });
    }

    if (state.info.endpoint && this.isSocketPath(state.info.endpoint)) {
      await fs.rm(state.info.endpoint, { force: true });
    }
  }

  public async listChannels(): Promise<PALIpcChannelInfo[]> {
    return [...this.channels.values()].map((state) => ({ ...state.info }));
  }

  private requireChannel(channelId: string): NodeIpcChannelState {
    const state = this.channels.get(channelId);
    if (!state) {
      throw createError('PAL_IPC_CHANNEL_NOT_FOUND', `IPC channel not found: ${channelId}`);
    }
    return state;
  }

  private pushMessage(state: NodeIpcChannelState, payload: Buffer): void {
    const message: PALIpcMessage = {
      channelId: state.info.channelId,
      transport: state.info.transport,
      payload,
      receivedAt: Date.now()
    };

    const pending = state.pending.shift();
    if (pending) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.resolve(message);
      return;
    }

    state.queue.push(message);
  }

  private async createServer(state: NodeIpcChannelState): Promise<net.Server> {
    const endpoint = state.info.endpoint;
    if (!endpoint) {
      throw createError('PAL_IPC_ENDPOINT_MISSING', `IPC endpoint missing for channel: ${state.info.name}`);
    }

    if (this.isSocketPath(endpoint)) {
      await fs.rm(endpoint, { force: true });
    }

    const server = net.createServer((socket) => {
      const chunks: Buffer[] = [];
      socket.on('data', (chunk) => {
        const nextChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(nextChunk);
      });
      socket.on('end', () => {
        const payload = Buffer.concat(chunks);
        this.pushMessage(state, payload);
      });
    });

    await new Promise<void>((resolve, reject) => {
      const onError = (error: unknown) => {
        server.off('listening', onListening);
        reject(createError('PAL_IPC_BIND_FAILED', `IPC bind failed for channel: ${state.info.name}`, { reason: String(error) }));
      };
      const onListening = () => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(endpoint);
    });

    server.on('error', () => {});
    return server;
  }

  private createEndpoint(name: string, channelId: string, transport: PALIpcTransport): string | undefined {
    const normalizedName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
    if (transport === 'shared-memory') {
      return undefined;
    }
    if (transport === 'named-pipe' && process.platform === 'win32') {
      return `\\\\.\\pipe\\chips-${normalizedName}-${channelId}`;
    }
    const compactId = channelId.replace(/-/g, '');
    const compactName = normalizedName.slice(0, 12) || 'ipc';
    const socketDir = os.tmpdir().length <= 40 ? os.tmpdir() : '/tmp';
    const socketTag = transport === 'named-pipe' ? 'np' : 'us';
    return path.join(socketDir, `ch-${socketTag}-${compactName}-${compactId}.sock`);
  }

  private isSocketPath(endpoint: string): boolean {
    return !endpoint.startsWith('\\\\.\\pipe\\');
  }
}

const createUnsupportedError = (feature: string): Error => {
  const error = createError('PAL_UNSUPPORTED', `${feature} is not supported by the current PAL adapter`, { feature });
  return Object.assign(new Error(error.message), error);
};

class UnsupportedSurfaceManager implements PALWindow, PALSurface {
  public async open(): Promise<SurfaceState> {
    throw createUnsupportedError('surface.open');
  }

  public async create(): Promise<WindowState> {
    throw createUnsupportedError('window.create');
  }

  public async focus(): Promise<void> {
    throw createUnsupportedError('surface.focus');
  }

  public async resize(): Promise<void> {
    throw createUnsupportedError('surface.resize');
  }

  public async setState(): Promise<void> {
    throw createUnsupportedError('surface.setState');
  }

  public async getState(): Promise<WindowState> {
    throw createUnsupportedError('surface.getState');
  }

  public async close(): Promise<void> {
    throw createUnsupportedError('surface.close');
  }

  public async list(): Promise<WindowState[]> {
    return [];
  }
}

class UnsupportedDialog implements PALDialog {
  public async openFile(): Promise<string[] | null> {
    throw createUnsupportedError('selection.openFile');
  }

  public async saveFile(): Promise<string | null> {
    throw createUnsupportedError('selection.saveFile');
  }

  public async showMessage(): Promise<number> {
    throw createUnsupportedError('selection.showMessage');
  }

  public async showConfirm(): Promise<boolean> {
    throw createUnsupportedError('selection.showConfirm');
  }
}

class UnsupportedClipboard implements PALClipboard {
  public async read(): Promise<ClipboardPayload> {
    throw createUnsupportedError('clipboard.read');
  }

  public async write(): Promise<void> {
    throw createUnsupportedError('clipboard.write');
  }
}

class UnsupportedShell implements PALShell, PALTransfer {
  public async openPath(): Promise<void> {
    throw createUnsupportedError('transfer.openPath');
  }

  public async openExternal(): Promise<void> {
    throw createUnsupportedError('transfer.openExternal');
  }

  public async showItemInFolder(): Promise<void> {
    throw createUnsupportedError('transfer.revealInShell');
  }

  public async revealInShell(): Promise<void> {
    throw createUnsupportedError('transfer.revealInShell');
  }

  public async share(): Promise<{ shared: boolean }> {
    throw createUnsupportedError('transfer.share');
  }
}

class UnsupportedTray implements PALTray {
  public async set(): Promise<TrayState> {
    throw createUnsupportedError('systemUi.tray');
  }

  public async clear(): Promise<void> {
    throw createUnsupportedError('systemUi.tray');
  }

  public async getState(): Promise<TrayState> {
    return { active: false };
  }
}

class UnsupportedNotification implements PALNotification {
  public async show(): Promise<void> {
    throw createUnsupportedError('systemUi.notification');
  }
}

class UnsupportedShortcut implements PALShortcut {
  public async register(): Promise<boolean> {
    throw createUnsupportedError('systemUi.shortcut');
  }

  public async unregister(): Promise<void> {
    throw createUnsupportedError('systemUi.shortcut');
  }

  public async isRegistered(): Promise<boolean> {
    return false;
  }

  public async list(): Promise<string[]> {
    return [];
  }

  public async clear(): Promise<void> {}
}

class HeadlessScreen implements PALScreen {
  public async getPrimary(): Promise<ScreenInfo> {
    return {
      id: 'headless-screen',
      width: 0,
      height: 0,
      scaleFactor: 1,
      x: 0,
      y: 0,
      primary: true
    };
  }

  public async getAll(): Promise<ScreenInfo[]> {
    return [await this.getPrimary()];
  }
}

class HeadlessOffscreenRender implements PALOffscreenRender {
  public async renderHtmlToPdf(): Promise<RenderHtmlToPdfResult> {
    throw createUnsupportedError('offscreenRender.renderHtmlToPdf');
  }

  public async renderHtmlToImage(): Promise<RenderHtmlToImageResult> {
    throw createUnsupportedError('offscreenRender.renderHtmlToImage');
  }
}

export class DesktopPalAdapter implements PALAdapter {
  public readonly environment: PALEnvironment;
  public readonly surface: PALSurface;
  public readonly storage: PALStorage;
  public readonly selection: PALSelection;
  public readonly transfer: PALTransfer;
  public readonly association: PALAssociation;
  public readonly device: PALDevice;
  public readonly systemUi: PALSystemUi;
  public readonly background: PALBackground;
  public readonly offscreenRender: PALOffscreenRender;

  public readonly window: PALWindow;
  public readonly fs: PALFileSystem;
  public readonly dialog: PALDialog;
  public readonly clipboard: PALClipboard;
  public readonly shell: PALShell;
  public readonly platform: PALPlatform;
  public readonly screen: PALScreen;
  public readonly tray: PALTray;
  public readonly notification: PALNotification;
  public readonly shortcut: PALShortcut;
  public readonly launcher: PALLauncher;
  public readonly power: PALPower;
  public readonly ipc: PALIPC;

  public constructor(options?: { window?: WindowManagerOptions }) {
    this.environment = new NodeEnvironment('desktop');
    const windowManager = new NodeWindowManager(options?.window);
    this.window = windowManager;
    this.surface = windowManager;
    this.fs = new NodeFileSystem();
    this.storage = this.fs;
    this.dialog = new NodeDialog();
    this.selection = this.dialog;
    this.clipboard = new NodeClipboard();
    this.shell = new NodeShell();
    this.transfer = new NodeTransfer(this.shell);
    this.association = new NodeAssociation(this.environment);
    this.platform = new NodePlatform(this.environment);
    this.screen = new NodeScreen();
    this.tray = new NodeTray();
    this.notification = new NodeNotification();
    this.shortcut = new NodeShortcut();
    this.launcher = new NodeLauncher();
    this.power = new NodePower();
    this.device = new NodeDevice(this.screen, this.power);
    this.systemUi = new NodeSystemUi(this.clipboard, this.tray, this.notification, this.shortcut);
    this.background = new NodeBackground(this.power);
    this.ipc = new NodeIPC();
    this.offscreenRender = new NodeOffscreenRender();
  }
}

export class HeadlessPalAdapter implements PALAdapter {
  public readonly environment: PALEnvironment;
  public readonly surface: PALSurface;
  public readonly storage: PALStorage;
  public readonly selection: PALSelection;
  public readonly transfer: PALTransfer;
  public readonly association: PALAssociation;
  public readonly device: PALDevice;
  public readonly systemUi: PALSystemUi;
  public readonly background: PALBackground;
  public readonly offscreenRender: PALOffscreenRender;

  public readonly window: PALWindow;
  public readonly fs: PALFileSystem;
  public readonly dialog: PALDialog;
  public readonly clipboard: PALClipboard;
  public readonly shell: PALShell;
  public readonly platform: PALPlatform;
  public readonly screen: PALScreen;
  public readonly tray: PALTray;
  public readonly notification: PALNotification;
  public readonly shortcut: PALShortcut;
  public readonly launcher: PALLauncher;
  public readonly power: PALPower;
  public readonly ipc: PALIPC;

  public constructor() {
    this.environment = new NodeEnvironment('headless');
    const surface = new UnsupportedSurfaceManager();
    this.window = surface;
    this.surface = surface;
    this.fs = new NodeFileSystem();
    this.storage = this.fs;
    this.dialog = new UnsupportedDialog();
    this.selection = this.dialog;
    this.clipboard = new UnsupportedClipboard();
    const shell = new UnsupportedShell();
    this.shell = shell;
    this.transfer = shell;
    this.association = new NodeAssociation(this.environment);
    this.platform = new NodePlatform(this.environment);
    this.screen = new HeadlessScreen();
    this.tray = new UnsupportedTray();
    this.notification = new UnsupportedNotification();
    this.shortcut = new UnsupportedShortcut();
    this.launcher = new NodeLauncher();
    this.power = new NodePower();
    this.device = new NodeDevice(this.screen, this.power);
    this.systemUi = new NodeSystemUi(this.clipboard, this.tray, this.notification, this.shortcut);
    this.background = new NodeBackground(this.power);
    this.ipc = new NodeIPC();
    this.offscreenRender = new HeadlessOffscreenRender();
  }
}

export class NodePalAdapter extends DesktopPalAdapter {}

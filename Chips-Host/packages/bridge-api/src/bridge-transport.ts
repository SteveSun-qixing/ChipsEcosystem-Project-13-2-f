import { EventEmitter } from 'node:events';
import { createHostAccessTransport, type HostAccessTransport } from './transport';

export interface BridgeInvokeHandler {
  <T>(action: string, payload: unknown): Promise<T>;
}

export type BridgeEventHandler = (data: unknown) => void;

export type BridgeHostKind = 'desktop' | 'web' | 'mobile' | 'headless';
export type BridgePlatformId = NodeJS.Platform | 'web' | 'android' | 'ios' | 'server';
export type BridgeSurfaceKind = 'window' | 'tab' | 'route' | 'modal' | 'sheet' | 'fullscreen';
export type BridgeSurfaceStateKind = 'normal' | 'minimized' | 'maximized' | 'fullscreen' | 'hidden';
export type BridgeWindowChromeTitleBarStyle = 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';

export interface BridgeWindowChromeOverlayOptions {
  color?: string;
  symbolColor?: string;
  height?: number;
}

export interface BridgeWindowChromeOptions {
  frame?: boolean;
  transparent?: boolean;
  backgroundColor?: string;
  titleBarStyle?: BridgeWindowChromeTitleBarStyle;
  titleBarOverlay?: boolean | BridgeWindowChromeOverlayOptions;
}

export interface BridgePlatformInfo {
  hostKind: BridgeHostKind;
  platform: BridgePlatformId;
  arch: string;
  release: string;
}

export interface BridgeScreenInfo {
  id: string;
  width: number;
  height: number;
  scaleFactor: number;
  x: number;
  y: number;
  primary: boolean;
}

export interface BridgePalCapabilitySnapshot {
  hostKind: BridgeHostKind;
  platform: BridgePlatformId;
  facets: {
    surface: {
      supported: boolean;
      interactive: boolean;
      supportedKinds: BridgeSurfaceKind[];
    };
    storage: {
      localWorkspace: boolean;
      sandboxFilePicker: boolean;
      remoteBacked: boolean;
    };
    selection: {
      openFile: boolean;
      saveFile: boolean;
      directory: boolean;
      multiple: boolean;
    };
    transfer: {
      upload: boolean;
      download: boolean;
      share: boolean;
      externalOpen: boolean;
      revealInShell: boolean;
    };
    association: {
      fileAssociation: boolean;
      urlScheme: boolean;
      shareTarget: boolean;
    };
    device: {
      screen: boolean;
      power: boolean;
      network: boolean;
    };
    systemUi: {
      clipboard: boolean;
      tray: boolean;
      globalShortcut: boolean;
      notification: boolean;
    };
    background: {
      keepAlive: boolean;
      wakeEvents: boolean;
    };
    ipc: {
      namedPipe: boolean;
      unixSocket: boolean;
      sharedMemory: boolean;
    };
    offscreenRender: {
      htmlToPdf: boolean;
      htmlToImage: boolean;
    };
  };
}

export interface BridgeSurfacePresentation {
  title?: string;
  width?: number;
  height?: number;
  resizable?: boolean;
  alwaysOnTop?: boolean;
  chrome?: BridgeWindowChromeOptions;
}

export type BridgeSurfaceTarget =
  | {
      type: 'plugin';
      pluginId: string;
      url?: string;
      sessionId?: string;
      permissions?: string[];
      launchParams?: Record<string, unknown>;
    }
  | {
      type: 'url';
      url: string;
    }
  | {
      type: 'document';
      documentId: string;
      title?: string;
      url?: string;
    };

export interface BridgeSurfaceOpenRequest {
  kind?: BridgeSurfaceKind;
  target: BridgeSurfaceTarget;
  presentation?: BridgeSurfacePresentation;
}

export interface BridgeSurfaceState {
  id: string;
  kind: BridgeSurfaceKind;
  title?: string;
  width?: number;
  height?: number;
  focused: boolean;
  state: BridgeSurfaceStateKind;
  url?: string;
  pluginId?: string;
  sessionId?: string;
  chrome?: BridgeWindowChromeOptions;
  metadata?: Record<string, unknown>;
}

export interface BridgeTransferShareInput {
  title?: string;
  text?: string;
  url?: string;
  files?: string[];
}

export interface BridgeAssociationCapabilities {
  fileAssociation: boolean;
  urlScheme: boolean;
  shareTarget: boolean;
}

export type BridgeAssociationOpenPathResult =
  | {
      targetPath: string;
      extension: string;
      mode: 'card' | 'box' | 'plugin' | 'shell';
      windowId?: string;
      pluginId?: string;
    }
  | {
      url: string;
      mode: 'external';
    };

export interface BridgeEventAdapter {
  on(event: string, handler: BridgeEventHandler): () => void;
  once(event: string, handler: BridgeEventHandler): void;
  emit(event: string, data?: unknown): void;
}

export interface ChipsBridge {
  invoke<T = unknown>(action: string, payload?: unknown): Promise<T>;
  invokeScoped?<T = unknown>(action: string, payload: unknown, scope: { token: string }): Promise<T>;
  on(event: string, handler: BridgeEventHandler): () => void;
  once(event: string, handler: BridgeEventHandler): void;
  emit(event: string, data?: unknown): void;
  emitScoped?(event: string, data: unknown, scope: { token: string }): Promise<void>;
  window: {
    open(config: unknown): Promise<BridgeSurfaceState>;
    focus(windowId: string): Promise<void>;
    resize(windowId: string, width: number, height: number): Promise<void>;
    setState(windowId: string, state: string): Promise<void>;
    getState(windowId: string): Promise<BridgeSurfaceState>;
    close(windowId: string): Promise<void>;
  };
  dialog: {
    openFile(options?: unknown): Promise<string[] | null>;
    saveFile(options?: unknown): Promise<string | null>;
    showMessage(options: unknown): Promise<number>;
    showConfirm(options: unknown): Promise<boolean>;
  };
  plugin: {
    list(filter?: unknown): Promise<unknown>;
    get(pluginId: string): Promise<unknown>;
    getSelf(): Promise<unknown>;
    getCardPlugin(cardType: string): Promise<unknown>;
    getLayoutPlugin(layoutType: string): Promise<unknown>;
    install(manifestPath: string): Promise<unknown>;
    enable(pluginId: string): Promise<void>;
    disable(pluginId: string): Promise<void>;
    uninstall(pluginId: string): Promise<void>;
    launch(pluginId: string, launchParams?: Record<string, unknown>): Promise<unknown>;
    getShortcut(pluginId: string): Promise<unknown>;
    createShortcut(pluginId: string, replace?: boolean): Promise<unknown>;
    removeShortcut(pluginId: string): Promise<unknown>;
    query(filter?: unknown): Promise<unknown>;
  };
  clipboard: {
    read(format?: string): Promise<unknown>;
    write(data: unknown, format?: string): Promise<void>;
  };
  shell: {
    openPath(path: string): Promise<void>;
    openExternal(url: string): Promise<void>;
    showItemInFolder(path: string): Promise<void>;
  };
  surface: {
    open(request: BridgeSurfaceOpenRequest): Promise<BridgeSurfaceState>;
    focus(surfaceId: string): Promise<void>;
    resize(surfaceId: string, width: number, height: number): Promise<void>;
    setState(surfaceId: string, state: BridgeSurfaceStateKind): Promise<void>;
    getState(surfaceId: string): Promise<BridgeSurfaceState>;
    close(surfaceId: string): Promise<void>;
    list(): Promise<BridgeSurfaceState[]>;
  };
  transfer: {
    openPath(path: string): Promise<void>;
    openExternal(url: string): Promise<void>;
    revealInShell(path: string): Promise<void>;
    share(input: BridgeTransferShareInput): Promise<boolean>;
  };
  association: {
    getCapabilities(): Promise<BridgeAssociationCapabilities>;
    openPath(path: string): Promise<BridgeAssociationOpenPathResult>;
    openUrl(url: string): Promise<{ url: string; mode: 'external' }>;
  };
  platform: {
    getInfo(): Promise<BridgePlatformInfo>;
    getCapabilities(): Promise<BridgePalCapabilitySnapshot>;
    getScreenInfo(): Promise<BridgeScreenInfo>;
    listScreens(): Promise<BridgeScreenInfo[]>;
    openExternal(url: string): Promise<void>;
    powerGetState(): Promise<unknown>;
    powerSetPreventSleep(prevent: boolean): Promise<boolean>;
    getPathForFile?(file: unknown): string;
    getLaunchContext?(): {
      pluginId?: string;
      sessionId?: string;
      launchParams: Record<string, unknown>;
    };
  };
  notification: {
    show(options: { title: string; body: string; icon?: string; silent?: boolean }): Promise<void>;
  };
  tray: {
    set(options: { icon?: string; tooltip?: string; menu?: Array<{ id: string; label: string }> }): Promise<unknown>;
    clear(): Promise<void>;
    getState(): Promise<unknown>;
  };
  shortcut: {
    register(accelerator: string, eventName?: string): Promise<void>;
    unregister(accelerator: string): Promise<void>;
    isRegistered(accelerator: string): Promise<boolean>;
    list(): Promise<string[]>;
    clear(): Promise<void>;
  };
  ipc: {
    createChannel(options: {
      name: string;
      transport: 'named-pipe' | 'unix-socket' | 'shared-memory';
      maxBufferBytes?: number;
    }): Promise<unknown>;
    send(channelId: string, payload: string, encoding?: 'utf8' | 'base64'): Promise<void>;
    receive(channelId: string, timeoutMs?: number): Promise<unknown>;
    closeChannel(channelId: string): Promise<void>;
    listChannels(): Promise<unknown[]>;
  };
}

export class BridgeTransport implements ChipsBridge {
  private readonly emitter = new EventEmitter();
  private readonly eventAdapter?: BridgeEventAdapter;
  private readonly transport: HostAccessTransport;
  public readonly window: ChipsBridge['window'];
  public readonly dialog: ChipsBridge['dialog'];
  public readonly plugin: ChipsBridge['plugin'];
  public readonly clipboard: ChipsBridge['clipboard'];
  public readonly shell: ChipsBridge['shell'];
  public readonly surface: ChipsBridge['surface'];
  public readonly transfer: ChipsBridge['transfer'];
  public readonly association: ChipsBridge['association'];
  public readonly platform: ChipsBridge['platform'];
  public readonly notification: ChipsBridge['notification'];
  public readonly tray: ChipsBridge['tray'];
  public readonly shortcut: ChipsBridge['shortcut'];
  public readonly ipc: ChipsBridge['ipc'];

  public constructor(source: BridgeInvokeHandler | HostAccessTransport, options?: { eventAdapter?: BridgeEventAdapter }) {
    this.eventAdapter = options?.eventAdapter;
    this.transport =
      typeof source === 'function'
        ? createHostAccessTransport({
            invoke: async <T>(action: string, payload: unknown) => source(action, payload) as Promise<T>,
            on: (event, handler) => {
              if (this.eventAdapter) {
                return this.eventAdapter.on(event, handler);
              }
              this.emitter.on(event, handler);
              return () => {
                this.emitter.off(event, handler);
              };
            },
            once: (event, handler) => {
              if (this.eventAdapter) {
                this.eventAdapter.once(event, handler);
                return;
              }
              this.emitter.once(event, handler);
            },
            emit: (event, data) => {
              if (this.eventAdapter) {
                this.eventAdapter.emit(event, data);
                return;
              }
              this.emitter.emit(event, data);
            }
          })
        : source;
    this.window = {
      open: async (config) => {
        const result = await this.invoke<{ window: BridgeSurfaceState }>('window.open', { config });
        return result.window;
      },
      focus: async (windowId) => {
        await this.invoke('window.focus', { windowId });
      },
      resize: async (windowId, width, height) => {
        await this.invoke('window.resize', { windowId, width, height });
      },
      setState: async (windowId, state) => {
        await this.invoke('window.setState', { windowId, state });
      },
      getState: async (windowId) => {
        const result = await this.invoke<{ state: BridgeSurfaceState }>('window.getState', { windowId });
        return result.state;
      },
      close: async (windowId) => {
        await this.invoke('window.close', { windowId });
      }
    };

    this.dialog = {
      openFile: async (options) => {
        const result = await this.invoke<{ filePaths: string[] | null }>('platform.dialogOpenFile', { options });
        return result.filePaths;
      },
      saveFile: async (options) => {
        const result = await this.invoke<{ filePath: string | null }>('platform.dialogSaveFile', { options });
        return result.filePath;
      },
      showMessage: async (options) => {
        const result = await this.invoke<{ response: number }>('platform.dialogShowMessage', { options });
        return result.response;
      },
      showConfirm: async (options) => {
        const result = await this.invoke<{ confirmed: boolean }>('platform.dialogShowConfirm', { options });
        return result.confirmed;
      }
    };

    this.plugin = {
      list: async (filter) => this.invoke<unknown>('plugin.list', filter ?? {}),
      get: async (pluginId) => this.invoke<unknown>('plugin.get', { pluginId }),
      getSelf: async () => this.invoke<unknown>('plugin.getSelf', {}),
      getCardPlugin: async (cardType) => this.invoke<unknown>('plugin.getCardPlugin', { cardType }),
      getLayoutPlugin: async (layoutType) => this.invoke<unknown>('plugin.getLayoutPlugin', { layoutType }),
      install: async (manifestPath) => this.invoke<unknown>('plugin.install', { manifestPath }),
      enable: async (pluginId) => {
        await this.invoke('plugin.enable', { pluginId });
      },
      disable: async (pluginId) => {
        await this.invoke('plugin.disable', { pluginId });
      },
      uninstall: async (pluginId) => {
        await this.invoke('plugin.uninstall', { pluginId });
      },
      launch: async (pluginId, launchParams) => this.invoke<unknown>('plugin.launch', { pluginId, launchParams }),
      getShortcut: async (pluginId) => this.invoke<unknown>('plugin.getShortcut', { pluginId }),
      createShortcut: async (pluginId, replace) => this.invoke<unknown>('plugin.createShortcut', { pluginId, replace }),
      removeShortcut: async (pluginId) => this.invoke<unknown>('plugin.removeShortcut', { pluginId }),
      query: async (filter) => this.invoke<unknown>('plugin.query', filter ?? {})
    };

    this.clipboard = {
      read: async (format) => {
        const result = await this.invoke<{ data: unknown }>('platform.clipboardRead', { format });
        return result.data;
      },
      write: async (data, format) => {
        await this.invoke('platform.clipboardWrite', { data, format });
      }
    };

    this.shell = {
      openPath: async (targetPath) => {
        await this.invoke('platform.shellOpenPath', { path: targetPath });
      },
      openExternal: async (url) => {
        await this.invoke('platform.shellOpenExternal', { url });
      },
      showItemInFolder: async (targetPath) => {
        await this.invoke('platform.shellShowItemInFolder', { path: targetPath });
      }
    };

    this.surface = {
      open: async (request) => {
        const result = await this.invoke<{ surface: BridgeSurfaceState }>('surface.open', { request });
        return result.surface;
      },
      focus: async (surfaceId) => {
        await this.invoke('surface.focus', { surfaceId });
      },
      resize: async (surfaceId, width, height) => {
        await this.invoke('surface.resize', { surfaceId, width, height });
      },
      setState: async (surfaceId, state) => {
        await this.invoke('surface.setState', { surfaceId, state });
      },
      getState: async (surfaceId) => {
        const result = await this.invoke<{ state: BridgeSurfaceState }>('surface.getState', { surfaceId });
        return result.state;
      },
      close: async (surfaceId) => {
        await this.invoke('surface.close', { surfaceId });
      },
      list: async () => {
        const result = await this.invoke<{ surfaces: BridgeSurfaceState[] }>('surface.list', {});
        return result.surfaces;
      }
    };

    this.transfer = {
      openPath: async (targetPath) => {
        await this.invoke('transfer.openPath', { path: targetPath });
      },
      openExternal: async (url) => {
        await this.invoke('transfer.openExternal', { url });
      },
      revealInShell: async (targetPath) => {
        await this.invoke('transfer.revealInShell', { path: targetPath });
      },
      share: async (input) => {
        const result = await this.invoke<{ shared: boolean }>('transfer.share', { input });
        return result.shared;
      }
    };

    this.association = {
      getCapabilities: async () => {
        const result = await this.invoke<{ capabilities: BridgeAssociationCapabilities }>('association.getCapabilities', {});
        return result.capabilities;
      },
      openPath: async (targetPath) => {
        const result = await this.invoke<{ result: BridgeAssociationOpenPathResult }>('association.openPath', {
          path: targetPath
        });
        return result.result;
      },
      openUrl: async (url) => {
        const result = await this.invoke<{ result: { url: string; mode: 'external' } }>('association.openUrl', {
          url
        });
        return result.result;
      }
    };

    this.platform = {
      getInfo: async () => {
        const result = await this.invoke<{ info: BridgePlatformInfo }>('platform.getInfo', {});
        return result.info;
      },
      getCapabilities: async () => {
        const result = await this.invoke<{ capabilities: BridgePalCapabilitySnapshot }>('platform.getCapabilities', {});
        return result.capabilities;
      },
      getScreenInfo: async () => {
        const result = await this.invoke<{ screen: BridgeScreenInfo }>('platform.getScreenInfo', {});
        return result.screen;
      },
      listScreens: async () => {
        const result = await this.invoke<{ screens: BridgeScreenInfo[] }>('platform.listScreens', {});
        return result.screens;
      },
      openExternal: async (url) => {
        await this.invoke('platform.openExternal', { url });
      },
      powerGetState: async () => {
        const result = await this.invoke<{ state: unknown }>('platform.powerGetState', {});
        return result.state;
      },
      powerSetPreventSleep: async (prevent) => {
        const result = await this.invoke<{ preventSleep: boolean }>('platform.powerSetPreventSleep', { prevent });
        return result.preventSleep;
      }
    };

    this.notification = {
      show: async (options) => {
        await this.invoke('platform.notificationShow', { options });
      }
    };

    this.tray = {
      set: async (options) => {
        const result = await this.invoke<{ tray: unknown }>('platform.traySet', { options });
        return result.tray;
      },
      clear: async () => {
        await this.invoke('platform.trayClear', {});
      },
      getState: async () => {
        const result = await this.invoke<{ tray: unknown }>('platform.trayGetState', {});
        return result.tray;
      }
    };

    this.shortcut = {
      register: async (accelerator, eventName) => {
        await this.invoke('platform.shortcutRegister', { accelerator, eventName });
      },
      unregister: async (accelerator) => {
        await this.invoke('platform.shortcutUnregister', { accelerator });
      },
      isRegistered: async (accelerator) => {
        const result = await this.invoke<{ registered: boolean }>('platform.shortcutIsRegistered', { accelerator });
        return result.registered;
      },
      list: async () => {
        const result = await this.invoke<{ accelerators: string[] }>('platform.shortcutList', {});
        return result.accelerators;
      },
      clear: async () => {
        await this.invoke('platform.shortcutClear', {});
      }
    };

    this.ipc = {
      createChannel: async (options) => {
        const result = await this.invoke<{ channel: unknown }>('platform.ipcCreateChannel', options);
        return result.channel;
      },
      send: async (channelId, payload, encoding) => {
        await this.invoke('platform.ipcSend', { channelId, payload, encoding });
      },
      receive: async (channelId, timeoutMs) => {
        const result = await this.invoke<{ message: unknown }>('platform.ipcReceive', { channelId, timeoutMs });
        return result.message;
      },
      closeChannel: async (channelId) => {
        await this.invoke('platform.ipcCloseChannel', { channelId });
      },
      listChannels: async () => {
        const result = await this.invoke<{ channels: unknown[] }>('platform.ipcListChannels', {});
        return result.channels;
      }
    };
  }

  public async invoke<T = unknown>(action: string, payload?: unknown): Promise<T> {
    return this.transport.invoke<T>(action, payload);
  }

  public on(event: string, handler: BridgeEventHandler): () => void {
    return this.transport.on(event, handler);
  }

  public once(event: string, handler: BridgeEventHandler): void {
    this.transport.once(event, handler);
  }

  public emit(event: string, data?: unknown): void {
    void this.transport.emit(event, data);
  }

  public pushFromHost(event: string, payload: unknown): void {
    this.emitter.emit(event, payload);
  }
}

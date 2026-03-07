import { EventEmitter } from 'node:events';

export interface BridgeInvokeHandler {
  <T>(action: string, payload: unknown): Promise<T>;
}

export type BridgeEventHandler = (data: unknown) => void;

export interface BridgeEventAdapter {
  on(event: string, handler: BridgeEventHandler): () => void;
  once(event: string, handler: BridgeEventHandler): void;
  emit(event: string, data?: unknown): void;
}

export interface ChipsBridge {
  invoke<T = unknown>(action: string, payload?: unknown): Promise<T>;
  on(event: string, handler: BridgeEventHandler): () => void;
  once(event: string, handler: BridgeEventHandler): void;
  emit(event: string, data?: unknown): void;
  window: {
    open(config: unknown): Promise<unknown>;
    focus(windowId: string): Promise<void>;
    resize(windowId: string, width: number, height: number): Promise<void>;
    setState(windowId: string, state: string): Promise<void>;
    getState(windowId: string): Promise<unknown>;
    close(windowId: string): Promise<void>;
  };
  dialog: {
    openFile(options?: unknown): Promise<unknown>;
    saveFile(options?: unknown): Promise<unknown>;
    showMessage(options: unknown): Promise<unknown>;
    showConfirm(options: unknown): Promise<boolean>;
  };
  plugin: {
    install(manifestPath: string): Promise<unknown>;
    enable(pluginId: string): Promise<void>;
    disable(pluginId: string): Promise<void>;
    uninstall(pluginId: string): Promise<void>;
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
  platform: {
    getInfo(): Promise<unknown>;
    getCapabilities(): Promise<string[]>;
    getScreenInfo(): Promise<unknown>;
    listScreens(): Promise<unknown[]>;
    openExternal(url: string): Promise<void>;
    powerGetState(): Promise<unknown>;
    powerSetPreventSleep(prevent: boolean): Promise<boolean>;
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
  public readonly window: ChipsBridge['window'];
  public readonly dialog: ChipsBridge['dialog'];
  public readonly plugin: ChipsBridge['plugin'];
  public readonly clipboard: ChipsBridge['clipboard'];
  public readonly shell: ChipsBridge['shell'];
  public readonly platform: ChipsBridge['platform'];
  public readonly notification: ChipsBridge['notification'];
  public readonly tray: ChipsBridge['tray'];
  public readonly shortcut: ChipsBridge['shortcut'];
  public readonly ipc: ChipsBridge['ipc'];

  public constructor(private readonly invokeHandler: BridgeInvokeHandler, options?: { eventAdapter?: BridgeEventAdapter }) {
    this.eventAdapter = options?.eventAdapter;
    this.window = {
      open: async (config) => this.invoke<unknown>('window.open', { config }),
      focus: async (windowId) => {
        await this.invoke('window.focus', { windowId });
      },
      resize: async (windowId, width, height) => {
        await this.invoke('window.resize', { windowId, width, height });
      },
      setState: async (windowId, state) => {
        await this.invoke('window.setState', { windowId, state });
      },
      getState: async (windowId) => this.invoke<unknown>('window.getState', { windowId }),
      close: async (windowId) => {
        await this.invoke('window.close', { windowId });
      }
    };

    this.dialog = {
      openFile: async (options) => this.invoke<unknown>('platform.dialogOpenFile', { options }),
      saveFile: async (options) => this.invoke<unknown>('platform.dialogSaveFile', { options }),
      showMessage: async (options) => this.invoke<unknown>('platform.dialogShowMessage', { options }),
      showConfirm: async (options) => this.invoke<boolean>('platform.dialogShowConfirm', { options })
    };

    this.plugin = {
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
      query: async (filter) => this.invoke<unknown>('plugin.query', filter ?? {})
    };

    this.clipboard = {
      read: async (format) => this.invoke<unknown>('platform.clipboardRead', { format }),
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

    this.platform = {
      getInfo: async () => this.invoke<unknown>('platform.getInfo', {}),
      getCapabilities: async () => this.invoke<string[]>('platform.getCapabilities', {}),
      getScreenInfo: async () => this.invoke<unknown>('platform.getScreenInfo', {}),
      listScreens: async () => {
        const result = await this.invoke<{ screens: unknown[] }>('platform.listScreens', {});
        return result.screens;
      },
      openExternal: async (url) => {
        await this.invoke('platform.openExternal', { url });
      },
      powerGetState: async () => this.invoke<unknown>('platform.powerGetState', {}),
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
        return this.invoke<unknown>('platform.traySet', { options });
      },
      clear: async () => {
        await this.invoke('platform.trayClear', {});
      },
      getState: async () => {
        return this.invoke<unknown>('platform.trayGetState', {});
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
      createChannel: async (options) => this.invoke<unknown>('platform.ipcCreateChannel', options),
      send: async (channelId, payload, encoding) => {
        await this.invoke('platform.ipcSend', { channelId, payload, encoding });
      },
      receive: async (channelId, timeoutMs) =>
        this.invoke<unknown>('platform.ipcReceive', { channelId, timeoutMs }),
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
    return this.invokeHandler<T>(action, payload);
  }

  public on(event: string, handler: BridgeEventHandler): () => void {
    if (this.eventAdapter) {
      return this.eventAdapter.on(event, handler);
    }
    this.emitter.on(event, handler);
    return () => {
      this.emitter.off(event, handler);
    };
  }

  public once(event: string, handler: BridgeEventHandler): void {
    if (this.eventAdapter) {
      this.eventAdapter.once(event, handler);
      return;
    }
    this.emitter.once(event, handler);
  }

  public emit(event: string, data?: unknown): void {
    if (this.eventAdapter) {
      this.eventAdapter.emit(event, data);
      return;
    }
    this.emitter.emit(event, data);
  }

  public pushFromHost(event: string, payload: unknown): void {
    this.emitter.emit(event, payload);
  }
}

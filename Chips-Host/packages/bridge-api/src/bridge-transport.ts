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
}

export class BridgeTransport implements ChipsBridge {
  private readonly emitter = new EventEmitter();
  private readonly eventAdapter?: BridgeEventAdapter;
  public readonly window: ChipsBridge['window'];
  public readonly dialog: ChipsBridge['dialog'];
  public readonly plugin: ChipsBridge['plugin'];
  public readonly clipboard: ChipsBridge['clipboard'];
  public readonly shell: ChipsBridge['shell'];

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
      openFile: async (options) => this.invoke<unknown>('dialog.openFile', { options }),
      saveFile: async (options) => this.invoke<unknown>('dialog.saveFile', { options }),
      showMessage: async (options) => this.invoke<unknown>('dialog.showMessage', { options }),
      showConfirm: async (options) => this.invoke<boolean>('dialog.showConfirm', { options })
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
      read: async (format) => this.invoke<unknown>('clipboard.read', { format }),
      write: async (data, format) => {
        await this.invoke('clipboard.write', { data, format });
      }
    };

    this.shell = {
      openPath: async (targetPath) => {
        await this.invoke('shell.openPath', { path: targetPath });
      },
      openExternal: async (url) => {
        await this.invoke('shell.openExternal', { url });
      },
      showItemInFolder: async (targetPath) => {
        await this.invoke('shell.showItemInFolder', { path: targetPath });
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

import type { RuntimeClient } from './runtime-client';

export type WindowChromeTitleBarStyle = 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';

export interface WindowChromeOverlayOptions {
  color?: string;
  symbolColor?: string;
  height?: number;
}

export interface WindowChromeOptions {
  frame?: boolean;
  transparent?: boolean;
  backgroundColor?: string;
  titleBarStyle?: WindowChromeTitleBarStyle;
  titleBarOverlay?: boolean | WindowChromeOverlayOptions;
}

export interface ThemeClient {
  list(publisher?: string): Promise<unknown>;
  apply(id: string): Promise<void>;
  getCurrent(appId?: string, pluginId?: string): Promise<unknown>;
  getAllCss(): Promise<string>;
  resolve(chain: string[]): Promise<unknown>;
  contractGet(component?: string): Promise<unknown>;
}

export interface I18nClient {
  getCurrent(): Promise<unknown>;
  setCurrent(locale: string): Promise<void>;
  translate(key: string, params?: Record<string, unknown>): Promise<unknown>;
  listLocales(): Promise<unknown>;
}

export interface FileClient {
  read(path: string, options?: { encoding?: BufferEncoding }): Promise<unknown>;
  write(path: string, content: string | Buffer): Promise<void>;
  stat(path: string): Promise<unknown>;
  list(dir: string): Promise<unknown>;
}

export interface WindowClient {
  open(config: {
    title: string;
    width: number;
    height: number;
    url?: string;
    pluginId?: string;
    sessionId?: string;
    chrome?: WindowChromeOptions;
  }): Promise<unknown>;
  focus(windowId: string): Promise<void>;
  resize(windowId: string, width: number, height: number): Promise<void>;
  setState(windowId: string, state: 'normal' | 'minimized' | 'maximized' | 'fullscreen'): Promise<void>;
  getState(windowId: string): Promise<unknown>;
  close(windowId: string): Promise<void>;
}

export interface PluginClient {
  install(manifestPath: string): Promise<unknown>;
  enable(pluginId: string): Promise<void>;
  disable(pluginId: string): Promise<void>;
  uninstall(pluginId: string): Promise<void>;
  query(filter?: { type?: string; capability?: string }): Promise<unknown>;
}

export interface ConfigClient {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  batchSet(entries: Record<string, unknown>): Promise<void>;
  reset(key?: string): Promise<void>;
}

export const useTheme = (runtime: RuntimeClient): ThemeClient => {
  return {
    list: async (publisher) => runtime.invoke('theme.list', { publisher }),
    apply: async (id) => {
      await runtime.invoke('theme.apply', { id });
    },
    getCurrent: async (appId, pluginId) => runtime.invoke('theme.getCurrent', { appId, pluginId }),
    getAllCss: async () => {
      const result = await runtime.invoke<{ css: string; themeId: string }>('theme.getAllCss', {});
      return result.css;
    },
    resolve: async (chain) => runtime.invoke('theme.resolve', { chain }),
    contractGet: async (component) => runtime.invoke('theme.contract.get', { component })
  };
};

export const useI18n = (runtime: RuntimeClient): I18nClient => {
  return {
    getCurrent: async () => runtime.invoke('i18n.getCurrent', {}),
    setCurrent: async (locale: string) => {
      await runtime.invoke('i18n.setCurrent', { locale });
    },
    translate: async (key: string, params?: Record<string, unknown>) => runtime.invoke('i18n.translate', { key, params }),
    listLocales: async () => runtime.invoke('i18n.listLocales', {})
  };
};

export const useFile = (runtime: RuntimeClient): FileClient => {
  return {
    read: async (path: string, options?: { encoding?: BufferEncoding }) => runtime.invoke('file.read', { path, options }),
    write: async (path: string, content: string | Buffer) => {
      await runtime.invoke('file.write', { path, content });
    },
    stat: async (path: string) => runtime.invoke('file.stat', { path }),
    list: async (dir: string) => runtime.invoke('file.list', { dir })
  };
};

export const useWindow = (runtime: RuntimeClient): WindowClient => {
  return {
    open: async (config) => runtime.invoke('window.open', { config }),
    focus: async (windowId) => {
      await runtime.invoke('window.focus', { windowId });
    },
    resize: async (windowId, width, height) => {
      await runtime.invoke('window.resize', { windowId, width, height });
    },
    setState: async (windowId, state) => {
      await runtime.invoke('window.setState', { windowId, state });
    },
    getState: async (windowId) => runtime.invoke('window.getState', { windowId }),
    close: async (windowId) => {
      await runtime.invoke('window.close', { windowId });
    }
  };
};

export const usePlugin = (runtime: RuntimeClient): PluginClient => {
  return {
    install: async (manifestPath) => runtime.invoke('plugin.install', { manifestPath }),
    enable: async (pluginId) => {
      await runtime.invoke('plugin.enable', { pluginId });
    },
    disable: async (pluginId) => {
      await runtime.invoke('plugin.disable', { pluginId });
    },
    uninstall: async (pluginId) => {
      await runtime.invoke('plugin.uninstall', { pluginId });
    },
    query: async (filter) => runtime.invoke('plugin.query', filter ?? {})
  };
};

export const useConfig = (runtime: RuntimeClient): ConfigClient => {
  return {
    get: async (key) => runtime.invoke('config.get', { key }),
    set: async (key, value) => {
      await runtime.invoke('config.set', { key, value });
    },
    batchSet: async (entries) => {
      await runtime.invoke('config.batchSet', { entries });
    },
    reset: async (key) => {
      await runtime.invoke('config.reset', key ? { key } : {});
    }
  };
};

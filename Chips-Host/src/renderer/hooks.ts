import type { RuntimeClient } from './runtime-client';

export interface ThemeClient {
  list(publisher?: string): Promise<unknown>;
  apply(id: string): Promise<void>;
  getCurrent(appId?: string, pluginId?: string): Promise<unknown>;
  getAllCss(): Promise<string>;
  resolve(chain: string[]): Promise<unknown>;
  contractGet(component?: string): Promise<unknown>;
}

export const useTheme = (runtime: RuntimeClient): ThemeClient => {
  return {
    list: async (publisher) => runtime.invoke('theme.list', { publisher }),
    apply: async (id) => {
      await runtime.invoke('theme.apply', { id });
    },
    getCurrent: async (appId, pluginId) => runtime.invoke('theme.getCurrent', { appId, pluginId }),
    getAllCss: async () => runtime.invoke('theme.getAllCss', {}),
    resolve: async (chain) => runtime.invoke('theme.resolve', { chain }),
    contractGet: async (component) => runtime.invoke('theme.contract.get', { component })
  };
};

export const useI18n = (runtime: RuntimeClient) => {
  return {
    getCurrent: async () => runtime.invoke('i18n.getCurrent', {}),
    setCurrent: async (locale: string) => {
      await runtime.invoke('i18n.setCurrent', { locale });
    },
    translate: async (key: string, params?: Record<string, unknown>) => runtime.invoke('i18n.translate', { key, params }),
    listLocales: async () => runtime.invoke('i18n.listLocales', {})
  };
};

export const useFile = (runtime: RuntimeClient) => {
  return {
    read: async (path: string, options?: { encoding?: BufferEncoding }) => runtime.invoke('file.read', { path, options }),
    write: async (path: string, content: string | Buffer) => {
      await runtime.invoke('file.write', { path, content });
    },
    stat: async (path: string) => runtime.invoke('file.stat', { path }),
    list: async (dir: string) => runtime.invoke('file.list', { dir })
  };
};

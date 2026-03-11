import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export type PluginType = "app" | "card" | "layout" | "theme" | "module";

export type WindowChromeTitleBarStyle = "default" | "hidden" | "hiddenInset" | "customButtonsOnHover";

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

export interface PluginUiConfig {
  window?: {
    chrome?: WindowChromeOptions;
  };
}

export interface ThemePluginInfo {
  themeId: string;
  displayName: string;
  publisher?: string;
  parentTheme?: string;
  isDefault: boolean;
}

export interface LayoutPluginInfo {
  layoutType?: string;
  displayName: string;
}

export interface PluginInfo {
  id: string;
  manifestPath: string;
  enabled: boolean;
  version: string;
  type: PluginType;
  name: string;
  description?: string;
  installPath: string;
  capabilities?: string[];
  theme?: ThemePluginInfo;
  layout?: LayoutPluginInfo;
}

export interface PluginRecord extends PluginInfo {
  entry?: string | Record<string, string>;
  ui?: PluginUiConfig;
  installedAt: number;
}

export interface PluginApi {
  getSelf(): Promise<PluginInfo>;
  list(options?: { type?: PluginType; capability?: string }): Promise<PluginInfo[]>;
  get(pluginId: string): Promise<PluginInfo | undefined>;
  getCardPlugin(cardType: string): Promise<PluginInfo | undefined>;
  getLayoutPlugin(layoutType: string): Promise<PluginInfo | undefined>;
  install(manifestPath: string): Promise<{ pluginId: string }>;
  enable(pluginId: string): Promise<void>;
  disable(pluginId: string): Promise<void>;
  uninstall(pluginId: string): Promise<void>;
  /**
   * 查询当前主机已安装插件的运行时记录。
   * 该接口直接映射 Host `plugin.query` 动作。
   */
  query(options?: { type?: PluginType; capability?: string }): Promise<PluginRecord[]>;
}

export function createPluginApi(client: CoreClient): PluginApi {
  return {
    async getSelf() {
      const result = await client.invoke<Record<string, never>, { plugin: PluginInfo }>("plugin.getSelf", {});
      return result.plugin;
    },
    async list(options) {
      const result = await client.invoke<
        { type?: PluginType; capability?: string },
        { plugins: PluginInfo[] }
      >("plugin.list", options ?? {});
      return result.plugins;
    },
    async get(pluginId) {
      const result = await client.invoke<{ pluginId: string }, { plugin?: PluginInfo }>("plugin.get", {
        pluginId,
      });
      return result.plugin;
    },
    async getCardPlugin(cardType) {
      const result = await client.invoke<{ cardType: string }, { plugin?: PluginInfo }>("plugin.getCardPlugin", {
        cardType,
      });
      return result.plugin;
    },
    async getLayoutPlugin(layoutType) {
      const result = await client.invoke<{ layoutType: string }, { plugin?: PluginInfo }>("plugin.getLayoutPlugin", {
        layoutType,
      });
      return result.plugin;
    },
    async install(manifestPath) {
      if (!manifestPath) {
        throw createError("INVALID_ARGUMENT", "plugin.install: manifestPath is required.");
      }
      return client.invoke<{ manifestPath: string }, { pluginId: string }>("plugin.install", {
        manifestPath,
      });
    },
    async enable(pluginId) {
      if (!pluginId) {
        throw createError("INVALID_ARGUMENT", "plugin.enable: pluginId is required.");
      }
      await client.invoke("plugin.enable", { pluginId });
    },
    async disable(pluginId) {
      if (!pluginId) {
        throw createError("INVALID_ARGUMENT", "plugin.disable: pluginId is required.");
      }
      await client.invoke("plugin.disable", { pluginId });
    },
    async uninstall(pluginId) {
      if (!pluginId) {
        throw createError("INVALID_ARGUMENT", "plugin.uninstall: pluginId is required.");
      }
      await client.invoke("plugin.uninstall", { pluginId });
    },
    async query(options) {
      const result = await client.invoke<
        { type?: PluginType; capability?: string },
        { plugins: PluginRecord[] }
      >("plugin.query", options ?? {});
      return result.plugins;
    },
  };
}

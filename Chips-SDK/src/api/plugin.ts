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
  launcher?: {
    displayName?: string;
    icon?: string;
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

export interface PluginShortcutRecord {
  pluginId: string;
  name: string;
  location: "desktop" | "launchpad";
  launcherPath: string;
  executablePath: string;
  args: string[];
  iconPath?: string;
  exists: boolean;
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
  launch(pluginId: string, launchParams?: Record<string, unknown>): Promise<{
    window: { id: string };
    session: { sessionId: string; sessionNonce: string; permissions: string[] };
  }>;
  getShortcut(pluginId: string): Promise<PluginShortcutRecord>;
  createShortcut(pluginId: string, options?: { replace?: boolean }): Promise<PluginShortcutRecord>;
  removeShortcut(pluginId: string): Promise<{ removed: boolean; launcherPath: string; location: "desktop" | "launchpad" }>;
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
    async launch(pluginId, launchParams) {
      if (!pluginId) {
        throw createError("INVALID_ARGUMENT", "plugin.launch: pluginId is required.");
      }
      return client.invoke<
        { pluginId: string; launchParams?: Record<string, unknown> },
        {
          window: { id: string };
          session: { sessionId: string; sessionNonce: string; permissions: string[] };
        }
      >("plugin.launch", {
        pluginId,
        launchParams: launchParams ?? {},
      });
    },
    async getShortcut(pluginId) {
      if (!pluginId) {
        throw createError("INVALID_ARGUMENT", "plugin.getShortcut: pluginId is required.");
      }
      const result = await client.invoke<{ pluginId: string }, { shortcut: PluginShortcutRecord }>("plugin.getShortcut", {
        pluginId,
      });
      return result.shortcut;
    },
    async createShortcut(pluginId, options) {
      if (!pluginId) {
        throw createError("INVALID_ARGUMENT", "plugin.createShortcut: pluginId is required.");
      }
      const result = await client.invoke<
        { pluginId: string; replace?: boolean },
        { shortcut: PluginShortcutRecord }
      >("plugin.createShortcut", {
        pluginId,
        replace: options?.replace === true,
      });
      return result.shortcut;
    },
    async removeShortcut(pluginId) {
      if (!pluginId) {
        throw createError("INVALID_ARGUMENT", "plugin.removeShortcut: pluginId is required.");
      }
      return client.invoke<
        { pluginId: string },
        { removed: boolean; launcherPath: string; location: "desktop" | "launchpad" }
      >("plugin.removeShortcut", {
        pluginId,
      });
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

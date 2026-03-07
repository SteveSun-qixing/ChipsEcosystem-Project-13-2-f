import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export type PluginType = "app" | "card" | "layout" | "theme" | "module";

export interface PluginInfo {
  id: string;
  version: string;
  type: PluginType;
  name: string;
  description?: string;
  installPath: string;
  capabilities?: string[];
}

export interface PluginRecord {
  id: string;
  manifestPath: string;
  installPath: string;
  enabled: boolean;
  type: PluginType;
  capabilities: string[];
  entry: string;
  installedAt: string;
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
      return client.invoke("plugin.getSelf", {});
    },
    async list(options) {
      return client.invoke("plugin.list", options ?? {});
    },
    async get(pluginId) {
      const list = await client.invoke<{ pluginId: string }, PluginInfo | undefined>("plugin.get", {
        pluginId,
      });
      return list;
    },
    async getCardPlugin(cardType) {
      return client.invoke("plugin.getCardPlugin", { cardType });
    },
    async getLayoutPlugin(layoutType) {
      return client.invoke("plugin.getLayoutPlugin", { layoutType });
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

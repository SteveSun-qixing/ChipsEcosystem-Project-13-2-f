import type {
  BoxEntryPage,
  BoxEntryQuery,
  BoxEntrySnapshot,
  BoxSessionInfo,
  Client,
  PluginRecord,
  ResolvedRuntimeResource,
} from "chips-sdk";

export interface BoxLayoutRuntime {
  listEntries(query?: BoxEntryQuery): Promise<BoxEntryPage>;
  readEntryDetail(request: {
    entryIds: string[];
    fields: Array<"cardMetadata" | "coverDescriptor" | "previewDescriptor" | "runtimeProps" | "status">;
  }): Promise<Array<{ entryId: string; detail: Record<string, unknown> }>>;
  resolveEntryResource(request: {
    entryId: string;
    resource: {
      kind: "cover" | "preview" | "cardFile" | "custom";
      key?: string;
      sizeHint?: { width?: number; height?: number };
    };
  }): Promise<ResolvedRuntimeResource>;
  readBoxAsset(assetPath: string): Promise<ResolvedRuntimeResource>;
  prefetchEntries(request: {
    entryIds: string[];
    targets: Array<"cover" | "preview" | "cardMetadata">;
  }): Promise<void>;
}

export interface BoxLayoutRenderContext {
  container: HTMLElement;
  sessionId: string;
  box: BoxSessionInfo;
  initialView: BoxEntryPage;
  config: Record<string, unknown>;
  runtime: BoxLayoutRuntime;
  locale?: string;
}

export interface BoxLayoutDefinition {
  pluginId: string;
  layoutType: string;
  displayName: string;
  createDefaultConfig(): Record<string, unknown>;
  normalizeConfig(input: Record<string, unknown>): Record<string, unknown>;
  validateConfig(config: Record<string, unknown>): {
    valid: boolean;
    errors: Record<string, string>;
  };
  getInitialQuery?(config: Record<string, unknown>): BoxEntryQuery | undefined;
  renderView(ctx: BoxLayoutRenderContext): (() => void) | void;
  renderEditor?(ctx: {
    container: HTMLElement;
    entries: BoxEntrySnapshot[];
    initialConfig: Record<string, unknown>;
    onChange(next: Record<string, unknown>): void;
    readBoxAsset?(assetPath: string): Promise<ResolvedRuntimeResource>;
    importBoxAsset?(input: { file: File; preferredPath?: string }): Promise<{ assetPath: string }>;
    deleteBoxAsset?(assetPath: string): Promise<void>;
    locale?: string;
  }): (() => void) | void;
}

interface LayoutDefinitionModule {
  layoutDefinition?: BoxLayoutDefinition;
}

function toFileModuleUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`);
  }
  return encodeURI(`file://${normalized.startsWith("/") ? normalized : `/${normalized}`}`);
}

function isEnabledLayoutPlugin(record: PluginRecord, layoutType: string): boolean {
  return record.type === "layout"
    && record.enabled
    && typeof record.entry === "string"
    && record.entry.trim().length > 0
    && typeof record.installPath === "string"
    && record.installPath.trim().length > 0
    && record.layout?.layoutType === layoutType;
}

async function defaultLayoutModuleLoader(moduleUrl: string): Promise<LayoutDefinitionModule> {
  return import(/* @vite-ignore */ moduleUrl) as Promise<LayoutDefinitionModule>;
}

function toLayoutDefinition(plugin: PluginRecord, module: LayoutDefinitionModule): BoxLayoutDefinition {
  const definition = module.layoutDefinition;
  if (!definition) {
    throw new Error(`布局插件未导出 layoutDefinition: ${plugin.id}`);
  }
  if (definition.layoutType !== plugin.layout?.layoutType) {
    throw new Error(`布局插件 layoutType 与 manifest 不一致: ${plugin.id}`);
  }
  if (typeof definition.renderView !== "function") {
    throw new Error(`布局插件缺少 renderView: ${plugin.id}`);
  }
  if (typeof definition.createDefaultConfig !== "function" || typeof definition.normalizeConfig !== "function") {
    throw new Error(`布局插件缺少配置工厂: ${plugin.id}`);
  }
  if (typeof definition.validateConfig !== "function") {
    throw new Error(`布局插件缺少 validateConfig: ${plugin.id}`);
  }
  return definition;
}

export async function loadLayoutDefinition(
  client: Client,
  layoutType: string,
): Promise<BoxLayoutDefinition> {
  const installedPlugins = await client.plugin.query({ type: "layout" });
  const plugin = installedPlugins.find((record) => isEnabledLayoutPlugin(record, layoutType));
  if (!plugin || typeof plugin.entry !== "string") {
    throw new Error(`未找到已启用的布局插件: ${layoutType}`);
  }
  const entryPath = `${plugin.installPath}/${plugin.entry}`.replace(/\\/g, "/").replace(/\/+/g, "/");
  const moduleUrl = toFileModuleUrl(entryPath);
  const loaded = await defaultLayoutModuleLoader(moduleUrl);
  return toLayoutDefinition(plugin, loaded);
}

export function createBoxLayoutRuntime(client: Client, sessionId: string): BoxLayoutRuntime {
  return {
    listEntries(query) {
      return client.box.listEntries(sessionId, query);
    },
    readEntryDetail(request) {
      return client.box.readEntryDetail(sessionId, request.entryIds, request.fields);
    },
    resolveEntryResource(request) {
      return client.box.resolveEntryResource(sessionId, request.entryId, request.resource);
    },
    readBoxAsset(assetPath) {
      return client.box.readBoxAsset(sessionId, assetPath);
    },
    async prefetchEntries(request) {
      await client.box.prefetchEntries(sessionId, request.entryIds, request.targets);
    },
  };
}

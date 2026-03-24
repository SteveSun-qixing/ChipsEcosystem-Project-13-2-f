import type {
  BoxContent,
  BoxEntryCoverView as SdkBoxEntryCoverView,
  BoxEntryDetailField,
  BoxEntryPage,
  BoxEntryQuery,
  BoxEntrySnapshot,
  BoxEntryOpenResult,
  BoxEntryResourceKind,
  BoxPrefetchTarget,
  BoxSessionInfo,
  Client,
  PluginRecord,
  ResolvedRuntimeResource,
} from 'chips-sdk';

export type BoxEntryCoverView = SdkBoxEntryCoverView;

export interface BoxLayoutRuntime {
  listEntries(query?: BoxEntryQuery): Promise<BoxEntryPage>;
  readEntryDetail(request: {
    entryIds: string[];
    fields: BoxEntryDetailField[];
  }): Promise<Array<{ entryId: string; detail: Record<string, unknown> }>>;
  renderEntryCover(entryId: string): Promise<BoxEntryCoverView>;
  resolveEntryResource(request: {
    entryId: string;
    resource: {
      kind: BoxEntryResourceKind;
      key?: string;
      sizeHint?: {
        width?: number;
        height?: number;
      };
    };
  }): Promise<ResolvedRuntimeResource>;
  readBoxAsset(assetPath: string): Promise<ResolvedRuntimeResource>;
  prefetchEntries(request: {
    entryIds: string[];
    targets: BoxPrefetchTarget[];
  }): Promise<void>;
  openEntry(entryId: string): Promise<BoxEntryOpenResult>;
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

export interface BoxLayoutEditorContext {
  container: HTMLElement;
  entries: BoxEntrySnapshot[];
  initialConfig: Record<string, unknown>;
  onChange(next: Record<string, unknown>): void;
  readBoxAsset?(assetPath: string): Promise<ResolvedRuntimeResource>;
  importBoxAsset?(input: { file: File; preferredPath?: string }): Promise<{ assetPath: string }>;
  deleteBoxAsset?(assetPath: string): Promise<void>;
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
  renderEditor?(ctx: BoxLayoutEditorContext): (() => void) | void;
}

export interface LoadedLayoutDescriptor {
  plugin: PluginRecord;
  moduleUrl: string;
  layoutDefinition: BoxLayoutDefinition;
}

export interface InMemoryBoxLayoutRuntimeOptions {
  getEntries(): BoxEntrySnapshot[];
  readBoxAsset(assetPath: string): Promise<ResolvedRuntimeResource>;
  renderEntryCover?(entryId: string): Promise<BoxEntryCoverView>;
  openEntry?(entryId: string): Promise<BoxEntryOpenResult>;
}

export declare function clearLayoutDefinitionCache(): void;
export declare function loadLayoutDescriptor(client: Client, layoutType: string): Promise<LoadedLayoutDescriptor>;
export declare function loadLayoutDefinition(client: Client, layoutType: string): Promise<BoxLayoutDefinition>;
export declare function createBoxLayoutRuntime(client: Client, sessionId: string): BoxLayoutRuntime;
export declare function createInMemoryBoxLayoutRuntime(options: InMemoryBoxLayoutRuntimeOptions): BoxLayoutRuntime;

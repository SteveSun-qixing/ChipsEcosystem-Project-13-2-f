import type {
  BoxContent,
  BoxEntryDetailField,
  BoxEntryOpenResult,
  BoxEntryPage,
  BoxEntryQuery,
  BoxEntryResourceKind,
  BoxEntrySnapshot,
  BoxPrefetchTarget,
  BoxSessionInfo,
  Client,
  IconDescriptor,
  PluginRecord,
  ResolvedRuntimeResource,
} from 'chips-sdk';

export type BoxLayoutConfigRecord = Record<string, unknown>;

export interface BoxLayoutValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface BoxLayoutRuntime {
  listEntries(query?: BoxEntryQuery): Promise<BoxEntryPage>;
  readEntryDetail(request: {
    entryIds: string[];
    fields: BoxEntryDetailField[];
  }): Promise<Array<{ entryId: string; detail: Record<string, unknown> }>>;
  renderEntryCover(entryId: string): Promise<{
    title: string;
    coverUrl: string;
    mimeType: string;
    ratio?: string;
  }>;
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
  config: BoxLayoutConfigRecord;
  runtime: BoxLayoutRuntime;
  locale?: string;
}

export interface BoxLayoutEditorContext {
  container: HTMLElement;
  entries: BoxEntrySnapshot[];
  initialConfig: BoxLayoutConfigRecord;
  onChange(next: BoxLayoutConfigRecord): void;
  readBoxAsset?(assetPath: string): Promise<ResolvedRuntimeResource>;
  importBoxAsset?(input: { file: File; preferredPath?: string }): Promise<{ assetPath: string }>;
  deleteBoxAsset?(assetPath: string): Promise<void>;
  locale?: string;
}

export interface BoxLayoutDescriptor {
  pluginId: string;
  layoutType: string;
  displayName: string;
  description?: string;
  icon?: IconDescriptor;
  createDefaultConfig(): BoxLayoutConfigRecord;
  normalizeConfig(input: BoxLayoutConfigRecord): BoxLayoutConfigRecord;
  validateConfig(config: BoxLayoutConfigRecord): BoxLayoutValidationResult;
  getInitialQuery?(config: BoxLayoutConfigRecord): BoxEntryQuery | undefined;
  renderView(ctx: BoxLayoutRenderContext): (() => void) | void;
  renderEditor?(ctx: BoxLayoutEditorContext): (() => void) | void;
}

export interface LoadedLayoutDescriptor {
  plugin?: PluginRecord;
  moduleUrl?: string;
  layoutDescriptor: BoxLayoutDescriptor;
}

export interface InMemoryBoxLayoutRuntimeOptions {
  getEntries(): BoxEntrySnapshot[];
  readBoxAsset(assetPath: string): Promise<ResolvedRuntimeResource>;
  renderEntryCover?(entryId: string): Promise<{
    title: string;
    coverUrl: string;
    mimeType: string;
    ratio?: string;
  }>;
  openEntry?(entryId: string): Promise<BoxEntryOpenResult>;
}

export interface BoxLayoutDefinitionModule {
  layoutDefinition?: BoxLayoutDescriptor;
}

export type BoxLayoutModuleLoader = (moduleUrl: string) => Promise<BoxLayoutDefinitionModule>;

export type LayoutDescriptorMap = Map<string, BoxLayoutDescriptor>;
export type LayoutPluginClient = Pick<Client, 'plugin'>;
export type LayoutContent = BoxContent;

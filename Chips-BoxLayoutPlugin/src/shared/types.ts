export interface ResolvedRuntimeResource {
  url?: string;
  mimeType?: string;
  assetPath?: string;
  status?: "ready" | "missing" | "forbidden" | "error";
}

export interface BoxSessionInfo {
  boxId: string;
  boxFile: string;
  name: string;
  activeLayoutType: string;
  availableLayouts: string[];
  tags?: Array<string | string[]>;
  coverAsset?: string;
}

export interface BoxEntrySnapshot {
  entryId: string;
  url: string;
  enabled: boolean;
  snapshot: {
    cardId?: string;
    title?: string;
    summary?: string;
    tags?: Array<string | string[]>;
    cover?: {
      mode: "asset" | "runtime" | "none";
      assetPath?: string;
      mimeType?: string;
      width?: number;
      height?: number;
    };
    lastKnownModifiedAt?: string;
    contentType?: string;
  };
  layoutHints?: {
    sortKey?: string | number;
    aspectRatio?: number;
    group?: string;
    priority?: number;
  };
}

export interface BoxEntryPage {
  items: BoxEntrySnapshot[];
  total: number;
  nextCursor?: string;
}

export interface BoxEntryQuery {
  cursor?: string;
  limit?: number;
  filter?: Record<string, unknown>;
  sort?: {
    key: string;
    direction: "asc" | "desc";
  };
}

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

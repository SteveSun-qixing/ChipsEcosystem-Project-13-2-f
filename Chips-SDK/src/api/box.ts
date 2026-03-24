import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export type BoxTag = string | string[];
export type BoxEntryDetailField = "cardMetadata" | "coverDescriptor" | "previewDescriptor" | "runtimeProps" | "status";
export type BoxEntryResourceKind = "cover" | "preview" | "cardFile" | "custom";
export type BoxPrefetchTarget = "cover" | "preview" | "cardMetadata";

export interface BoxValidationResult {
  valid: boolean;
  errors: string[];
}

export interface BoxMetadata {
  chipStandardsVersion: string;
  boxId: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  activeLayoutType: string;
  description?: string;
  tags?: BoxTag[];
  coverAsset?: string;
  owner?: string;
  source?: Record<string, unknown>;
}

export interface BoxEntrySnapshot {
  entryId: string;
  url: string;
  enabled: boolean;
  snapshot: {
    cardId?: string;
    title?: string;
    summary?: string;
    tags?: BoxTag[];
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

export interface BoxLayoutConfig {
  schemaVersion?: string;
  props?: Record<string, unknown>;
  assetRefs?: string[];
  [key: string]: unknown;
}

export interface BoxContent {
  activeLayoutType: string;
  layoutConfigs: Record<string, BoxLayoutConfig>;
}

export interface BoxInspectionResult {
  metadata: BoxMetadata;
  content: BoxContent;
  entries: BoxEntrySnapshot[];
  assets: string[];
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

export interface BoxEntryPage {
  items: BoxEntrySnapshot[];
  total: number;
  nextCursor?: string;
}

export interface BoxSessionInfo {
  boxId: string;
  boxFile: string;
  name: string;
  activeLayoutType: string;
  availableLayouts: string[];
  tags?: BoxTag[];
  coverAsset?: string;
  capabilities: {
    listEntries: true;
    readEntryDetail: true;
    resolveEntryResource: true;
    readBoxAsset: true;
    prefetchEntries: true;
  };
}

export interface BoxOpenViewResult {
  sessionId: string;
  box: BoxSessionInfo;
  initialView: BoxEntryPage;
}

export interface ResolvedRuntimeResource {
  resourceUrl: string;
  mimeType: string;
  cacheKey?: string;
  expiresAt?: string;
  width?: number;
  height?: number;
}

export interface BoxEntryDetailItem {
  entryId: string;
  detail: Record<string, unknown>;
}

export interface BoxApi {
  pack(boxDir: string, options?: { outputPath?: string }): Promise<string>;
  unpack(boxFile: string, outputDir: string): Promise<string>;
  inspect(boxFile: string): Promise<BoxInspectionResult>;
  validate(boxFile: string): Promise<BoxValidationResult>;
  readMetadata(boxFile: string): Promise<BoxMetadata>;
  openView(boxFile: string, options?: { layoutType?: string; initialQuery?: BoxEntryQuery }): Promise<BoxOpenViewResult>;
  listEntries(sessionId: string, query?: BoxEntryQuery): Promise<BoxEntryPage>;
  readEntryDetail(sessionId: string, entryIds: string[], fields: BoxEntryDetailField[]): Promise<BoxEntryDetailItem[]>;
  resolveEntryResource(
    sessionId: string,
    entryId: string,
    resource: {
      kind: BoxEntryResourceKind;
      key?: string;
      sizeHint?: {
        width?: number;
        height?: number;
      };
    },
  ): Promise<ResolvedRuntimeResource>;
  readBoxAsset(sessionId: string, assetPath: string): Promise<ResolvedRuntimeResource>;
  prefetchEntries(sessionId: string, entryIds: string[], targets: BoxPrefetchTarget[]): Promise<void>;
  closeView(sessionId: string): Promise<void>;
}

export function createBoxApi(client: CoreClient): BoxApi {
  return {
    async pack(boxDir, options) {
      if (!boxDir) {
        throw createError("INVALID_ARGUMENT", "box.pack: boxDir is required.");
      }
      const result = await client.invoke<{ boxDir: string; outputPath?: string }, { boxFile: string }>("box.pack", {
        boxDir,
        outputPath: options?.outputPath,
      });
      return result.boxFile;
    },
    async unpack(boxFile, outputDir) {
      if (!boxFile || !outputDir) {
        throw createError("INVALID_ARGUMENT", "box.unpack: boxFile and outputDir are both required.");
      }
      const result = await client.invoke<{ boxFile: string; outputDir: string }, { outputDir: string }>("box.unpack", {
        boxFile,
        outputDir,
      });
      return result.outputDir;
    },
    async inspect(boxFile) {
      if (!boxFile) {
        throw createError("INVALID_ARGUMENT", "box.inspect: boxFile is required.");
      }
      const result = await client.invoke<{ boxFile: string }, { inspection: BoxInspectionResult }>("box.inspect", { boxFile });
      return result.inspection;
    },
    async validate(boxFile) {
      if (!boxFile) {
        throw createError("INVALID_ARGUMENT", "box.validate: boxFile is required.");
      }
      const result = await client.invoke<{ boxFile: string }, { validationResult: BoxValidationResult }>("box.validate", { boxFile });
      return result.validationResult;
    },
    async readMetadata(boxFile) {
      if (!boxFile) {
        throw createError("INVALID_ARGUMENT", "box.readMetadata: boxFile is required.");
      }
      const result = await client.invoke<{ boxFile: string }, { metadata: BoxMetadata }>("box.readMetadata", { boxFile });
      return result.metadata;
    },
    async openView(boxFile, options) {
      if (!boxFile) {
        throw createError("INVALID_ARGUMENT", "box.openView: boxFile is required.");
      }
      return client.invoke<
        { boxFile: string; layoutType?: string; initialQuery?: BoxEntryQuery },
        BoxOpenViewResult
      >("box.openView", {
        boxFile,
        layoutType: options?.layoutType,
        initialQuery: options?.initialQuery,
      });
    },
    async listEntries(sessionId, query) {
      if (!sessionId) {
        throw createError("INVALID_ARGUMENT", "box.listEntries: sessionId is required.");
      }
      const result = await client.invoke<{ sessionId: string; query?: BoxEntryQuery }, { page: BoxEntryPage }>("box.listEntries", {
        sessionId,
        query,
      });
      return result.page;
    },
    async readEntryDetail(sessionId, entryIds, fields) {
      if (!sessionId) {
        throw createError("INVALID_ARGUMENT", "box.readEntryDetail: sessionId is required.");
      }
      if (!Array.isArray(entryIds) || entryIds.length === 0) {
        throw createError("INVALID_ARGUMENT", "box.readEntryDetail: entryIds must be a non-empty array.");
      }
      if (!Array.isArray(fields) || fields.length === 0) {
        throw createError("INVALID_ARGUMENT", "box.readEntryDetail: fields must be a non-empty array.");
      }
      const result = await client.invoke<
        { sessionId: string; entryIds: string[]; fields: BoxEntryDetailField[] },
        { items: BoxEntryDetailItem[] }
      >("box.readEntryDetail", {
        sessionId,
        entryIds,
        fields,
      });
      return result.items;
    },
    async resolveEntryResource(sessionId, entryId, resource) {
      if (!sessionId || !entryId) {
        throw createError("INVALID_ARGUMENT", "box.resolveEntryResource: sessionId and entryId are required.");
      }
      if (!resource?.kind) {
        throw createError("INVALID_ARGUMENT", "box.resolveEntryResource: resource.kind is required.");
      }
      const result = await client.invoke<
        {
          sessionId: string;
          entryId: string;
          resource: {
            kind: BoxEntryResourceKind;
            key?: string;
            sizeHint?: {
              width?: number;
              height?: number;
            };
          };
        },
        { resource: ResolvedRuntimeResource }
      >("box.resolveEntryResource", {
        sessionId,
        entryId,
        resource,
      });
      return result.resource;
    },
    async readBoxAsset(sessionId, assetPath) {
      if (!sessionId || !assetPath) {
        throw createError("INVALID_ARGUMENT", "box.readBoxAsset: sessionId and assetPath are required.");
      }
      const result = await client.invoke<
        { sessionId: string; assetPath: string },
        { resource: ResolvedRuntimeResource }
      >("box.readBoxAsset", {
        sessionId,
        assetPath,
      });
      return result.resource;
    },
    async prefetchEntries(sessionId, entryIds, targets) {
      if (!sessionId) {
        throw createError("INVALID_ARGUMENT", "box.prefetchEntries: sessionId is required.");
      }
      if (!Array.isArray(entryIds) || entryIds.length === 0) {
        throw createError("INVALID_ARGUMENT", "box.prefetchEntries: entryIds must be a non-empty array.");
      }
      if (!Array.isArray(targets) || targets.length === 0) {
        throw createError("INVALID_ARGUMENT", "box.prefetchEntries: targets must be a non-empty array.");
      }
      await client.invoke("box.prefetchEntries", {
        sessionId,
        entryIds,
        targets,
      });
    },
    async closeView(sessionId) {
      if (!sessionId) {
        throw createError("INVALID_ARGUMENT", "box.closeView: sessionId is required.");
      }
      await client.invoke("box.closeView", { sessionId });
    },
  };
}

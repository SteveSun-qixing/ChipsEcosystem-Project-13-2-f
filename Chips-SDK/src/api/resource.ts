import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface ResourceUri {
  uri: string;
}

export interface ResourceOpenRequest {
  intent?: string;
  resource: {
    resourceId: string;
    mimeType?: string;
    title?: string;
    fileName?: string;
  };
}

export interface ResourceOpenResolvedResource {
  resourceId: string;
  filePath?: string;
  mimeType?: string;
  extension?: string;
  fileName?: string;
}

export interface ResourceOpenResult {
  mode: "plugin" | "shell" | "external";
  pluginId?: string;
  windowId?: string;
  matchedCapability?: string;
  resolved: ResourceOpenResolvedResource;
}

export interface ResourceMeta {
  id: string;
  mimeType: string;
  size: number;
  [key: string]: unknown;
}

export interface ResourceApi {
  resolve(resourceId: string): Promise<ResourceUri>;
  open(request: ResourceOpenRequest): Promise<ResourceOpenResult>;
  readMetadata(resourceId: string): Promise<ResourceMeta>;
  readBinary(resourceId: string): Promise<ArrayBuffer>;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function createResourceApi(client: CoreClient): ResourceApi {
  return {
    async resolve(resourceId) {
      if (!resourceId) {
        throw createError("INVALID_ARGUMENT", "resource.resolve: resourceId is required.");
      }
      return client.invoke("resource.resolve", { resourceId });
    },
    async open(request) {
      if (!request?.resource || typeof request.resource !== "object") {
        throw createError("INVALID_ARGUMENT", "resource.open: request.resource is required.");
      }
      const resourceId = normalizeOptionalString(request.resource.resourceId);
      if (!resourceId) {
        throw createError("INVALID_ARGUMENT", "resource.open: resource.resourceId is required.");
      }
      const payload: ResourceOpenRequest = {
        ...(normalizeOptionalString(request.intent) ? { intent: normalizeOptionalString(request.intent) } : undefined),
        resource: {
          resourceId,
          ...(normalizeOptionalString(request.resource.mimeType)
            ? { mimeType: normalizeOptionalString(request.resource.mimeType) }
            : undefined),
          ...(normalizeOptionalString(request.resource.title)
            ? { title: normalizeOptionalString(request.resource.title) }
            : undefined),
          ...(normalizeOptionalString(request.resource.fileName)
            ? { fileName: normalizeOptionalString(request.resource.fileName) }
            : undefined),
        },
      };
      const result = await client.invoke<ResourceOpenRequest, { result: ResourceOpenResult }>("resource.open", payload);
      return result.result;
    },
    async readMetadata(resourceId) {
      if (!resourceId) {
        throw createError("INVALID_ARGUMENT", "resource.readMetadata: resourceId is required.");
      }
      return client.invoke("resource.readMetadata", { resourceId });
    },
    async readBinary(resourceId) {
      if (!resourceId) {
        throw createError("INVALID_ARGUMENT", "resource.readBinary: resourceId is required.");
      }
      return client.invoke("resource.readBinary", { resourceId });
    },
  };
}

import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface ResourceUri {
  uri: string;
}

export interface ResourceMeta {
  id: string;
  mimeType: string;
  size: number;
  [key: string]: unknown;
}

export interface ResourceApi {
  resolve(resourceId: string): Promise<ResourceUri>;
  readMetadata(resourceId: string): Promise<ResourceMeta>;
  readBinary(resourceId: string): Promise<ArrayBuffer>;
}

export function createResourceApi(client: CoreClient): ResourceApi {
  return {
    async resolve(resourceId) {
      if (!resourceId) {
        throw createError("INVALID_ARGUMENT", "resource.resolve: resourceId is required.");
      }
      return client.invoke("resource.resolve", { resourceId });
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


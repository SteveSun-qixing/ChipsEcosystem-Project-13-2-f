import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface ConfigApi {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  batchSet(entries: Array<{ key: string; value: unknown }>): Promise<void>;
  reset(key?: string): Promise<void>;
}

export function createConfigApi(client: CoreClient): ConfigApi {
  return {
    async get(key) {
      if (!key) {
        throw createError("INVALID_ARGUMENT", "config.get: key is required.");
      }
      return client.invoke("config.get", { key });
    },
    async set(key, value) {
      if (!key) {
        throw createError("INVALID_ARGUMENT", "config.set: key is required.");
      }
      return client.invoke("config.set", { key, value });
    },
    async batchSet(entries) {
      if (!Array.isArray(entries)) {
        throw createError("INVALID_ARGUMENT", "config.batchSet: entries must be an array.");
      }
      return client.invoke("config.batchSet", { entries });
    },
    async reset(key) {
      return client.invoke("config.reset", key ? { key } : {});
    },
  };
}


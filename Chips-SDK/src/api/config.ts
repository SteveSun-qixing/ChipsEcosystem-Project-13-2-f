import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export type ConfigScope = "user" | "workspace" | "system";

export interface ConfigWriteOptions {
  scope?: ConfigScope;
}

export interface ConfigApi {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T, options?: ConfigWriteOptions): Promise<void>;
  batchSet(entries: Record<string, unknown>, options?: ConfigWriteOptions): Promise<void>;
  reset(key?: string, options?: ConfigWriteOptions): Promise<void>;
}

function normalizeScope(scope: ConfigScope | undefined, action: string): ConfigScope | undefined {
  if (typeof scope === "undefined") {
    return undefined;
  }
  if (scope !== "user" && scope !== "workspace" && scope !== "system") {
    throw createError("INVALID_ARGUMENT", `${action}: scope must be one of user/workspace/system.`);
  }
  return scope;
}

function assertPlainEntries(entries: unknown): asserts entries is Record<string, unknown> {
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    throw createError("INVALID_ARGUMENT", "config.batchSet: entries must be an object.");
  }
}

export function createConfigApi(client: CoreClient): ConfigApi {
  return {
    async get<T = unknown>(key: string) {
      if (!key) {
        throw createError("INVALID_ARGUMENT", "config.get: key is required.");
      }
      const result = await client.invoke<{ key: string }, { value?: unknown }>("config.get", { key });
      return result.value as T | undefined;
    },
    async set(key, value, options) {
      if (!key) {
        throw createError("INVALID_ARGUMENT", "config.set: key is required.");
      }
      const scope = normalizeScope(options?.scope, "config.set");
      await client.invoke("config.set", {
        key,
        value,
        ...(scope ? { scope } : undefined),
      });
    },
    async batchSet(entries, options) {
      assertPlainEntries(entries);
      const scope = normalizeScope(options?.scope, "config.batchSet");
      await client.invoke("config.batchSet", {
        entries,
        ...(scope ? { scope } : undefined),
      });
    },
    async reset(key, options) {
      const scope = normalizeScope(options?.scope, "config.reset");
      await client.invoke("config.reset", {
        ...(key ? { key } : undefined),
        ...(scope ? { scope } : undefined),
      });
    },
  };
}

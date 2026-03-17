import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface ModuleState {
  slot: string;
  moduleId: string;
  entry?: string | Record<string, string>;
  capabilities?: string[];
  requiredCapabilities?: string[];
  mountedByPluginId?: string;
  bridgeScopeToken?: string;
  active: boolean;
  mountedAt: number;
  [key: string]: unknown;
}

export interface ModuleMountOptions {
  requiredCapabilities?: string[];
}

export interface ModuleApi {
  mount(slot: string, moduleId: string, options?: ModuleMountOptions): Promise<ModuleState>;
  unmount(slot: string): Promise<void>;
  query(slot: string): Promise<ModuleState | undefined>;
  list(): Promise<ModuleState[]>;
}

const MODULE_SLOT_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/;

function assertValidSlot(slot: string, action: string): void {
  if (!slot) {
    throw createError("INVALID_ARGUMENT", `${action}: slot is required.`);
  }
  if (!MODULE_SLOT_PATTERN.test(slot)) {
    throw createError(
      "INVALID_ARGUMENT",
      `${action}: slot must use namespaced dot format, e.g. viewer.preview.`,
    );
  }
}

function normalizeRequiredCapabilities(
  requiredCapabilities: string[] | undefined,
): string[] | undefined {
  if (typeof requiredCapabilities === "undefined") {
    return undefined;
  }
  if (!Array.isArray(requiredCapabilities)) {
    throw createError(
      "INVALID_ARGUMENT",
      "module.mount: requiredCapabilities must be an array of strings.",
    );
  }
  const normalized = requiredCapabilities
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  if (normalized.length !== requiredCapabilities.length) {
    throw createError(
      "INVALID_ARGUMENT",
      "module.mount: requiredCapabilities must contain non-empty strings only.",
    );
  }
  return normalized;
}

export function createModuleApi(client: CoreClient): ModuleApi {
  return {
    async mount(slot, moduleId, options) {
      assertValidSlot(slot, "module.mount");
      if (!moduleId) {
        throw createError("INVALID_ARGUMENT", "module.mount: moduleId is required.");
      }
      const requiredCapabilities = normalizeRequiredCapabilities(options?.requiredCapabilities);
      const result = await client.invoke<
        { slot: string; moduleId: string; requiredCapabilities?: string[] },
        { module: ModuleState }
      >(
        "module.mount",
        { slot, moduleId, requiredCapabilities },
      );
      return result.module;
    },
    async unmount(slot) {
      assertValidSlot(slot, "module.unmount");
      await client.invoke("module.unmount", { slot });
    },
    async query(slot) {
      assertValidSlot(slot, "module.query");
      const result = await client.invoke<{ slot: string }, { module: ModuleState | null }>("module.query", { slot });
      return result.module ?? undefined;
    },
    async list() {
      const result = await client.invoke<Record<string, never>, { modules: ModuleState[] }>("module.list", {});
      return result.modules;
    },
  };
}

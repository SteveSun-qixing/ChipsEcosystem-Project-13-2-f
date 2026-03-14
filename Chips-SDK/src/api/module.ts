import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface ModuleState {
  slot: string;
  moduleId: string;
  entry?: string | Record<string, string>;
  capabilities?: string[];
  active: boolean;
  mountedAt: number;
  [key: string]: unknown;
}

export interface ModuleApi {
  mount(slot: string, moduleId: string): Promise<ModuleState>;
  unmount(slot: string): Promise<void>;
  query(slot: string): Promise<ModuleState | undefined>;
  list(): Promise<ModuleState[]>;
}

export function createModuleApi(client: CoreClient): ModuleApi {
  return {
    async mount(slot, moduleId) {
      if (!slot) {
        throw createError("INVALID_ARGUMENT", "module.mount: slot is required.");
      }
      if (!moduleId) {
        throw createError("INVALID_ARGUMENT", "module.mount: moduleId is required.");
      }
      const result = await client.invoke<{ slot: string; moduleId: string }, { module: ModuleState }>(
        "module.mount",
        { slot, moduleId },
      );
      return result.module;
    },
    async unmount(slot) {
      if (!slot) {
        throw createError("INVALID_ARGUMENT", "module.unmount: slot is required.");
      }
      await client.invoke("module.unmount", { slot });
    },
    async query(slot) {
      if (!slot) {
        throw createError("INVALID_ARGUMENT", "module.query: slot is required.");
      }
      const result = await client.invoke<{ slot: string }, { module: ModuleState | null }>("module.query", { slot });
      return result.module ?? undefined;
    },
    async list() {
      const result = await client.invoke<Record<string, never>, { modules: ModuleState[] }>("module.list", {});
      return result.modules;
    },
  };
}

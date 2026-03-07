import type { CoreClient } from "../types/client";

export interface ModuleState {
  slot: string;
  moduleId: string;
  active: boolean;
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
      return client.invoke("module.mount", { slot, moduleId });
    },
    async unmount(slot) {
      return client.invoke("module.unmount", { slot });
    },
    async query(slot) {
      return client.invoke("module.query", { slot });
    },
    async list() {
      return client.invoke("module.list", {});
    },
  };
}


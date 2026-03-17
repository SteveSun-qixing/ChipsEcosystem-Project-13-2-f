import { createClient, type Client, type ClientConfig } from "chips-sdk";
import { mountModule } from "./module/runtime";

export function createModuleClient(
  config?: ClientConfig & { bridgeScopeToken?: string }
): Client {
  if (config?.bridgeScopeToken) {
    const { bridgeScopeToken, ...rest } = config;
    return createClient({
      ...rest,
      bridgeScope: {
        token: bridgeScopeToken,
      },
    });
  }
  return createClient(config);
}

export { mountModule };

export type {
  ModuleFeatureItem,
  ModuleFeatureState,
  ModuleFeatureTone,
  ModuleHandle,
  ModuleMountContext,
  ModuleRuntimeBootState,
  ModuleSnapshot,
} from "./module/types";

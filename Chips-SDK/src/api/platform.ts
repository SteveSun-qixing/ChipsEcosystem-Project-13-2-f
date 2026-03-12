import type { CoreClient } from "../types/client";

export interface PlatformInfo {
  os: string;
  arch: string;
  version: string;
  locale?: string;
}

export interface PlatformCapabilities {
  [key: string]: boolean;
}

export interface PlatformLaunchContext {
  pluginId?: string;
  sessionId?: string;
  launchParams: Record<string, unknown>;
}

export interface PlatformApi {
  getInfo(): Promise<PlatformInfo>;
  getCapabilities(): Promise<PlatformCapabilities>;
  openExternal(url: string): Promise<void>;
  getPathForFile(file: unknown): string;
  getLaunchContext(): PlatformLaunchContext;
}

const resolveBridgePathForFile = (file: unknown): string => {
  const bridge = (
    typeof window !== "undefined"
      ? (window as Window & { chips?: { platform?: { getPathForFile?: (input: unknown) => string } } })
      : undefined
  )?.chips;
  const getPathForFile = bridge?.platform?.getPathForFile;
  if (typeof getPathForFile !== "function") {
    return "";
  }

  try {
    return getPathForFile(file);
  } catch {
    return "";
  }
};

const resolveBridgeLaunchContext = (): PlatformLaunchContext => {
  const bridge = (
    typeof window !== "undefined"
      ? (window as Window & {
          chips?: { platform?: { getLaunchContext?: () => Partial<PlatformLaunchContext> | undefined } };
        })
      : undefined
  )?.chips;
  const getLaunchContext = bridge?.platform?.getLaunchContext;
  if (typeof getLaunchContext !== "function") {
    return { launchParams: {} };
  }

  try {
    const raw = getLaunchContext();
    return {
      pluginId: typeof raw?.pluginId === "string" ? raw.pluginId : undefined,
      sessionId: typeof raw?.sessionId === "string" ? raw.sessionId : undefined,
      launchParams:
        raw?.launchParams && typeof raw.launchParams === "object" && !Array.isArray(raw.launchParams)
          ? { ...(raw.launchParams as Record<string, unknown>) }
          : {},
    };
  } catch {
    return { launchParams: {} };
  }
};

export function createPlatformApi(client: CoreClient): PlatformApi {
  return {
    async getInfo() {
      return client.invoke("platform.getInfo", {});
    },
    async getCapabilities() {
      return client.invoke("platform.getCapabilities", {});
    },
    async openExternal(url) {
      return client.invoke("platform.openExternal", { url });
    },
    getPathForFile(file) {
      return resolveBridgePathForFile(file);
    },
    getLaunchContext() {
      return resolveBridgeLaunchContext();
    },
  };
}

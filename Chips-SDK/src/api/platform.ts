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

export interface PlatformApi {
  getInfo(): Promise<PlatformInfo>;
  getCapabilities(): Promise<PlatformCapabilities>;
  openExternal(url: string): Promise<void>;
  getPathForFile(file: unknown): string;
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
  };
}

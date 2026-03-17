import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

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

export interface PlatformDialogFileOptions {
  defaultPath?: string;
  mode?: "file" | "directory";
  allowMultiple?: boolean;
  mustExist?: boolean;
  title?: string;
}

export interface PlatformDialogSaveOptions {
  defaultPath?: string;
  title?: string;
}

export interface PlatformDialogMessageOptions {
  title?: string;
  message: string;
  detail?: string;
}

export interface PlatformApi {
  getInfo(): Promise<PlatformInfo>;
  getCapabilities(): Promise<PlatformCapabilities>;
  openExternal(url: string): Promise<void>;
  openFile(options?: PlatformDialogFileOptions): Promise<string[] | null>;
  saveFile(options?: PlatformDialogSaveOptions): Promise<string | null>;
  showMessage(options: PlatformDialogMessageOptions): Promise<number>;
  showConfirm(options: PlatformDialogMessageOptions): Promise<boolean>;
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
    async openFile(options) {
      const result = await client.invoke<
        { options?: PlatformDialogFileOptions },
        { filePaths: string[] | null }
      >("platform.dialogOpenFile", { options });
      return Array.isArray(result.filePaths) ? result.filePaths : null;
    },
    async saveFile(options) {
      const result = await client.invoke<
        { options?: PlatformDialogSaveOptions },
        { filePath: string | null }
      >("platform.dialogSaveFile", { options });
      return typeof result.filePath === "string" && result.filePath.trim().length > 0
        ? result.filePath
        : null;
    },
    async showMessage(options) {
      if (!options?.message || options.message.trim().length === 0) {
        throw createError("INVALID_ARGUMENT", "platform.showMessage: options.message is required.");
      }
      const result = await client.invoke<
        { options: PlatformDialogMessageOptions },
        { response: number }
      >("platform.dialogShowMessage", { options });
      return typeof result.response === "number" ? result.response : 0;
    },
    async showConfirm(options) {
      if (!options?.message || options.message.trim().length === 0) {
        throw createError("INVALID_ARGUMENT", "platform.showConfirm: options.message is required.");
      }
      const result = await client.invoke<
        { options: PlatformDialogMessageOptions },
        { confirmed: boolean }
      >("platform.dialogShowConfirm", { options });
      return result.confirmed === true;
    },
    getPathForFile(file) {
      return resolveBridgePathForFile(file);
    },
    getLaunchContext() {
      return resolveBridgeLaunchContext();
    },
  };
}

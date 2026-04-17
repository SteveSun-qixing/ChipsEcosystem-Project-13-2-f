import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export type PlatformHostKind = "desktop" | "web" | "mobile" | "headless";
export type PlatformId = NodeJS.Platform | "web" | "android" | "ios" | "server";

export interface PlatformInfo {
  hostKind: PlatformHostKind;
  platform: PlatformId;
  arch: string;
  release: string;
}

export interface PlatformCapabilitySnapshot {
  hostKind: PlatformHostKind;
  platform: PlatformId;
  facets: {
    surface: {
      supported: boolean;
      interactive: boolean;
      supportedKinds: Array<"window" | "tab" | "route" | "modal" | "sheet" | "fullscreen">;
    };
    storage: {
      localWorkspace: boolean;
      sandboxFilePicker: boolean;
      remoteBacked: boolean;
    };
    selection: {
      openFile: boolean;
      saveFile: boolean;
      directory: boolean;
      multiple: boolean;
    };
    transfer: {
      upload: boolean;
      download: boolean;
      share: boolean;
      externalOpen: boolean;
      revealInShell: boolean;
    };
    association: {
      fileAssociation: boolean;
      urlScheme: boolean;
      shareTarget: boolean;
    };
    device: {
      screen: boolean;
      power: boolean;
      network: boolean;
    };
    systemUi: {
      clipboard: boolean;
      tray: boolean;
      globalShortcut: boolean;
      notification: boolean;
    };
    background: {
      keepAlive: boolean;
      wakeEvents: boolean;
    };
    ipc: {
      namedPipe: boolean;
      unixSocket: boolean;
      sharedMemory: boolean;
    };
    offscreenRender: {
      htmlToPdf: boolean;
      htmlToImage: boolean;
    };
  };
}

export interface PlatformLaunchContext {
  pluginId?: string;
  sessionId?: string;
  launchParams: Record<string, unknown>;
}

export interface PlatformScreenInfo {
  id: string;
  width: number;
  height: number;
  scaleFactor: number;
  x: number;
  y: number;
  primary: boolean;
}

export interface PlatformPowerState {
  idleSeconds: number;
  preventSleep: boolean;
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

export interface PlatformRenderHtmlToPdfRequest {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
  options?: {
    pageSize?: "A4" | "A3" | "Letter" | "Legal";
    landscape?: boolean;
    printBackground?: boolean;
    marginMm?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  };
}

export interface PlatformRenderHtmlToPdfResult {
  outputFile: string;
  pageCount?: number;
}

export interface PlatformRenderHtmlToImageRequest {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
  options?: {
    format?: "png" | "jpeg" | "webp";
    width?: number;
    height?: number;
    scaleFactor?: number;
    background?: "transparent" | "white" | "theme";
  };
}

export interface PlatformRenderHtmlToImageResult {
  outputFile: string;
  width?: number;
  height?: number;
  format: "png" | "jpeg" | "webp";
}

export interface PlatformApi {
  getInfo(): Promise<PlatformInfo>;
  getCapabilities(): Promise<PlatformCapabilitySnapshot>;
  getScreenInfo(): Promise<PlatformScreenInfo>;
  listScreens(): Promise<PlatformScreenInfo[]>;
  powerGetState(): Promise<PlatformPowerState>;
  powerSetPreventSleep(prevent: boolean): Promise<boolean>;
  openExternal(url: string): Promise<void>;
  renderHtmlToPdf(request: PlatformRenderHtmlToPdfRequest): Promise<PlatformRenderHtmlToPdfResult>;
  renderHtmlToImage(request: PlatformRenderHtmlToImageRequest): Promise<PlatformRenderHtmlToImageResult>;
  openFile(options?: PlatformDialogFileOptions): Promise<string[] | null>;
  saveFile(options?: PlatformDialogSaveOptions): Promise<string | null>;
  showMessage(options: PlatformDialogMessageOptions): Promise<number>;
  showConfirm(options: PlatformDialogMessageOptions): Promise<boolean>;
  getPathForFile(file: unknown): string;
  getLaunchContext(): PlatformLaunchContext;
}

interface PlatformBridge {
  getPathForFile?(input: unknown): string;
  getLaunchContext?(): unknown;
}

interface PlatformBridgeWindow {
  chips?: {
    platform?: PlatformBridge;
  };
}

const getPlatformBridge = (): PlatformBridge | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  return (window as unknown as PlatformBridgeWindow).chips?.platform;
};

const normalizeLaunchParams = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
};

const normalizeLaunchContext = (raw: unknown): PlatformLaunchContext => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { launchParams: {} };
  }

  const candidate = raw as Record<string, unknown>;
  return {
    pluginId: typeof candidate.pluginId === "string" ? candidate.pluginId : undefined,
    sessionId: typeof candidate.sessionId === "string" ? candidate.sessionId : undefined,
    launchParams: normalizeLaunchParams(candidate.launchParams),
  };
};

const resolveBridgePathForFile = (file: unknown): string => {
  const getPathForFile = getPlatformBridge()?.getPathForFile;
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
  const getLaunchContext = getPlatformBridge()?.getLaunchContext;
  if (typeof getLaunchContext !== "function") {
    return { launchParams: {} };
  }

  try {
    return normalizeLaunchContext(getLaunchContext());
  } catch {
    return { launchParams: {} };
  }
};

export function createPlatformApi(client: CoreClient): PlatformApi {
  return {
    async getInfo() {
      const result = await client.invoke<Record<string, never>, { info: PlatformInfo }>("platform.getInfo", {});
      return result.info;
    },
    async getCapabilities() {
      const result = await client.invoke<Record<string, never>, { capabilities: PlatformCapabilitySnapshot }>(
        "platform.getCapabilities",
        {}
      );
      return result.capabilities;
    },
    async getScreenInfo() {
      const result = await client.invoke<Record<string, never>, { screen: PlatformScreenInfo }>("platform.getScreenInfo", {});
      return result.screen;
    },
    async listScreens() {
      const result = await client.invoke<Record<string, never>, { screens: PlatformScreenInfo[] }>("platform.listScreens", {});
      return result.screens;
    },
    async powerGetState() {
      const result = await client.invoke<Record<string, never>, { state: PlatformPowerState }>("platform.powerGetState", {});
      return result.state;
    },
    async powerSetPreventSleep(prevent) {
      const result = await client.invoke<{ prevent: boolean }, { preventSleep: boolean }>(
        "platform.powerSetPreventSleep",
        { prevent }
      );
      return result.preventSleep;
    },
    async openExternal(url) {
      await client.invoke("platform.openExternal", { url });
    },
    async renderHtmlToPdf(request) {
      if (!request?.htmlDir || !request?.outputFile) {
        throw createError("INVALID_ARGUMENT", "platform.renderHtmlToPdf: htmlDir and outputFile are required.");
      }
      return client.invoke("platform.renderHtmlToPdf", request);
    },
    async renderHtmlToImage(request) {
      if (!request?.htmlDir || !request?.outputFile) {
        throw createError("INVALID_ARGUMENT", "platform.renderHtmlToImage: htmlDir and outputFile are required.");
      }
      return client.invoke("platform.renderHtmlToImage", request);
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

export type PlatformCapabilities = PlatformCapabilitySnapshot;

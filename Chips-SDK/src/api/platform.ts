import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";
import type { SurfaceContext, SurfaceKind, SurfacePresentation } from "./surface";

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
      videoFrame: boolean;
    };
  };
}

export interface PlatformLaunchContext {
  pluginId?: string;
  sessionId?: string;
  sceneId?: string;
  surfaceId?: string;
  kind?: SurfaceKind;
  presentation?: SurfacePresentation;
  surfaceContext?: SurfaceContext;
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
  mode?: "file" | "directory" | "file-or-directory";
  allowMultiple?: boolean;
  mustExist?: boolean;
  title?: string;
  filters?: PlatformDialogFileFilter[];
}

export interface PlatformDialogFileFilter {
  name: string;
  extensions: string[];
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

export type PlatformClipboardFormat = "text" | "image" | "files";

export interface PlatformClipboardImagePayload {
  base64: string;
  mimeType?: string;
}

export type PlatformClipboardPayload = string | PlatformClipboardImagePayload | string[];

export interface PlatformNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
}

export interface PlatformTrayMenuItem {
  id: string;
  label: string;
}

export interface PlatformTrayOptions {
  icon?: string;
  tooltip?: string;
  menu?: PlatformTrayMenuItem[];
}

export interface PlatformTrayState extends PlatformTrayOptions {
  active: boolean;
}

export interface PlatformShortcutRegisterOptions {
  eventName?: string;
}

export type PlatformIpcTransport = "named-pipe" | "unix-socket" | "shared-memory";

export interface PlatformIpcCreateOptions {
  name: string;
  transport: PlatformIpcTransport;
  maxBufferBytes?: number;
}

export interface PlatformIpcChannelInfo {
  channelId: string;
  name: string;
  transport: PlatformIpcTransport;
  endpoint?: string;
}

export interface PlatformIpcSendOptions {
  encoding?: "utf8" | "base64";
}

export interface PlatformIpcReceiveOptions {
  timeoutMs?: number;
}

export interface PlatformIpcMessage {
  channelId: string;
  transport: PlatformIpcTransport;
  payload: string;
  encoding: "base64";
  receivedAt: number;
}

export interface PlatformRenderHtmlToPdfRequest {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
  options?: {
    pageSize?: "A4" | "A3" | "Letter" | "Legal";
    landscape?: boolean;
    printBackground?: boolean;
    preferCSSPageSize?: boolean;
    marginMm?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    headerFooter?: {
      enabled?: boolean;
      headerTemplate?: string;
      footerTemplate?: string;
    };
    wait?: {
      timeoutMs?: number;
      quietMs?: number;
      resourceTimeoutMs?: number;
      compositeTimeoutMs?: number;
      waitForFonts?: boolean;
      waitForImages?: boolean;
      waitForFrames?: boolean;
      waitForCompositeReady?: boolean;
    };
  };
}

export interface PlatformRenderHtmlToPdfResult {
  outputFile: string;
  pageCount?: number;
  byteLength?: number;
  diagnostics?: unknown[];
  warnings?: Array<{
    code: string;
    message: string;
    details?: unknown;
  }>;
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
  clipboardRead(format?: PlatformClipboardFormat): Promise<PlatformClipboardPayload>;
  clipboardWrite(data: PlatformClipboardPayload, format?: PlatformClipboardFormat): Promise<void>;
  shellOpenPath(path: string): Promise<void>;
  shellOpenExternal(url: string): Promise<void>;
  shellShowItemInFolder(path: string): Promise<void>;
  notificationShow(options: PlatformNotificationOptions): Promise<void>;
  traySet(options?: PlatformTrayOptions): Promise<PlatformTrayState>;
  trayClear(): Promise<void>;
  trayGetState(): Promise<PlatformTrayState>;
  shortcutRegister(accelerator: string, options?: PlatformShortcutRegisterOptions): Promise<boolean>;
  shortcutUnregister(accelerator: string): Promise<void>;
  shortcutIsRegistered(accelerator: string): Promise<boolean>;
  shortcutList(): Promise<string[]>;
  shortcutClear(): Promise<void>;
  ipcCreateChannel(options: PlatformIpcCreateOptions): Promise<PlatformIpcChannelInfo>;
  ipcSend(channelId: string, payload: string, options?: PlatformIpcSendOptions): Promise<void>;
  ipcReceive(channelId: string, options?: PlatformIpcReceiveOptions): Promise<PlatformIpcMessage>;
  ipcCloseChannel(channelId: string): Promise<void>;
  ipcListChannels(): Promise<PlatformIpcChannelInfo[]>;
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

const surfaceKinds: SurfaceKind[] = ["window", "tab", "route", "modal", "sheet", "fullscreen"];

const normalizeSurfacePresentation = (value: unknown): SurfacePresentation | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return { ...(value as SurfacePresentation) };
};

const normalizeSurfaceContext = (value: unknown): SurfaceContext | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const kind = typeof candidate.kind === "string" && surfaceKinds.includes(candidate.kind as SurfaceKind)
    ? (candidate.kind as SurfaceKind)
    : undefined;
  const presentation = normalizeSurfacePresentation(candidate.presentation);
  if (typeof candidate.sceneId !== "string" || !kind || !presentation) {
    return undefined;
  }

  const documentContext =
    candidate.documentContext && typeof candidate.documentContext === "object" && !Array.isArray(candidate.documentContext)
      ? (candidate.documentContext as Record<string, unknown>)
      : undefined;
  const commandContext =
    candidate.commandContext && typeof candidate.commandContext === "object" && !Array.isArray(candidate.commandContext)
      ? (candidate.commandContext as Record<string, unknown>)
      : undefined;

  return {
    surfaceId: typeof candidate.surfaceId === "string" ? candidate.surfaceId : undefined,
    sceneId: candidate.sceneId,
    pluginId: typeof candidate.pluginId === "string" ? candidate.pluginId : undefined,
    sessionId: typeof candidate.sessionId === "string" ? candidate.sessionId : undefined,
    kind,
    presentation,
    launchParams: normalizeLaunchParams(candidate.launchParams),
    documentContext:
      typeof documentContext?.documentId === "string"
        ? {
            documentId: documentContext.documentId,
            title: typeof documentContext.title === "string" ? documentContext.title : undefined,
            url: typeof documentContext.url === "string" ? documentContext.url : undefined,
          }
        : undefined,
    commandContext:
      typeof commandContext?.commandId === "string"
        ? {
            commandId: commandContext.commandId,
            source: typeof commandContext.source === "string" ? commandContext.source : undefined,
            payload: normalizeLaunchParams(commandContext.payload),
            taskId: typeof commandContext.taskId === "string" ? commandContext.taskId : undefined,
          }
        : undefined,
  };
};

const normalizeLaunchContext = (raw: unknown): PlatformLaunchContext => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { launchParams: {} };
  }

  const candidate = raw as Record<string, unknown>;
  const surfaceContext = normalizeSurfaceContext(candidate.surfaceContext);
  const kind = typeof candidate.kind === "string" && surfaceKinds.includes(candidate.kind as SurfaceKind)
    ? (candidate.kind as SurfaceKind)
    : surfaceContext?.kind;
  const presentation = normalizeSurfacePresentation(candidate.presentation) ?? surfaceContext?.presentation;
  return {
    pluginId: typeof candidate.pluginId === "string" ? candidate.pluginId : undefined,
    sessionId: typeof candidate.sessionId === "string" ? candidate.sessionId : undefined,
    sceneId: typeof candidate.sceneId === "string" ? candidate.sceneId : surfaceContext?.sceneId,
    surfaceId: typeof candidate.surfaceId === "string" ? candidate.surfaceId : surfaceContext?.surfaceId,
    kind,
    presentation,
    surfaceContext,
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
    async clipboardRead(format) {
      const result = await client.invoke<
        { format?: PlatformClipboardFormat },
        { data: PlatformClipboardPayload }
      >("platform.clipboardRead", { format });
      return result.data;
    },
    async clipboardWrite(data, format) {
      await client.invoke<{ data: PlatformClipboardPayload; format?: PlatformClipboardFormat }, { ack: true }>(
        "platform.clipboardWrite",
        { data, format },
      );
    },
    async shellOpenPath(path) {
      if (!path) {
        throw createError("INVALID_ARGUMENT", "platform.shellOpenPath: path is required.");
      }
      await client.invoke("platform.shellOpenPath", { path });
    },
    async shellOpenExternal(url) {
      if (!url) {
        throw createError("INVALID_ARGUMENT", "platform.shellOpenExternal: url is required.");
      }
      await client.invoke("platform.shellOpenExternal", { url });
    },
    async shellShowItemInFolder(path) {
      if (!path) {
        throw createError("INVALID_ARGUMENT", "platform.shellShowItemInFolder: path is required.");
      }
      await client.invoke("platform.shellShowItemInFolder", { path });
    },
    async notificationShow(options) {
      if (!options?.title || !options?.body) {
        throw createError("INVALID_ARGUMENT", "platform.notificationShow: title and body are required.");
      }
      await client.invoke<{ options: PlatformNotificationOptions }, { ack: true }>(
        "platform.notificationShow",
        { options },
      );
    },
    async traySet(options) {
      const result = await client.invoke<
        { options?: PlatformTrayOptions },
        { tray: PlatformTrayState }
      >("platform.traySet", { options: options ?? {} });
      return result.tray;
    },
    async trayClear() {
      await client.invoke("platform.trayClear", {});
    },
    async trayGetState() {
      const result = await client.invoke<Record<string, never>, { tray: PlatformTrayState }>(
        "platform.trayGetState",
        {},
      );
      return result.tray;
    },
    async shortcutRegister(accelerator, options) {
      if (!accelerator) {
        throw createError("INVALID_ARGUMENT", "platform.shortcutRegister: accelerator is required.");
      }
      const result = await client.invoke<
        { accelerator: string; eventName?: string },
        { registered: boolean }
      >("platform.shortcutRegister", {
        accelerator,
        eventName: options?.eventName,
      });
      return result.registered === true;
    },
    async shortcutUnregister(accelerator) {
      if (!accelerator) {
        throw createError("INVALID_ARGUMENT", "platform.shortcutUnregister: accelerator is required.");
      }
      await client.invoke("platform.shortcutUnregister", { accelerator });
    },
    async shortcutIsRegistered(accelerator) {
      if (!accelerator) {
        throw createError("INVALID_ARGUMENT", "platform.shortcutIsRegistered: accelerator is required.");
      }
      const result = await client.invoke<
        { accelerator: string },
        { registered: boolean }
      >("platform.shortcutIsRegistered", { accelerator });
      return result.registered === true;
    },
    async shortcutList() {
      const result = await client.invoke<Record<string, never>, { accelerators: string[] }>(
        "platform.shortcutList",
        {},
      );
      return result.accelerators;
    },
    async shortcutClear() {
      await client.invoke("platform.shortcutClear", {});
    },
    async ipcCreateChannel(options) {
      if (!options?.name || !options?.transport) {
        throw createError("INVALID_ARGUMENT", "platform.ipcCreateChannel: name and transport are required.");
      }
      const result = await client.invoke<
        PlatformIpcCreateOptions,
        { channel: PlatformIpcChannelInfo }
      >("platform.ipcCreateChannel", options);
      return result.channel;
    },
    async ipcSend(channelId, payload, options) {
      if (!channelId) {
        throw createError("INVALID_ARGUMENT", "platform.ipcSend: channelId is required.");
      }
      if (typeof payload !== "string") {
        throw createError("INVALID_ARGUMENT", "platform.ipcSend: payload must be a string.");
      }
      await client.invoke<
        { channelId: string; payload: string; encoding?: "utf8" | "base64" },
        { ack: true }
      >("platform.ipcSend", {
        channelId,
        payload,
        encoding: options?.encoding,
      });
    },
    async ipcReceive(channelId, options) {
      if (!channelId) {
        throw createError("INVALID_ARGUMENT", "platform.ipcReceive: channelId is required.");
      }
      const result = await client.invoke<
        { channelId: string; timeoutMs?: number },
        { message: PlatformIpcMessage }
      >("platform.ipcReceive", {
        channelId,
        timeoutMs: options?.timeoutMs,
      });
      return result.message;
    },
    async ipcCloseChannel(channelId) {
      if (!channelId) {
        throw createError("INVALID_ARGUMENT", "platform.ipcCloseChannel: channelId is required.");
      }
      await client.invoke("platform.ipcCloseChannel", { channelId });
    },
    async ipcListChannels() {
      const result = await client.invoke<Record<string, never>, { channels: PlatformIpcChannelInfo[] }>(
        "platform.ipcListChannels",
        {},
      );
      return result.channels;
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

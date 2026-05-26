import type { HtmlToImageWarning } from "./errors";

export type ImageFormat = "png" | "jpeg" | "webp";
export type ImageBackground = "transparent" | "white" | "theme";
export type ImageWaitUntil = "managed";

export interface HtmlToImageRequest {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
  overwrite?: boolean;
  options?: {
    format?: ImageFormat;
    width?: number;
    height?: number;
    scaleFactor?: number;
    background?: ImageBackground;
    waitUntil?: ImageWaitUntil;
  };
}

export interface NormalizedHtmlToImageRequest {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
  overwrite: boolean;
  options: {
    format: ImageFormat;
    width?: number;
    height?: number;
    scaleFactor?: number;
    background: ImageBackground;
    waitUntil: ImageWaitUntil;
  };
}

export interface HtmlToImageResult {
  outputFile: string;
  width?: number;
  height?: number;
  format: ImageFormat;
  warnings?: HtmlToImageWarning[];
  diagnostics?: HtmlToImageDiagnostics;
}

export interface HtmlToImageDiagnostics {
  html: {
    manifestFile: "conversion-manifest.json";
    schemaVersion?: string;
    generatedAt?: string;
    entryFile: string;
    type: "card-to-html";
  };
  resources?: {
    assetsIncluded?: boolean;
    assetRoot?: string | null;
    assetCount?: number;
    contentFiles?: string[];
    renderDiagnostics?: unknown[];
    renderConsistency?: unknown;
    upstreamWarnings?: HtmlToImageWarning[];
  };
  render: {
    hostAction: "platform.renderHtmlToImage";
    waitUntil: ImageWaitUntil;
    background: ImageBackground;
    scaleFactor?: number;
  };
  output: {
    file: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    format: ImageFormat;
    mimeType: string;
  };
}

export interface HtmlConversionManifest {
  schemaVersion?: string;
  type: string;
  generatedAt?: string;
  output?: {
    entryFile?: string;
    manifestFile?: string | null;
  };
  source?: {
    cardFile?: string;
    title?: string;
    semanticHash?: string;
    requestedThemeId?: string | null;
    requestedLocale?: string | null;
  };
  assets?: {
    included?: boolean;
    root?: string | null;
    count?: number;
  };
  diagnostics?: {
    renderDiagnostics?: unknown[];
    renderConsistency?: unknown;
    contentFiles?: string[];
  };
  warnings?: HtmlToImageWarning[];
}

export interface HostFileStatLike {
  isFile?: boolean;
  isDirectory?: boolean;
  size?: number;
  mtimeMs?: number;
}

export interface HtmlToImageContext {
  logger: {
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
  };
  host: {
    invoke<TOutput = unknown>(action: string, payload?: Record<string, unknown>): Promise<TOutput>;
  };
  job?: {
    id: string;
    signal: AbortSignal;
    reportProgress(payload: Record<string, unknown>): Promise<void>;
    isCancelled(): boolean;
  };
}

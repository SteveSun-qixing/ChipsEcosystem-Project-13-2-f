import type { HtmlToImageWarning } from "./errors";

export type ImageFormat = "png" | "jpeg" | "webp";
export type ImageBackground = "transparent" | "white" | "theme";

export interface HtmlToImageRequest {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
  options?: {
    format?: ImageFormat;
    width?: number;
    height?: number;
    scaleFactor?: number;
    background?: ImageBackground;
  };
}

export interface NormalizedHtmlToImageRequest {
  htmlDir: string;
  entryFile: string;
  outputFile: string;
  options: {
    format: ImageFormat;
    width?: number;
    height?: number;
    scaleFactor?: number;
    background: ImageBackground;
  };
}

export interface HtmlToImageResult {
  outputFile: string;
  width?: number;
  height?: number;
  format: ImageFormat;
  warnings?: HtmlToImageWarning[];
}

export interface HtmlConversionManifest {
  schemaVersion?: string;
  type: string;
  generatedAt?: string;
  output?: {
    entryFile?: string;
    manifestFile?: string | null;
  };
}

export interface HostFileStatLike {
  isFile?: boolean;
  isDirectory?: boolean;
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

import type { CardToHtmlWarning } from "./errors";

export type HtmlPackageMode = "directory" | "zip";

export interface CardToHtmlRequest {
  cardFile: string;
  output: {
    path: string;
    packageMode: HtmlPackageMode;
    overwrite?: boolean;
  };
  options?: {
    includeAssets?: boolean;
    includeManifest?: boolean;
    locale?: string;
    themeId?: string;
  };
}

export interface NormalizedCardToHtmlRequest {
  cardFile: string;
  output: {
    path: string;
    packageMode: HtmlPackageMode;
    overwrite: boolean;
  };
  options: {
    includeAssets: boolean;
    includeManifest: boolean;
    locale?: string;
    themeId?: string;
  };
}

export interface CardToHtmlResult {
  packageMode: HtmlPackageMode;
  outputPath: string;
  entryFile: "index.html";
  manifestFile?: "conversion-manifest.json";
  semanticHash: string;
  assetCount: number;
  warnings?: CardToHtmlWarning[];
}

export interface CardRenderView {
  title: string;
  body: string;
  documentUrl: string;
  sessionId: string;
  semanticHash: string;
  target: string;
}

export interface HostFileStatLike {
  isFile?: boolean;
  isDirectory?: boolean;
}

export interface HostFileListEntry {
  path: string;
  isFile: boolean;
  isDirectory: boolean;
}

export interface CardToHtmlContext {
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

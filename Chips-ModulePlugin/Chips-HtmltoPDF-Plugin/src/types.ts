import type { HtmlToPdfWarning } from "./errors";

export type PdfPageSize = "A4" | "A3" | "Letter" | "Legal";

export interface PdfMarginMm {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface PdfHeaderFooterOptions {
  enabled?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

export interface PdfWaitOptions {
  timeoutMs?: number;
  quietMs?: number;
  resourceTimeoutMs?: number;
  compositeTimeoutMs?: number;
  waitForFonts?: boolean;
  waitForImages?: boolean;
  waitForFrames?: boolean;
  waitForCompositeReady?: boolean;
}

export interface PdfRenderOptions {
  pageSize?: PdfPageSize;
  landscape?: boolean;
  printBackground?: boolean;
  preferCSSPageSize?: boolean;
  marginMm?: PdfMarginMm;
  headerFooter?: PdfHeaderFooterOptions;
  wait?: PdfWaitOptions;
}

export interface HtmlToPdfRequest {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
  overwrite?: boolean;
  options?: PdfRenderOptions;
}

export interface NormalizedHtmlToPdfRequest {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
  overwrite: boolean;
  options?: PdfRenderOptions;
}

export interface ResolvedHtmlToPdfRequest extends NormalizedHtmlToPdfRequest {
  entryFile: string;
}

export interface HtmlConversionManifest {
  schemaVersion?: string;
  type: "card-to-html";
  generatedAt?: string;
  source?: {
    cardFile?: string;
    title?: string;
    semanticHash?: string;
    locale?: string;
    themeId?: string;
  };
  output?: {
    entryFile?: string;
    manifestFile?: string | null;
  };
  diagnostics?: {
    renderDiagnostics?: unknown[];
    renderConsistency?: unknown;
    contentFiles?: string[];
  };
}

export interface HtmlToPdfResult {
  outputFile: string;
  entryFile: string;
  mimeType: "application/pdf";
  pageCount?: number;
  byteLength?: number;
  manifest?: {
    schemaVersion?: string;
    generatedAt?: string;
    semanticHash?: string;
    locale?: string;
    themeId?: string;
    renderDiagnostics?: unknown[];
    renderConsistency?: unknown;
    contentFiles?: string[];
  };
  diagnostics?: unknown[];
  warnings?: HtmlToPdfWarning[];
}

export interface HostFileStatLike {
  isFile?: boolean;
  isDirectory?: boolean;
  size?: number;
  mtimeMs?: number;
}

export interface HtmlToPdfContext {
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

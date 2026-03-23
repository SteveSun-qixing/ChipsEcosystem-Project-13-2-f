import type { HtmlToPdfWarning } from "./errors";

export type PdfPageSize = "A4" | "A3" | "Letter" | "Legal";

export interface HtmlToPdfRequest {
  htmlDir: string;
  entryFile?: string;
  outputFile: string;
  options?: {
    pageSize?: PdfPageSize;
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

export interface NormalizedHtmlToPdfRequest {
  htmlDir: string;
  entryFile: string;
  outputFile: string;
  options?: {
    pageSize?: PdfPageSize;
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

export interface HtmlToPdfResult {
  outputFile: string;
  pageCount?: number;
  warnings?: HtmlToPdfWarning[];
}

export interface HostFileStatLike {
  isFile?: boolean;
  isDirectory?: boolean;
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

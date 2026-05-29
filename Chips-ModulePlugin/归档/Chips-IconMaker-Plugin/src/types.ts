export type IconOutputFormat = "png" | "ico" | "icns";

export interface IconGenerateRequest {
  inputPath: string;
  outputDir: string;
  formats: IconOutputFormat[];
  size: number;
}

export interface IconGenerateWarning {
  code: string;
  message: string;
  details?: unknown;
}

export interface IconGenerateResult {
  inputPath: string;
  outputDir: string;
  size: number;
  formats: IconOutputFormat[];
  files: string[];
  warnings?: IconGenerateWarning[];
}

export interface HostFileStatLike {
  isFile?: boolean;
  isDirectory?: boolean;
  size?: number;
  mtimeMs?: number;
}

export interface IconMakerContext {
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

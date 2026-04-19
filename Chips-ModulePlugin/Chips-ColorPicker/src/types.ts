export interface ColorPickRequest {
  imagePath: string;
  options?: {
    sampleSize?: number;
  };
}

export interface ColorPickResult {
  backgroundColor: string;
  accentColor: string;
}

export interface DecodedPng {
  width: number;
  height: number;
  pixels: Uint8Array;
}

export interface HostFileStatLike {
  isFile?: boolean;
  isDirectory?: boolean;
  size?: number;
  mtimeMs?: number;
}

export interface ColorPickerContext {
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

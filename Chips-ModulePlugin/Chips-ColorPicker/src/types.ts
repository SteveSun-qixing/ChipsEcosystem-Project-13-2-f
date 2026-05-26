export interface ColorPickRequest {
  imagePath: string;
  options?: {
    sampleSize?: number;
  };
}

export type ColorPaletteRole = "background" | "accent" | "representative";

export interface ColorPaletteEntry {
  color: string;
  role: ColorPaletteRole;
  population: number;
  lightness: number;
  chroma: number;
}

export interface ColorPickMetadata {
  algorithm: "oklab-kmeans-v1";
  source?: {
    imagePath: string;
    sizeBytes?: number;
    mtimeMs?: number;
  };
  image: {
    width: number;
    height: number;
    format?: string;
    animated: boolean;
    pageCount: number;
    hasAlpha: boolean;
    orientation?: number;
  };
  sample: {
    width: number;
    height: number;
    sampleSize: number;
    visiblePixelRatio: number;
    transparentPixelRatio: number;
    clusterCount: number;
  };
}

export interface ColorPickResult {
  backgroundColor: string;
  accentColor: string;
  palette: ColorPaletteEntry[];
  metadata: ColorPickMetadata;
}

export interface DecodedPng {
  width: number;
  height: number;
  pixels: Uint8Array;
}

export interface DecodedImageInfo {
  width?: number;
  height?: number;
  format?: string;
  animated?: boolean;
  pageCount?: number;
  hasAlpha?: boolean;
  orientation?: number;
}

export interface ColorAnalysisSample extends DecodedPng {
  imagePath?: string;
  sampleSize?: number;
  sourceMeta?: HostFileStatLike;
  imageInfo?: DecodedImageInfo;
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

export type FileSourceType = "card" | "html";
export type FileTargetType = "html" | "pdf" | "image";
export type HtmlPackageMode = "zip" | "directory";
export type ImageFormat = "png" | "jpeg" | "webp";
export type PdfPageSize = "A4" | "A3" | "Letter" | "Legal";

export interface FileConvertRequest {
  source: {
    type: FileSourceType;
    path: string;
  };
  target: {
    type: FileTargetType;
  };
  output: {
    path: string;
    overwrite?: boolean;
  };
  options?: {
    html?: {
      packageMode?: HtmlPackageMode;
      includeAssets?: boolean;
      includeManifest?: boolean;
    };
    pdf?: {
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
    image?: {
      format?: ImageFormat;
      width?: number;
      height?: number;
      scaleFactor?: number;
      background?: "transparent" | "white" | "theme";
    };
    locale?: string;
    themeId?: string;
  };
}

export interface FileConvertWarning {
  code: string;
  message: string;
  details?: unknown;
}

export interface FileConvertArtifact {
  type: "html-zip" | "html-directory" | "pdf" | "image";
  path: string;
  entryFile?: string;
  mimeType?: string;
}

export interface FileConvertPipelineStepResult {
  capability: string;
  method: "convert";
  pluginId?: string;
}

export interface FileConvertResult {
  sourceType: FileSourceType;
  targetType: FileTargetType;
  outputPath: string;
  artifacts: FileConvertArtifact[];
  pipeline: FileConvertPipelineStepResult[];
  warnings?: FileConvertWarning[];
}

export interface FileStatLike {
  isFile?: boolean;
  isDirectory?: boolean;
  size?: number;
  mtimeMs?: number;
}

export interface ChildModuleInvokeResult {
  mode: "sync" | "job";
  output?: unknown;
  jobId?: string;
}

export interface ChildModuleJobSnapshot {
  jobId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  progress?: Record<string, unknown>;
  output?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    retryable?: boolean;
  };
}

export interface FileModuleContext {
  logger: {
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
  };
  host: {
    invoke<TOutput = unknown>(action: string, payload?: Record<string, unknown>): Promise<TOutput>;
  };
  module: {
    invoke(request: {
      capability: string;
      method: string;
      input: Record<string, unknown>;
      pluginId?: string;
      timeoutMs?: number;
    }): Promise<ChildModuleInvokeResult>;
    job: {
      get(jobId: string): Promise<unknown>;
      cancel(jobId: string): Promise<void>;
    };
  };
  job?: {
    id: string;
    signal: AbortSignal;
    reportProgress(payload: Record<string, unknown>): Promise<void>;
    isCancelled(): boolean;
  };
}

export interface NormalizedHtmlSource {
  htmlDir: string;
  entryFile?: string;
}

export interface NormalizedConvertRequest extends FileConvertRequest {
  output: FileConvertRequest["output"] & {
    overwrite: boolean;
  };
  options: NonNullable<FileConvertRequest["options"]> & {
    html: {
      packageMode: HtmlPackageMode;
      includeAssets?: boolean;
      includeManifest?: boolean;
    };
  };
}

export interface PlannedStep {
  capability: "converter.card.to-html" | "converter.html.to-pdf" | "converter.html.to-image";
  method: "convert";
  input: Record<string, unknown>;
  progressStart: number;
  progressEnd: number;
  outputKind: FileConvertArtifact["type"];
  outputPathField: "outputPath" | "outputFile";
  defaultStage: "render-html" | "render-pdf" | "render-image";
}

export interface ConversionPlan {
  request: NormalizedConvertRequest;
  steps: PlannedStep[];
  temporaryHtmlDir?: string;
  temporaryHtmlRoot?: string;
}

export interface CardToHtmlResultLike {
  packageMode?: HtmlPackageMode;
  outputPath?: string;
  entryFile?: string;
  warnings?: FileConvertWarning[];
}

export interface HtmlToPdfResultLike {
  outputFile?: string;
  warnings?: FileConvertWarning[];
}

export interface HtmlToImageResultLike {
  outputFile?: string;
  format?: ImageFormat;
  warnings?: FileConvertWarning[];
}

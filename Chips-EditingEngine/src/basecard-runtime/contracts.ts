import type { IconDescriptor } from "chips-sdk";

export type BasecardConfigRecord = Record<string, unknown>;

export interface EditorValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface BasecardResourceImportRequest {
  file: File;
  preferredPath?: string;
}

export interface BasecardResourceImportResult {
  path: string;
}

export interface BasecardArchiveImportRequest {
  file: File;
  preferredRootDir?: string;
  entryFile?: string;
}

export interface BasecardArchiveImportResult {
  rootDir: string;
  entryFile: string;
  resourcePaths: string[];
}

export interface BasecardTiffToPngRequest {
  resourcePath: string;
  outputPath: string;
  overwrite?: boolean;
}

export interface BasecardTiffToPngResult {
  path: string;
  mimeType: "image/png";
  sourceMimeType: "image/tiff";
  width?: number;
  height?: number;
}

export interface BasecardPendingResourceImport {
  path: string;
  data: Uint8Array;
  mimeType?: string;
}

export interface BasecardResourceOperations {
  imports: BasecardPendingResourceImport[];
  deletions: string[];
}

export interface BasecardRenderContext {
  container: HTMLElement;
  config: BasecardConfigRecord;
  themeCssText?: string;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
}

export interface BasecardEditorContext {
  container: HTMLElement;
  initialConfig: BasecardConfigRecord;
  onChange: (next: BasecardConfigRecord) => void;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  importResource?: (input: BasecardResourceImportRequest) => Promise<BasecardResourceImportResult>;
  importArchiveBundle?: (input: BasecardArchiveImportRequest) => Promise<BasecardArchiveImportResult>;
  deleteResource?: (resourcePath: string) => Promise<void>;
  convertTiffToPng?: (input: BasecardTiffToPngRequest) => Promise<BasecardTiffToPngResult>;
}

export interface BasecardDescriptor {
  pluginId: string;
  cardType: string;
  displayName: string;
  description?: string;
  icon?: IconDescriptor;
  aliases?: readonly string[];
  commitDebounceMs?: number;
  previewPointerEvents?: 'native' | 'shielded';
  createInitialConfig: (baseCardId: string) => BasecardConfigRecord;
  normalizeConfig: (input: BasecardConfigRecord, baseCardId: string) => BasecardConfigRecord;
  validateConfig: (config: BasecardConfigRecord) => EditorValidationResult;
  collectResourcePaths?: (config: BasecardConfigRecord) => string[];
  renderView: (ctx: BasecardRenderContext) => (() => void) | void;
  renderEditor?: (ctx: BasecardEditorContext) => (() => void) | void;
}

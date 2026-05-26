import type { IconDescriptor } from "chips-sdk";
import { mountBasecardView } from "./render/runtime";
import { mountBasecardEditor } from "./editor/runtime";
import {
  collectRichTextResourcePaths,
  createInitialBasecardConfig,
  defaultBasecardConfig,
  normalizeBasecardConfig,
  validateBasecardConfig,
} from "./schema/card-config";

export interface BasecardResourceImportRequest {
  file: File;
  preferredPath?: string;
}

export interface BasecardResourceImportResult {
  path: string;
}

export interface BasecardRenderContext {
  container: HTMLElement;
  config: Record<string, unknown>;
  themeCssText?: string;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  openResource?: (input: {
    resourceId: string;
    mimeType?: string;
    title?: string;
    fileName?: string;
    payload?: Record<string, unknown>;
  }) => void;
}

export interface BasecardEditorContext {
  container: HTMLElement;
  initialConfig: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  importResource?: (input: BasecardResourceImportRequest) => Promise<BasecardResourceImportResult>;
  deleteResource?: (resourcePath: string) => Promise<void>;
  importArchiveBundle?: (input: {
    file: File;
    preferredRootDir?: string;
    entryFile?: string;
    include?: {
      mimeTypes?: string[];
      extensions?: string[];
    };
    stripSingleRootDir?: boolean;
    excludeSystemArtifacts?: boolean;
  }) => Promise<{
    rootDir: string;
    entryFile?: string;
    resourcePaths: string[];
    entries: Array<Record<string, unknown>>;
    discardedEntries: Array<Record<string, unknown>>;
  }>;
  convertTiffToPng?: (input: {
    resourcePath: string;
    outputPath: string;
    overwrite?: boolean;
  }) => Promise<{
    path: string;
    mimeType: "image/png";
    sourceMimeType: "image/tiff";
    width?: number;
    height?: number;
  }>;
}

export function renderBasecardView(ctx: BasecardRenderContext): () => void {
  return mountBasecardView(ctx);
}

export function renderBasecardEditor(ctx: BasecardEditorContext): () => void {
  return mountBasecardEditor(ctx);
}

const richtextBasecardIcon: IconDescriptor = {
  name: "article",
  decorative: true,
};

export const basecardDefinition = {
  pluginId: "chips.basecard.richtext",
  cardType: "base.richtext",
  displayName: "富文本基础卡片",
  description: "提供基于 Milkdown 的 Markdown 富文本编辑与查看能力。",
  icon: richtextBasecardIcon,
  aliases: ["RichTextCard"],
  commitDebounceMs: 0,
  createInitialConfig(_baseCardId: string) {
    return createInitialBasecardConfig() as unknown as Record<string, unknown>;
  },
  normalizeConfig(input: Record<string, unknown>, _baseCardId: string) {
    return normalizeBasecardConfig({
      ...defaultBasecardConfig,
      ...input,
    }) as unknown as Record<string, unknown>;
  },
  validateConfig(config: Record<string, unknown>) {
    return validateBasecardConfig(normalizeBasecardConfig(config));
  },
  collectResourcePaths(config: Record<string, unknown>) {
    return collectRichTextResourcePaths(normalizeBasecardConfig(config));
  },
  renderView(ctx: {
    container: HTMLElement;
    config: Record<string, unknown>;
    themeCssText?: string;
    resolveResourceUrl?: (resourcePath: string) => Promise<string>;
    releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
    openResource?: (input: {
      resourceId: string;
      mimeType?: string;
      title?: string;
      fileName?: string;
      payload?: Record<string, unknown>;
    }) => void;
  }) {
    return renderBasecardView({
      container: ctx.container,
      config: normalizeBasecardConfig(ctx.config),
      themeCssText: ctx.themeCssText,
      resolveResourceUrl: ctx.resolveResourceUrl,
      releaseResourceUrl: ctx.releaseResourceUrl,
      openResource: ctx.openResource,
    });
  },
  renderEditor(ctx: {
    container: HTMLElement;
    initialConfig: Record<string, unknown>;
    onChange: (next: Record<string, unknown>) => void;
    resolveResourceUrl?: (resourcePath: string) => Promise<string>;
    releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
    importResource?: (input: BasecardResourceImportRequest) => Promise<BasecardResourceImportResult>;
    importArchiveBundle?: BasecardEditorContext["importArchiveBundle"];
    deleteResource?: (resourcePath: string) => Promise<void>;
    convertTiffToPng?: BasecardEditorContext["convertTiffToPng"];
  }) {
    return renderBasecardEditor({
      container: ctx.container,
      initialConfig: normalizeBasecardConfig(ctx.initialConfig),
      onChange(next) {
        ctx.onChange(next as unknown as Record<string, unknown>);
      },
      resolveResourceUrl: ctx.resolveResourceUrl,
      releaseResourceUrl: ctx.releaseResourceUrl,
      importResource: ctx.importResource,
      importArchiveBundle: ctx.importArchiveBundle,
      deleteResource: ctx.deleteResource,
      convertTiffToPng: ctx.convertTiffToPng,
    });
  },
} as const;

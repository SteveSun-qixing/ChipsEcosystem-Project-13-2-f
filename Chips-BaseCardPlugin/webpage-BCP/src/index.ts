import type { IconDescriptor } from "chips-sdk";
import type { BasecardConfig } from "./schema/card-config";
import { mountBasecardEditor } from "./editor/runtime";
import { mountBasecardView } from "./render/runtime";
import {
  defaultBasecardConfig,
  normalizeBasecardConfig,
  validateBasecardConfig,
} from "./schema/card-config";
import { dedupeResourcePaths } from "./shared/utils";

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

export interface BasecardRenderContext {
  container: HTMLElement;
  config: BasecardConfig;
  themeCssText?: string;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
}

export interface BasecardEditorContext {
  container: HTMLElement;
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  importResource?: (input: BasecardResourceImportRequest) => Promise<BasecardResourceImportResult>;
  importArchiveBundle?: (input: BasecardArchiveImportRequest) => Promise<BasecardArchiveImportResult>;
  deleteResource?: (resourcePath: string) => Promise<void>;
}

export function renderBasecardView(ctx: BasecardRenderContext): () => void {
  return mountBasecardView(ctx);
}

export function renderBasecardEditor(ctx: BasecardEditorContext): () => void {
  return mountBasecardEditor(ctx);
}

const webpageBasecardIcon: IconDescriptor = {
  name: "language",
  decorative: true,
};

export const basecardDefinition = {
  pluginId: "chips.basecard.webpage",
  cardType: "base.webpage",
  displayName: "网页基础卡片",
  description: "提供网页显示、网页压缩包导入与卡片根目录网页资源管理能力。",
  icon: webpageBasecardIcon,
  aliases: ["WebPageCard"],
  commitDebounceMs: 260,
  previewPointerEvents: "shielded" as const,
  createInitialConfig(_baseCardId: string) {
    return normalizeBasecardConfig(
      defaultBasecardConfig as unknown as Record<string, unknown>,
    ) as unknown as Record<string, unknown>;
  },
  normalizeConfig(input: Record<string, unknown>, _baseCardId: string) {
    return normalizeBasecardConfig(input) as unknown as Record<string, unknown>;
  },
  validateConfig(config: Record<string, unknown>) {
    return validateBasecardConfig(normalizeBasecardConfig(config));
  },
  collectResourcePaths(config: Record<string, unknown>) {
    return dedupeResourcePaths(
      normalizeBasecardConfig(config).resource_paths,
    );
  },
  renderView(ctx: {
    container: HTMLElement;
    config: Record<string, unknown>;
    themeCssText?: string;
    resolveResourceUrl?: (resourcePath: string) => Promise<string>;
    releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  }) {
    return renderBasecardView({
      container: ctx.container,
      config: normalizeBasecardConfig(ctx.config),
      themeCssText: ctx.themeCssText,
      resolveResourceUrl: ctx.resolveResourceUrl,
      releaseResourceUrl: ctx.releaseResourceUrl,
    });
  },
  renderEditor(ctx: {
    container: HTMLElement;
    initialConfig: Record<string, unknown>;
    onChange: (next: Record<string, unknown>) => void;
    resolveResourceUrl?: (resourcePath: string) => Promise<string>;
    releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
    importResource?: (input: BasecardResourceImportRequest) => Promise<BasecardResourceImportResult>;
    importArchiveBundle?: (input: BasecardArchiveImportRequest) => Promise<BasecardArchiveImportResult>;
    deleteResource?: (resourcePath: string) => Promise<void>;
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
    });
  },
} as const;

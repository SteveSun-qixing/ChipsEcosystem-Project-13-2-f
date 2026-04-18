import type { IconDescriptor } from "chips-sdk";
import type { BasecardConfig } from "./schema/card-config";
import { mountBasecardView } from "./render/runtime";
import { mountBasecardEditor } from "./editor/runtime";
import {
  defaultBasecardConfig,
  normalizeBasecardConfig,
  validateBasecardConfig,
} from "./schema/card-config";
import { collectInternalResourcePaths } from "./shared/utils";

export interface BasecardResourceImportRequest {
  file: File;
  preferredPath?: string;
}

export interface BasecardResourceImportResult {
  path: string;
}

export interface BasecardRenderContext {
  container: HTMLElement;
  config: BasecardConfig;
  themeCssText?: string;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  openResource?: (input: {
    resourceId: string;
    mimeType?: string;
    title?: string;
    fileName?: string;
  }) => void;
}

export interface BasecardEditorContext {
  container: HTMLElement;
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  importResource?: (input: BasecardResourceImportRequest) => Promise<BasecardResourceImportResult>;
  deleteResource?: (resourcePath: string) => Promise<void>;
}

export function renderBasecardView(ctx: BasecardRenderContext): () => void {
  return mountBasecardView(ctx);
}

export function renderBasecardEditor(ctx: BasecardEditorContext): () => void {
  return mountBasecardEditor(ctx);
}

const basecardIcon: IconDescriptor = {
  name: "play_circle",
  decorative: true,
};

export const basecardDefinition = {
  pluginId: "chips.basecard.video",
  cardType: "base.video",
  displayName: "视频基础卡片",
  description: "提供视频文件、封面与基础元信息的查看和编辑能力。",
  icon: basecardIcon,
  aliases: ["VideoCard"],
  commitDebounceMs: 260,
  previewPointerEvents: "shielded",
  createInitialConfig(_baseCardId: string) {
    return normalizeBasecardConfig(
      defaultBasecardConfig as unknown as Record<string, unknown>,
    ) as unknown as Record<string, unknown>;
  },
  normalizeConfig(input: Record<string, unknown>, _baseCardId: string) {
    return normalizeBasecardConfig(input) as unknown as Record<string, unknown>;
  },
  validateConfig(config: Record<string, unknown>) {
    return validateBasecardConfig(
      normalizeBasecardConfig(config),
    );
  },
  collectResourcePaths(config: Record<string, unknown>) {
    return collectInternalResourcePaths(normalizeBasecardConfig(config));
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
      deleteResource: ctx.deleteResource,
    });
  },
} as const;

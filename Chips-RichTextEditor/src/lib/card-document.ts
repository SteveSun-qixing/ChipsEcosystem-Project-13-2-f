import yaml from "yaml";
import {
  collectRichTextResourcePaths,
  createInitialBasecardConfig,
  normalizeBasecardConfig,
  type RichTextBaseCardConfig,
} from "./richtext-card";

export const DEFAULT_COVER_RATIO = "3:4";

export interface CompositeCardResourceManifestEntry {
  path: string;
  size: number;
  type: string;
}

export interface RichTextCompositeCardDocument {
  cardId: string;
  baseCardId: string;
  title: string;
  createdAt: string;
  modifiedAt: string;
  coverRatio: string;
  config: RichTextBaseCardConfig;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function createDefaultCoverHtml(title: string): string {
  const safeTitle = escapeHtml(title);
  return [
    "<!doctype html>",
    "<html lang=\"zh-CN\">",
    "<head>",
    "  <meta charset=\"utf-8\" />",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    "  <style>",
    "    html, body { margin: 0; width: 100%; height: 100%; }",
    "    body {",
    "      display: grid;",
    "      place-items: center;",
    "      background: radial-gradient(circle at top, #fdf6ec 0%, #f2ebdd 48%, #e7decc 100%);",
    "      color: #2d241c;",
    "      font: 600 24px/1.35 \"Avenir Next\", \"PingFang SC\", \"Noto Sans CJK SC\", sans-serif;",
    "      text-align: center;",
    "      padding: 24px;",
    "      box-sizing: border-box;",
    "      overflow: hidden;",
    "    }",
    "  </style>",
    "</head>",
    `  <body>${safeTitle}</body>`,
    "</html>",
  ].join("\n");
}

export function createEmptyRichTextCardDocument(cardId: string, baseCardId: string, title: string): RichTextCompositeCardDocument {
  const timestamp = new Date().toISOString();
  return {
    cardId,
    baseCardId,
    title,
    createdAt: timestamp,
    modifiedAt: timestamp,
    coverRatio: DEFAULT_COVER_RATIO,
    config: createInitialBasecardConfig(title),
  };
}

export function parseCompositeRichTextCard(input: {
  metadataYaml: string;
  structureYaml: string;
  contentYaml: string;
}): RichTextCompositeCardDocument {
  const metadata = asRecord(yaml.parse(input.metadataYaml));
  const structure = asRecord(yaml.parse(input.structureYaml));
  const nodes = Array.isArray(structure.structure) ? structure.structure : [];

  if (nodes.length !== 1) {
    throw new Error("Only single-base-card composite cards can be edited here.");
  }

  const firstNode = asRecord(nodes[0]);
  const type = readString(firstNode.type);
  if (type !== "base.richtext" && type !== "RichTextCard") {
    throw new Error("The target card does not contain a rich text base card.");
  }

  const cardId = readString(metadata.card_id);
  const baseCardId = readString(firstNode.id);
  const title = readString(metadata.name);
  const createdAt = readString(metadata.created_at);
  const modifiedAt = readString(metadata.modified_at);

  if (!cardId || !baseCardId || !title || !createdAt || !modifiedAt) {
    throw new Error("The composite card metadata is incomplete.");
  }

  return {
    cardId,
    baseCardId,
    title,
    createdAt,
    modifiedAt,
    coverRatio: readString(metadata.cover_ratio) ?? DEFAULT_COVER_RATIO,
    config: normalizeBasecardConfig(asRecord(yaml.parse(input.contentYaml))),
  };
}

export function collectCompositeRichTextResourcePaths(document: RichTextCompositeCardDocument): string[] {
  return collectRichTextResourcePaths(document.config);
}

export function buildCompositeRichTextCardFiles(document: RichTextCompositeCardDocument): {
  metadataYaml: string;
  structureYaml: string;
  coverHtml: string;
  contentYaml: string;
}
export function buildCompositeRichTextCardFiles(
  document: RichTextCompositeCardDocument,
  resourceManifest: CompositeCardResourceManifestEntry[],
): {
  metadataYaml: string;
  structureYaml: string;
  coverHtml: string;
  contentYaml: string;
}
export function buildCompositeRichTextCardFiles(
  document: RichTextCompositeCardDocument,
  resourceManifest: CompositeCardResourceManifestEntry[] = [],
): {
  metadataYaml: string;
  structureYaml: string;
  coverHtml: string;
  contentYaml: string;
} {
  const metadata = {
    chip_standards_version: "1.0.0",
    card_id: document.cardId,
    name: document.title,
    created_at: document.createdAt,
    modified_at: document.modifiedAt,
    theme: "",
    cover_ratio: document.coverRatio,
    description: "",
    tags: [],
  };

  const structure = {
    structure: [
      {
        id: document.baseCardId,
        type: "base.richtext",
        created_at: document.createdAt,
        modified_at: document.modifiedAt,
      },
    ],
    manifest: {
      card_count: 1,
      resource_count: resourceManifest.length,
      resources: resourceManifest,
    },
  };

  return {
    metadataYaml: yaml.stringify(metadata),
    structureYaml: yaml.stringify(structure),
    coverHtml: createDefaultCoverHtml(document.title),
    contentYaml: yaml.stringify(document.config),
  };
}

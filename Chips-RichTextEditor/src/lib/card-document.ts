import yaml from "yaml";
import {
  collectRichTextResourcePaths,
  createInitialBasecardConfig,
  normalizeBasecardConfig,
  RICHTEXT_CARD_TYPE,
  type RichTextBaseCardConfig,
  type RichTextMarkdownCapabilities,
} from "./richtext-card";
import { normalizeRelativeResourcePath } from "./path";

export const DEFAULT_COVER_RATIO = "3:4";
const CARD_ID_PATTERN = /^[0-9a-zA-Z]{10}$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const COVER_RATIO_PATTERN = /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/;
const MARKDOWN_CAPABILITY_KEYS: Array<keyof RichTextMarkdownCapabilities> = [
  "commonmark",
  "gfm",
  "math",
  "highlight",
  "underline",
  "superscript",
  "subscript",
];

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

export interface CardStructureValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface CardStructureValidationResult {
  valid: boolean;
  issues: CardStructureValidationIssue[];
}

export class CardStructureValidationError extends Error {
  readonly issues: CardStructureValidationIssue[];

  constructor(issues: CardStructureValidationIssue[]) {
    const firstIssue = issues[0];
    super(
      firstIssue
        ? `The rich text card file structure is invalid: ${firstIssue.path} ${firstIssue.message}`
        : "The rich text card file structure is invalid.",
    );
    this.name = "CardStructureValidationError";
    this.issues = issues;
  }
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

function readRawString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidDateTime(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp);
}

function parseYamlRecord(source: string, path: string, issues: CardStructureValidationIssue[]): Record<string, unknown> {
  try {
    const parsed = yaml.parse(source);
    if (!isRecord(parsed)) {
      issues.push({
        path,
        code: "CARD_YAML_NOT_OBJECT",
        message: "must be a YAML object.",
      });
      return {};
    }
    return parsed;
  } catch (error) {
    issues.push({
      path,
      code: "CARD_YAML_PARSE_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
}

function addIssue(
  issues: CardStructureValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({
    path,
    code,
    message,
  });
}

function isValidInternalResourcePath(value: unknown): value is string {
  const normalized = normalizeRelativeResourcePath(readString(value));
  return !!normalized && normalized === readString(value) && !normalized.startsWith(".card/") && !normalized.startsWith("content/");
}

function toSortedUnique(paths: string[]): string[] {
  return Array.from(new Set(paths)).sort((left, right) => left.localeCompare(right));
}

function validateMetadata(metadata: Record<string, unknown>, issues: CardStructureValidationIssue[]): void {
  const version = readString(metadata.chip_standards_version);
  const cardId = readString(metadata.card_id);
  const name = readRawString(metadata.name);
  const createdAt = readString(metadata.created_at);
  const modifiedAt = readString(metadata.modified_at);
  const coverRatio = readString(metadata.cover_ratio) ?? DEFAULT_COVER_RATIO;

  if (!version || !SEMVER_PATTERN.test(version)) {
    addIssue(issues, ".card/metadata.yaml#chip_standards_version", "CARD_METADATA_VERSION_INVALID", "must be a semantic version string.");
  }
  if (!cardId || !CARD_ID_PATTERN.test(cardId)) {
    addIssue(issues, ".card/metadata.yaml#card_id", "CARD_METADATA_ID_INVALID", "must be a 10-character base62 card id.");
  }
  if (typeof name !== "string" || name.trim().length === 0 || name.length > 500) {
    addIssue(issues, ".card/metadata.yaml#name", "CARD_METADATA_NAME_INVALID", "must be a non-empty string no longer than 500 characters.");
  }
  if (!isValidDateTime(createdAt)) {
    addIssue(issues, ".card/metadata.yaml#created_at", "CARD_METADATA_CREATED_AT_INVALID", "must be a valid ISO date-time string.");
  }
  if (!isValidDateTime(modifiedAt)) {
    addIssue(issues, ".card/metadata.yaml#modified_at", "CARD_METADATA_MODIFIED_AT_INVALID", "must be a valid ISO date-time string.");
  }
  if (!COVER_RATIO_PATTERN.test(coverRatio)) {
    addIssue(issues, ".card/metadata.yaml#cover_ratio", "CARD_METADATA_COVER_RATIO_INVALID", "must use the width:height ratio format.");
  }
  if (metadata.tags !== undefined && !Array.isArray(metadata.tags)) {
    addIssue(issues, ".card/metadata.yaml#tags", "CARD_METADATA_TAGS_INVALID", "must be an array when present.");
  }
}

function validateRichTextConfig(
  content: Record<string, unknown>,
  issues: CardStructureValidationIssue[],
): { referencedResources: string[] } {
  const cardType = readString(content.card_type);
  const contentFormat = readString(content.content_format);
  const contentSource = readString(content.content_source);
  const contentText = readRawString(content.content_text);
  const contentFile = readString(content.content_file);
  const capabilities = asRecord(content.markdown_capabilities);

  if (cardType !== RICHTEXT_CARD_TYPE) {
    addIssue(issues, "content/<baseCardId>.yaml#card_type", "RICHTEXT_CARD_TYPE_INVALID", "must be base.richtext.");
  }
  if (contentFormat !== "markdown") {
    addIssue(issues, "content/<baseCardId>.yaml#content_format", "RICHTEXT_FORMAT_INVALID", "must be markdown.");
  }
  if (contentSource !== "inline" && contentSource !== "file") {
    addIssue(issues, "content/<baseCardId>.yaml#content_source", "RICHTEXT_SOURCE_INVALID", "must be inline or file.");
  }

  if (contentSource === "inline") {
    if (typeof contentText !== "string") {
      addIssue(issues, "content/<baseCardId>.yaml#content_text", "RICHTEXT_INLINE_TEXT_MISSING", "must be present in inline mode.");
    }
    if (contentFile) {
      addIssue(issues, "content/<baseCardId>.yaml#content_file", "RICHTEXT_INLINE_FILE_FORBIDDEN", "must be omitted in inline mode.");
    }
  }

  if (contentSource === "file") {
    if (!isValidInternalResourcePath(contentFile) || !contentFile.toLowerCase().endsWith(".md")) {
      addIssue(issues, "content/<baseCardId>.yaml#content_file", "RICHTEXT_FILE_PATH_INVALID", "must be a card-root relative .md resource path.");
    }
    if (typeof contentText === "string" && contentText.trim().length > 0) {
      addIssue(issues, "content/<baseCardId>.yaml#content_text", "RICHTEXT_FILE_TEXT_FORBIDDEN", "must be omitted in file mode.");
    }
  }

  for (const key of MARKDOWN_CAPABILITY_KEYS) {
    if (typeof capabilities[key] !== "boolean") {
      addIssue(
        issues,
        `content/<baseCardId>.yaml#markdown_capabilities.${key}`,
        "RICHTEXT_CAPABILITY_INVALID",
        "must be explicitly declared as a boolean.",
      );
    }
  }

  return {
    referencedResources: collectRichTextResourcePaths(normalizeBasecardConfig(content)),
  };
}

function validateStructure(
  structure: Record<string, unknown>,
  content: Record<string, unknown>,
  issues: CardStructureValidationIssue[],
): void {
  const nodes = Array.isArray(structure.structure) ? structure.structure : [];
  if (nodes.length !== 1) {
    addIssue(issues, ".card/structure.yaml#structure", "CARD_STRUCTURE_NODE_COUNT_INVALID", "must contain exactly one base card node.");
  }

  const firstNode = asRecord(nodes[0]);
  const baseCardId = readString(firstNode.id);
  const nodeType = readString(firstNode.type);
  if (!baseCardId || !CARD_ID_PATTERN.test(baseCardId)) {
    addIssue(issues, ".card/structure.yaml#structure[0].id", "CARD_STRUCTURE_BASE_ID_INVALID", "must be a 10-character base62 base card id.");
  }
  if (nodeType !== RICHTEXT_CARD_TYPE) {
    addIssue(issues, ".card/structure.yaml#structure[0].type", "CARD_STRUCTURE_NODE_TYPE_INVALID", "must be base.richtext.");
  }
  if (readString(content.card_type) && readString(content.card_type) !== nodeType) {
    addIssue(issues, "content/<baseCardId>.yaml#card_type", "CARD_CONTENT_TYPE_MISMATCH", "must match structure[0].type.");
  }
}

function validateManifest(
  structure: Record<string, unknown>,
  referencedResources: string[],
  issues: CardStructureValidationIssue[],
): void {
  const manifest = asRecord(structure.manifest);
  const cardCount = manifest.card_count;
  const resourceCount = manifest.resource_count;
  const resources = Array.isArray(manifest.resources) ? manifest.resources : [];
  const manifestPaths: string[] = [];
  const seenPaths = new Set<string>();

  if (cardCount !== 1) {
    addIssue(issues, ".card/structure.yaml#manifest.card_count", "CARD_MANIFEST_CARD_COUNT_INVALID", "must be 1.");
  }
  if (typeof resourceCount !== "number" || !Number.isInteger(resourceCount) || resourceCount < 0) {
    addIssue(issues, ".card/structure.yaml#manifest.resource_count", "CARD_MANIFEST_RESOURCE_COUNT_INVALID", "must be a non-negative integer.");
  }
  if (!Array.isArray(manifest.resources)) {
    addIssue(issues, ".card/structure.yaml#manifest.resources", "CARD_MANIFEST_RESOURCES_INVALID", "must be an array.");
  }

  resources.forEach((resource, index) => {
    const record = asRecord(resource);
    const resourcePath = readString(record.path);
    const resourceSize = record.size;
    const resourceType = readString(record.type);

    if (!isValidInternalResourcePath(resourcePath)) {
      addIssue(issues, `.card/structure.yaml#manifest.resources[${index}].path`, "CARD_MANIFEST_RESOURCE_PATH_INVALID", "must be a card-root relative resource path.");
      return;
    }

    if (seenPaths.has(resourcePath)) {
      addIssue(issues, `.card/structure.yaml#manifest.resources[${index}].path`, "CARD_MANIFEST_RESOURCE_PATH_DUPLICATED", "must be unique.");
    }
    seenPaths.add(resourcePath);
    manifestPaths.push(resourcePath);

    if (typeof resourceSize !== "number" || !Number.isFinite(resourceSize) || resourceSize < 0) {
      addIssue(issues, `.card/structure.yaml#manifest.resources[${index}].size`, "CARD_MANIFEST_RESOURCE_SIZE_INVALID", "must be a non-negative number.");
    }
    if (!resourceType) {
      addIssue(issues, `.card/structure.yaml#manifest.resources[${index}].type`, "CARD_MANIFEST_RESOURCE_TYPE_INVALID", "must be a non-empty MIME type.");
    }
  });

  if (typeof resourceCount === "number" && resourceCount !== resources.length) {
    addIssue(issues, ".card/structure.yaml#manifest.resource_count", "CARD_MANIFEST_RESOURCE_COUNT_MISMATCH", "must equal manifest.resources.length.");
  }

  const normalizedManifestPaths = toSortedUnique(manifestPaths);
  const normalizedReferencedResources = toSortedUnique(referencedResources);
  if (normalizedManifestPaths.join("\n") !== normalizedReferencedResources.join("\n")) {
    addIssue(
      issues,
      ".card/structure.yaml#manifest.resources",
      "CARD_MANIFEST_REFERENCES_MISMATCH",
      "must exactly match resources referenced by the rich text base card config.",
    );
  }
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

export function validateCompositeRichTextCardFiles(input: {
  metadataYaml: string;
  structureYaml: string;
  contentYaml: string;
  coverHtml: string;
}): CardStructureValidationResult {
  const issues: CardStructureValidationIssue[] = [];
  const metadata = parseYamlRecord(input.metadataYaml, ".card/metadata.yaml", issues);
  const structure = parseYamlRecord(input.structureYaml, ".card/structure.yaml", issues);
  const content = parseYamlRecord(input.contentYaml, "content/<baseCardId>.yaml", issues);

  validateMetadata(metadata, issues);
  validateStructure(structure, content, issues);
  const { referencedResources } = validateRichTextConfig(content, issues);
  validateManifest(structure, referencedResources, issues);

  if (input.coverHtml.trim().length === 0) {
    addIssue(issues, ".card/cover.html", "CARD_COVER_EMPTY", "must not be empty.");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function assertCompositeRichTextCardFiles(input: {
  metadataYaml: string;
  structureYaml: string;
  contentYaml: string;
  coverHtml: string;
}): void {
  const validation = validateCompositeRichTextCardFiles(input);
  if (!validation.valid) {
    throw new CardStructureValidationError(validation.issues);
  }
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

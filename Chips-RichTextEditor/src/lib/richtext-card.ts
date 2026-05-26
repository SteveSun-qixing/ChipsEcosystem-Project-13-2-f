import { normalizeRelativeResourcePath } from "./path";

export const MARKDOWN_CONTENT_FORMAT = "markdown" as const;
export const DEFAULT_RICHTEXT_LOCALE = "zh-CN" as const;
export const RICHTEXT_CARD_TYPE = "base.richtext" as const;
export const LEGACY_RICHTEXT_CARD_TYPE = "RichTextCard" as const;

export type RichTextContentSource = "inline" | "file";

export interface RichTextMarkdownCapabilities {
  commonmark: boolean;
  gfm: boolean;
  math: boolean;
  highlight: boolean;
  underline: boolean;
  superscript: boolean;
  subscript: boolean;
}

export interface RichTextBaseCardConfig {
  card_type: typeof RICHTEXT_CARD_TYPE;
  theme?: string;
  locale?: string;
  content_format: "markdown";
  content_source: RichTextContentSource;
  content_text?: string;
  content_file?: string;
  markdown_capabilities: RichTextMarkdownCapabilities;
}

const MARKDOWN_RESOURCE_PATTERN = /!?\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)|<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>|<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;

export const DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES: RichTextMarkdownCapabilities = {
  commonmark: true,
  gfm: true,
  math: true,
  highlight: true,
  underline: true,
  superscript: true,
  subscript: true,
};

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeCapabilities(input: unknown): RichTextMarkdownCapabilities {
  const record = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};

  return {
    commonmark: record.commonmark === false ? false : DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES.commonmark,
    gfm: record.gfm === false ? false : DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES.gfm,
    math: record.math === false ? false : DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES.math,
    highlight: record.highlight === false ? false : DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES.highlight,
    underline: record.underline === false ? false : DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES.underline,
    superscript: record.superscript === false ? false : DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES.superscript,
    subscript: record.subscript === false ? false : DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES.subscript,
  };
}

export function createInlineBasecardConfig(markdown: string, locale = DEFAULT_RICHTEXT_LOCALE, theme = ""): RichTextBaseCardConfig {
  return {
    card_type: RICHTEXT_CARD_TYPE,
    theme,
    locale,
    content_format: MARKDOWN_CONTENT_FORMAT,
    content_source: "inline",
    content_text: normalizeMarkdown(markdown),
    markdown_capabilities: { ...DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES },
  };
}

export function createFileBasecardConfig(
  resourcePath: string,
  locale = DEFAULT_RICHTEXT_LOCALE,
  theme = "",
): RichTextBaseCardConfig {
  return {
    card_type: RICHTEXT_CARD_TYPE,
    theme,
    locale,
    content_format: MARKDOWN_CONTENT_FORMAT,
    content_source: "file",
    content_file: normalizeRelativeResourcePath(resourcePath) ?? "",
    markdown_capabilities: { ...DEFAULT_RICHTEXT_MARKDOWN_CAPABILITIES },
  };
}

export function collectRichTextResourcePaths(config: RichTextBaseCardConfig): string[] {
  const paths: string[] = [];

  if (config.content_source === "file") {
    const resourcePath = normalizeRelativeResourcePath(config.content_file);
    if (resourcePath && resourcePath.toLowerCase().endsWith(".md")) {
      paths.push(resourcePath);
    }
  } else {
    const markdown = config.content_text ?? "";
    for (const match of markdown.matchAll(MARKDOWN_RESOURCE_PATTERN)) {
      const rawPath = match[1] ?? match[2] ?? match[3] ?? "";
      const resourcePath = normalizeRelativeResourcePath(rawPath);
      if (resourcePath) {
        paths.push(resourcePath);
      }
    }
  }

  return Array.from(new Set(paths));
}

export function createInitialBasecardConfig(title: string, locale = DEFAULT_RICHTEXT_LOCALE): RichTextBaseCardConfig {
  return createInlineBasecardConfig(`# ${title}\n\n`, locale, "");
}

export function normalizeBasecardConfig(input: Record<string, unknown> | null | undefined): RichTextBaseCardConfig {
  const record = (input ?? {}) as Record<string, unknown>;
  const locale = readString(record.locale) ?? DEFAULT_RICHTEXT_LOCALE;
  const theme = readString(record.theme) ?? "";
  const contentFile = normalizeRelativeResourcePath(readString(record.content_file));
  const contentSource = record.content_source === "file" || contentFile ? "file" : "inline";
  const markdownCapabilities = normalizeCapabilities(record.markdown_capabilities);

  if (contentSource === "file" && contentFile) {
    return {
      card_type: RICHTEXT_CARD_TYPE,
      theme,
      locale,
      content_format: MARKDOWN_CONTENT_FORMAT,
      content_source: "file",
      content_file: contentFile,
      markdown_capabilities: markdownCapabilities,
    };
  }

  const markdown = typeof record.content_text === "string"
    ? record.content_text
    : typeof record.markdown === "string"
      ? record.markdown
      : "";

  return {
    card_type: RICHTEXT_CARD_TYPE,
    theme,
    locale,
    content_format: MARKDOWN_CONTENT_FORMAT,
    content_source: "inline",
    content_text: normalizeMarkdown(markdown),
    markdown_capabilities: markdownCapabilities,
  };
}

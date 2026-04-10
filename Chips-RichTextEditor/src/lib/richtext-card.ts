import { normalizeRelativeResourcePath } from "./path";

export const MARKDOWN_CONTENT_FORMAT = "markdown" as const;
export const DEFAULT_RICHTEXT_LOCALE = "zh-CN" as const;

export type RichTextContentSource = "inline" | "file";

export interface RichTextBaseCardConfig {
  card_type: "RichTextCard";
  theme?: string;
  locale?: string;
  content_format: "markdown";
  content_source: RichTextContentSource;
  content_text?: string;
  content_file?: string;
}

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export function createInlineBasecardConfig(markdown: string, locale = DEFAULT_RICHTEXT_LOCALE, theme = ""): RichTextBaseCardConfig {
  return {
    card_type: "RichTextCard",
    theme,
    locale,
    content_format: MARKDOWN_CONTENT_FORMAT,
    content_source: "inline",
    content_text: normalizeMarkdown(markdown),
  };
}

export function collectRichTextResourcePaths(config: RichTextBaseCardConfig): string[] {
  if (config.content_source !== "file") {
    return [];
  }

  const resourcePath = normalizeRelativeResourcePath(config.content_file);
  return resourcePath && resourcePath.toLowerCase().endsWith(".md") ? [resourcePath] : [];
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

  if (contentSource === "file" && contentFile) {
    return {
      card_type: "RichTextCard",
      theme,
      locale,
      content_format: MARKDOWN_CONTENT_FORMAT,
      content_source: "file",
      content_file: contentFile,
    };
  }

  const markdown = typeof record.content_text === "string"
    ? record.content_text
    : typeof record.markdown === "string"
      ? record.markdown
      : "";

  return {
    card_type: "RichTextCard",
    theme,
    locale,
    content_format: MARKDOWN_CONTENT_FORMAT,
    content_source: "inline",
    content_text: normalizeMarkdown(markdown),
  };
}

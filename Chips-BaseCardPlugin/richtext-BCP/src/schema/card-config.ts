import {
  DEFAULT_RICHTEXT_MARKDOWN,
  MARKDOWN_CONTENT_FORMAT,
  countPlainTextLengthFromMarkdown,
  hasMeaningfulMarkdownContent,
  isMarkdownFilePath,
  isNonEmptyString,
  normalizeMarkdown,
  normalizeResourcePath,
} from "../shared/utils";

export type RichTextContentSource = "inline" | "file";

export interface BasecardConfig {
  card_type: "RichTextCard";
  theme?: string;
  locale?: string;
  content_format: "markdown";
  content_source: RichTextContentSource;
  content_text?: string;
  content_file?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const defaultBasecardConfig: BasecardConfig = {
  card_type: "RichTextCard",
  theme: "",
  locale: "zh-CN",
  content_format: MARKDOWN_CONTENT_FORMAT,
  content_source: "inline",
  content_text: "",
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function inferContentSource(record: Record<string, unknown>): RichTextContentSource {
  const rawSource = asString(record.content_source);
  if (rawSource === "file") {
    return "file";
  }
  if (rawSource === "inline") {
    return "inline";
  }
  if (isNonEmptyString(record.content_file)) {
    return "file";
  }
  return "inline";
}

export function createInlineBasecardConfig(markdown: string, locale = "zh-CN", theme = ""): BasecardConfig {
  return {
    card_type: "RichTextCard",
    theme,
    locale,
    content_format: MARKDOWN_CONTENT_FORMAT,
    content_source: "inline",
    content_text: normalizeMarkdown(markdown),
  };
}

export function createFileBasecardConfig(
  resourcePath: string,
  locale = "zh-CN",
  theme = "",
): BasecardConfig {
  return {
    card_type: "RichTextCard",
    theme,
    locale,
    content_format: MARKDOWN_CONTENT_FORMAT,
    content_source: "file",
    content_file: normalizeResourcePath(resourcePath),
  };
}

export function normalizeBasecardConfig(
  input: Partial<BasecardConfig> | Record<string, unknown> | null | undefined,
): BasecardConfig {
  const record = (input ?? {}) as Record<string, unknown>;
  const contentSource = inferContentSource(record);
  const locale = asString(record.locale) ?? defaultBasecardConfig.locale;
  const theme = asString(record.theme) ?? defaultBasecardConfig.theme;

  if (contentSource === "file") {
    const contentFile = normalizeResourcePath(asString(record.content_file) ?? "");
    return {
      card_type: "RichTextCard",
      theme,
      locale,
      content_format: MARKDOWN_CONTENT_FORMAT,
      content_source: "file",
      content_file: contentFile,
    };
  }

  const contentText = normalizeMarkdown(
    typeof record.content_text === "string"
      ? record.content_text
      : typeof record.markdown === "string"
        ? record.markdown
        : "",
  );

  return {
    card_type: "RichTextCard",
    theme,
    locale,
    content_format: MARKDOWN_CONTENT_FORMAT,
    content_source: "inline",
    content_text: contentText,
  };
}

export function createInitialBasecardConfig(): BasecardConfig {
  return createInlineBasecardConfig(DEFAULT_RICHTEXT_MARKDOWN);
}

export function validateBasecardConfig(config: BasecardConfig): ConfigValidationResult {
  const errors: Record<string, string> = {};

  if (config.card_type !== "RichTextCard") {
    errors.card_type = "card_type 必须为 RichTextCard";
  }

  if (config.content_format !== MARKDOWN_CONTENT_FORMAT) {
    errors.content_format = "content_format 必须为 markdown";
  }

  if (!isNonEmptyString(config.locale)) {
    errors.locale = "locale 不能为空";
  }

  if (config.content_source === "inline") {
    if (!hasMeaningfulMarkdownContent(config.content_text ?? "")) {
      errors.content_text = "Markdown 内容不能为空";
    }
  } else {
    if (!isMarkdownFilePath(config.content_file)) {
      errors.content_file = "content_file 必须为卡片根目录相对 .md 路径";
    }
  }

  if (config.content_source === "inline" && isNonEmptyString(config.content_file)) {
    errors.content_source = "inline 模式下不能同时保存 content_file";
  }

  if (config.content_source === "file" && isNonEmptyString(config.content_text)) {
    errors.content_source = "file 模式下不能同时保存 content_text";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function collectRichTextResourcePaths(config: BasecardConfig): string[] {
  if (config.content_source !== "file") {
    return [];
  }

  const resourcePath = normalizeResourcePath(config.content_file ?? "");
  return isMarkdownFilePath(resourcePath) ? [resourcePath] : [];
}

export function getPlainTextLength(config: BasecardConfig): number {
  if (config.content_source === "file") {
    return 0;
  }
  return countPlainTextLengthFromMarkdown(config.content_text ?? "");
}

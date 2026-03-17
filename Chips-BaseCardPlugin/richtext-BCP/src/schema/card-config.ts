import {
  hasMeaningfulRichTextContent,
  isNonEmptyString,
  normalizeRichTextHtml,
} from "../shared/utils";

export interface BasecardConfig {
  /**
   * 富文本基础卡片正式内容模型标识。
   */
  card_type: "RichTextCard";

  /**
   * 主题变体标识，由上层主题系统消费；为空表示跟随当前主题。
   */
  theme?: string;

  /**
   * 富文本正文，使用经过净化的 HTML 字符串保存。
   */
  body: string;

  /**
   * 语言代码，例如 zh-CN / en-US。
   */
  locale?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const defaultBasecardConfig: BasecardConfig = {
  card_type: "RichTextCard",
  theme: "",
  body: "<p></p>",
  locale: "zh-CN",
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export function normalizeBasecardConfig(input: Record<string, unknown> | null | undefined): BasecardConfig {
  const record = input ?? {};
  const rawBody =
    typeof record.body === "string"
      ? record.body
      : typeof record.content_text === "string"
        ? record.content_text
        : defaultBasecardConfig.body;

  return {
    card_type: "RichTextCard",
    theme: asString(record.theme) ?? defaultBasecardConfig.theme,
    body: normalizeRichTextHtml(rawBody),
    locale: asString(record.locale) ?? defaultBasecardConfig.locale,
  };
}

export function validateBasecardConfig(config: BasecardConfig): ConfigValidationResult {
  const errors: Record<string, string> = {};

  if (config.card_type !== "RichTextCard") {
    errors.card_type = "card_type 必须为 RichTextCard";
  }

  if (!isNonEmptyString(config.locale)) {
    errors.locale = "locale 不能为空";
  }

  if (!hasMeaningfulRichTextContent(config.body)) {
    errors.body = "正文内容不能为空";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

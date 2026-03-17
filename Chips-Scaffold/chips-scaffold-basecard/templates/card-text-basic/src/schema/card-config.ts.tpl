import { isNonEmptyString } from "../shared/utils";

export interface BasecardConfig {
  card_type: "{{ CARD_TYPE }}";
  theme?: string;
  title: string;
  body: string;
  locale?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const defaultBasecardConfig: BasecardConfig = {
  card_type: "{{ CARD_TYPE }}",
  theme: "",
  title: "",
  body: "",
  locale: "zh-CN",
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export function normalizeBasecardConfig(
  input: Partial<BasecardConfig> | Record<string, unknown> | null | undefined
): BasecardConfig {
  const record = (input ?? {}) as Record<string, unknown>;

  return {
    card_type: "{{ CARD_TYPE }}",
    theme: asString(record.theme) ?? defaultBasecardConfig.theme,
    title: asString(record.title) ?? defaultBasecardConfig.title,
    body: asString(record.body) ?? defaultBasecardConfig.body,
    locale: asString(record.locale) ?? defaultBasecardConfig.locale,
  };
}

export function validateBasecardConfig(config: BasecardConfig): ConfigValidationResult {
  const errors: Record<string, string> = {};

  if (config.card_type !== "{{ CARD_TYPE }}") {
    errors.card_type = "card_type 必须与插件声明一致";
  }

  if (!isNonEmptyString(config.title)) {
    errors.title = "标题不能为空。";
  }

  if (!isNonEmptyString(config.body)) {
    errors.body = "内容不能为空。";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

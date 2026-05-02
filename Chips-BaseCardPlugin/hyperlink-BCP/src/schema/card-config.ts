import { isNonEmptyString, validateHyperlinkUrl } from "../shared/utils";

export interface BasecardConfig {
  card_type: "HyperlinkCard";
  theme?: string;
  locale?: string;
  anchor_text: string;
  url: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const defaultBasecardConfig: BasecardConfig = {
  card_type: "HyperlinkCard",
  theme: "",
  locale: "zh-CN",
  anchor_text: "",
  url: "",
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export function normalizeBasecardConfig(
  input: Partial<BasecardConfig> | Record<string, unknown> | null | undefined
): BasecardConfig {
  const record = (input ?? {}) as Record<string, unknown>;

  return {
    card_type: "HyperlinkCard",
    theme: asString(record.theme) ?? defaultBasecardConfig.theme,
    locale: asString(record.locale) ?? defaultBasecardConfig.locale,
    anchor_text: asString(record.anchor_text) ?? defaultBasecardConfig.anchor_text,
    url: asString(record.url) ?? defaultBasecardConfig.url,
  };
}

export function validateBasecardConfig(config: BasecardConfig): ConfigValidationResult {
  const errors: Record<string, string> = {};

  if (config.card_type !== "HyperlinkCard") {
    errors.card_type = "hyperlink.validation.cardType";
  }

  if (!isNonEmptyString(config.anchor_text)) {
    errors.anchor_text = "hyperlink.validation.anchorRequired";
  }

  if (!isNonEmptyString(config.url)) {
    errors.url = "hyperlink.validation.urlRequired";
  } else if (!validateHyperlinkUrl(config.url)) {
    errors.url = "hyperlink.validation.urlInvalid";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

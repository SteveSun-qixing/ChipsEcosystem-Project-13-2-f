import { isNonEmptyString } from "../shared/utils";

export interface BasecardConfig {
  card_type: "{{ CARD_TYPE }}";
  theme?: string;
  title: string;
  body: string;
  locale?: string;
  resource_path?: string;
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

function normalizeResourcePath(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) {
    return undefined;
  }

  return raw.replace(/\\/g, "/");
}

export function isCardRootResourcePath(value: string): boolean {
  const normalized = value.trim().replace(/\\/g, "/");
  if (!normalized) {
    return false;
  }

  if (
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("~") ||
    /^[a-zA-Z]:\//.test(normalized) ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized) ||
    /[?#]/.test(normalized) ||
    /[\u0000-\u001f]/.test(normalized)
  ) {
    return false;
  }

  const segments = normalized.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
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
    resource_path: normalizeResourcePath(record.resource_path),
  };
}

export function collectBasecardResourcePaths(
  input: Partial<BasecardConfig> | Record<string, unknown> | null | undefined
): string[] {
  const normalized = normalizeBasecardConfig(input);
  if (!normalized.resource_path || !isCardRootResourcePath(normalized.resource_path)) {
    return [];
  }

  return Array.from(new Set([normalized.resource_path]));
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

  if (config.resource_path && !isCardRootResourcePath(config.resource_path)) {
    errors.resource_path = "资源路径必须是卡片根目录内的相对路径。";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

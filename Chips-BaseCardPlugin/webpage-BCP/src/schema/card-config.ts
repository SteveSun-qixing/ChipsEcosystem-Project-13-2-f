import {
  dedupeResourcePaths,
  isNonEmptyString,
  normalizeRelativeCardResourcePath,
  validateWebpageUrl,
} from "../shared/utils";

export type WebpageSourceType = "url" | "bundle";
export type WebpageDisplayMode = "fixed" | "free";
export type WebpageFixedRatio = "7:16";

export interface BasecardConfig {
  card_type: "WebPageCard";
  theme?: string;
  source_type: WebpageSourceType;
  source_url?: string;
  bundle_root?: string;
  entry_file?: string;
  resource_paths: string[];
  display_mode: WebpageDisplayMode;
  fixed_ratio: WebpageFixedRatio;
  max_height_ratio: number;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const defaultBasecardConfig: BasecardConfig = {
  card_type: "WebPageCard",
  theme: "",
  source_type: "url",
  source_url: "",
  bundle_root: "",
  entry_file: "index.html",
  resource_paths: [],
  display_mode: "fixed",
  fixed_ratio: "7:16",
  max_height_ratio: 20,
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function asPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function asDisplayMode(value: unknown): WebpageDisplayMode | undefined {
  return value === "free" || value === "fixed" ? value : undefined;
}

export function normalizeBasecardConfig(
  input: Partial<BasecardConfig> | Record<string, unknown> | null | undefined,
): BasecardConfig {
  const record = (input ?? {}) as Partial<BasecardConfig> & Record<string, unknown>;
  const sourceType: WebpageSourceType = record.source_type === "bundle" ? "bundle" : "url";
  const displayMode = asDisplayMode(record.display_mode) ?? defaultBasecardConfig.display_mode;

  return {
    card_type: "WebPageCard",
    theme: asString(record.theme) ?? defaultBasecardConfig.theme,
    source_type: sourceType,
    source_url: sourceType === "url" ? asString(record.source_url) ?? "" : "",
    bundle_root: sourceType === "bundle"
      ? normalizeRelativeCardResourcePath(record.bundle_root) ?? ""
      : "",
    entry_file: sourceType === "bundle"
      ? normalizeRelativeCardResourcePath(record.entry_file) ?? "index.html"
      : "index.html",
    resource_paths: sourceType === "bundle" && Array.isArray(record.resource_paths)
      ? dedupeResourcePaths(record.resource_paths.map((item) => String(item)))
      : [],
    display_mode: displayMode,
    fixed_ratio: "7:16",
    max_height_ratio: asPositiveNumber(record.max_height_ratio) ?? defaultBasecardConfig.max_height_ratio,
  };
}

export function validateBasecardConfig(config: BasecardConfig): ConfigValidationResult {
  const errors: Record<string, string> = {};

  if (config.card_type !== "WebPageCard") {
    errors.card_type = "webpage.validation.cardType";
  }

  if (config.source_type === "url" && isNonEmptyString(config.source_url) && !validateWebpageUrl(config.source_url)) {
    errors.source_url = "webpage.validation.sourceUrl";
  }

  if (config.source_type === "bundle") {
    if (isNonEmptyString(config.bundle_root) && config.entry_file !== "index.html") {
      errors.entry_file = "webpage.validation.entryFile";
    }

    if (isNonEmptyString(config.bundle_root)) {
      const entryPath = `${config.bundle_root}/index.html`;
      if (!config.resource_paths.includes(entryPath)) {
        errors.resource_paths = "webpage.validation.resourcePathsEntry";
      }
    }
  }

  if (config.display_mode !== "fixed" && config.display_mode !== "free") {
    errors.display_mode = "webpage.validation.displayMode";
  }

  if (config.fixed_ratio !== "7:16") {
    errors.fixed_ratio = "webpage.validation.fixedRatio";
  }

  if (config.max_height_ratio !== 20) {
    errors.max_height_ratio = "webpage.validation.maxHeightRatio";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

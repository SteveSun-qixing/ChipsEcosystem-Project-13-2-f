export type SortMode = "manual" | "name-asc" | "name-desc";
export type ColumnMode = "auto" | "compact" | "wide";
export type GapMode = "compact" | "regular" | "spacious";
export type TitleMode = "below-cover" | "overlay" | "hidden";

export interface FrameRegionConfig {
  mode: "none" | "image" | "html";
  assetPath?: string;
  html?: string;
}

export interface LayoutConfig {
  schemaVersion: string;
  props: {
    sortMode: SortMode;
    columnMode: ColumnMode;
    gap: GapMode;
    titleMode: TitleMode;
    showSummary: boolean;
    pageSize: number;
    background: FrameRegionConfig;
    topRegion: FrameRegionConfig;
  };
  assetRefs: string[];
}

export const defaultLayoutConfig: LayoutConfig = {
  schemaVersion: "1.0.0",
  props: {
    sortMode: "manual",
    columnMode: "auto",
    gap: "regular",
    titleMode: "below-cover",
    showSummary: true,
    pageSize: 120,
    background: {
      mode: "none",
    },
    topRegion: {
      mode: "none",
    },
  },
  assetRefs: [],
};

function normalizeSortMode(value: unknown): SortMode {
  if (value === "name-asc" || value === "name-desc") {
    return value;
  }
  return "manual";
}

function normalizeColumnMode(value: unknown): ColumnMode {
  if (value === "compact" || value === "wide") {
    return value;
  }
  return "auto";
}

function normalizeGap(value: unknown): GapMode {
  if (value === "compact" || value === "spacious") {
    return value;
  }
  return "regular";
}

function normalizeTitleMode(value: unknown): TitleMode {
  if (value === "overlay" || value === "hidden") {
    return value;
  }
  return "below-cover";
}

function normalizePageSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultLayoutConfig.props.pageSize;
  }
  return Math.min(240, Math.max(20, Math.round(value)));
}

const BOX_ASSET_PATH_PATTERN = /^assets\/[^\\:?#/]+(?:\/[^\\:?#/]+)*$/;

export function isSafeBoxAssetPath(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed !== value || !BOX_ASSET_PATH_PATTERN.test(trimmed)) {
    return false;
  }
  if (trimmed.startsWith("/") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return false;
  }

  return trimmed.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function collectFrameRegionAssetRefs(config: LayoutConfig): string[] {
  const nextAssetRefs = [
    config.props.background.mode === "image" ? config.props.background.assetPath : undefined,
    config.props.topRegion.mode === "image" ? config.props.topRegion.assetPath : undefined,
  ].filter((value): value is string =>
    typeof value === "string" && value.length > 0 && isSafeBoxAssetPath(value)
  );

  return [...new Set(nextAssetRefs)];
}

function normalizeFrameRegion(value: unknown): FrameRegionConfig {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const mode = raw.mode === "image" || raw.mode === "html" ? raw.mode : "none";
  const rawAssetPath = typeof raw.assetPath === "string" ? raw.assetPath : "";
  const assetPath = rawAssetPath.length > 0 && isSafeBoxAssetPath(rawAssetPath) ? rawAssetPath : undefined;
  const html = typeof raw.html === "string" && raw.html.trim().length > 0
    ? raw.html
    : undefined;

  if (mode === "image" && assetPath) {
    return {
      mode: "image",
      assetPath,
    };
  }

  if (mode === "image") {
    return {
      mode: "image",
    };
  }

  if (mode === "html" && html) {
    return {
      mode: "html",
      html,
    };
  }

  if (mode === "html") {
    return {
      mode: "html",
      html: typeof raw.html === "string" ? raw.html : "",
    };
  }

  return {
    mode: "none",
  };
}

function syncAssetRefs(config: LayoutConfig): LayoutConfig {
  return {
    ...config,
    assetRefs: collectFrameRegionAssetRefs(config),
  };
}

export function hasFrameRegionContent(region: FrameRegionConfig): boolean {
  if (region.mode === "image") {
    return typeof region.assetPath === "string" && region.assetPath.trim().length > 0;
  }

  if (region.mode === "html") {
    return typeof region.html === "string" && region.html.trim().length > 0;
  }

  return false;
}

export function createDefaultLayoutConfig(): LayoutConfig {
  return {
    schemaVersion: defaultLayoutConfig.schemaVersion,
    props: {
      sortMode: defaultLayoutConfig.props.sortMode,
      columnMode: defaultLayoutConfig.props.columnMode,
      gap: defaultLayoutConfig.props.gap,
      titleMode: defaultLayoutConfig.props.titleMode,
      showSummary: defaultLayoutConfig.props.showSummary,
      pageSize: defaultLayoutConfig.props.pageSize,
      background: { ...defaultLayoutConfig.props.background },
      topRegion: { ...defaultLayoutConfig.props.topRegion },
    },
    assetRefs: [],
  };
}

export function normalizeLayoutConfig(input: LayoutConfig | Record<string, unknown> | undefined): LayoutConfig {
  const props = typeof input?.props === "object" && input?.props ? input.props as Record<string, unknown> : {};
  return syncAssetRefs({
    schemaVersion:
      typeof input?.schemaVersion === "string" && input.schemaVersion.trim().length > 0
        ? input.schemaVersion
        : defaultLayoutConfig.schemaVersion,
    props: {
      sortMode: normalizeSortMode(props.sortMode),
      columnMode: normalizeColumnMode(props.columnMode),
      gap: normalizeGap(props.gap),
      titleMode: normalizeTitleMode(props.titleMode),
      showSummary: typeof props.showSummary === "boolean" ? props.showSummary : defaultLayoutConfig.props.showSummary,
      pageSize: normalizePageSize(props.pageSize),
      background: normalizeFrameRegion(props.background),
      topRegion: normalizeFrameRegion(props.topRegion),
    },
    assetRefs: Array.isArray(input?.assetRefs)
      ? input.assetRefs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
  });
}

export function validateLayoutConfig(config: LayoutConfig): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!["manual", "name-asc", "name-desc"].includes(config.props.sortMode)) {
    errors["props.sortMode"] = "sortMode is invalid.";
  }
  if (!["auto", "compact", "wide"].includes(config.props.columnMode)) {
    errors["props.columnMode"] = "columnMode is invalid.";
  }
  if (!["compact", "regular", "spacious"].includes(config.props.gap)) {
    errors["props.gap"] = "gap is invalid.";
  }
  if (!["below-cover", "overlay", "hidden"].includes(config.props.titleMode)) {
    errors["props.titleMode"] = "titleMode is invalid.";
  }
  if (typeof config.props.showSummary !== "boolean") {
    errors["props.showSummary"] = "showSummary must be boolean.";
  }
  if (!Number.isInteger(config.props.pageSize) || config.props.pageSize < 20 || config.props.pageSize > 240) {
    errors["props.pageSize"] = "pageSize must be an integer between 20 and 240.";
  }

  const backgroundAssetPath = config.props.background.assetPath;
  if (config.props.background.mode === "image") {
    if (!backgroundAssetPath) {
      errors["props.background.assetPath"] = "background assetPath is required when mode is image.";
    } else if (!isSafeBoxAssetPath(backgroundAssetPath)) {
      errors["props.background.assetPath"] = "background assetPath must be a box assets/ relative path.";
    }
  }
  if (config.props.background.mode === "html" && !config.props.background.html) {
    errors["props.background.html"] = "background html is required when mode is html.";
  }
  const topRegionAssetPath = config.props.topRegion.assetPath;
  if (config.props.topRegion.mode === "image") {
    if (!topRegionAssetPath) {
      errors["props.topRegion.assetPath"] = "topRegion assetPath is required when mode is image.";
    } else if (!isSafeBoxAssetPath(topRegionAssetPath)) {
      errors["props.topRegion.assetPath"] = "topRegion assetPath must be a box assets/ relative path.";
    }
  }
  if (config.props.topRegion.mode === "html" && !config.props.topRegion.html) {
    errors["props.topRegion.html"] = "topRegion html is required when mode is html.";
  }

  config.assetRefs.forEach((assetPath, index) => {
    if (!isSafeBoxAssetPath(assetPath)) {
      errors[`assetRefs[${index}]`] = "assetRefs item must be a box assets/ relative path.";
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLayoutConfigInput(input: LayoutConfig | Record<string, unknown> | undefined): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const normalized = normalizeLayoutConfig(input);
  const result = validateLayoutConfig(normalized);
  const errors = { ...result.errors };

  if (Array.isArray(input?.assetRefs)) {
    input.assetRefs.forEach((assetRef, index) => {
      if (typeof assetRef !== "string" || !isSafeBoxAssetPath(assetRef)) {
        errors[`assetRefs[${index}]`] = "assetRefs item must be a box assets/ relative path.";
      }
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

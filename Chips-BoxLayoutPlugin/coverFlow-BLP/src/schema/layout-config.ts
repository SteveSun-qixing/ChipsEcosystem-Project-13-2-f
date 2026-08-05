export type SortMode = "manual" | "name-asc" | "name-desc";
export type CoverSize = "compact" | "regular" | "large";
export type CoverFlowSpacing = "tight" | "regular" | "wide";
export type WheelSensitivity = "low" | "medium" | "high";

export interface FrameRegionConfig {
  mode: "none" | "image" | "html";
  assetPath?: string;
  html?: string;
}

export interface LayoutConfig {
  schemaVersion: string;
  props: {
    sortMode: SortMode;
    coverSize: CoverSize;
    sideAngleDeg: number;
    centerScale: number;
    spacing: CoverFlowSpacing;
    showReflection: boolean;
    wheelSensitivity: WheelSensitivity;
    background: FrameRegionConfig;
    topRegion: FrameRegionConfig;
  };
  assetRefs: string[];
}

export const SIDE_ANGLE_MIN = 15;
export const SIDE_ANGLE_MAX = 75;
export const CENTER_SCALE_MIN = 1;
export const CENTER_SCALE_MAX = 1.5;

export const defaultLayoutConfig: LayoutConfig = {
  schemaVersion: "1.0.0",
  props: {
    sortMode: "manual",
    coverSize: "regular",
    sideAngleDeg: 58,
    centerScale: 1.18,
    spacing: "regular",
    showReflection: true,
    wheelSensitivity: "medium",
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

function normalizeCoverSize(value: unknown): CoverSize {
  if (value === "compact" || value === "large") {
    return value;
  }
  return "regular";
}

function normalizeSpacing(value: unknown): CoverFlowSpacing {
  if (value === "tight" || value === "wide") {
    return value;
  }
  return "regular";
}

function normalizeWheelSensitivity(value: unknown): WheelSensitivity {
  if (value === "low" || value === "high") {
    return value;
  }
  return "medium";
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeBoundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const rounded = Math.round(value * 100) / 100;
  return Math.min(max, Math.max(min, rounded));
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

function normalizeFrameRegion(value: unknown): FrameRegionConfig {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const mode = raw.mode === "image" || raw.mode === "html" ? raw.mode : "none";
  const rawAssetPath = typeof raw.assetPath === "string" ? raw.assetPath : "";
  const assetPath = rawAssetPath.length > 0 && isSafeBoxAssetPath(rawAssetPath) ? rawAssetPath : undefined;
  const html = typeof raw.html === "string" && raw.html.trim().length > 0
    ? raw.html
    : undefined;

  if (mode === "image") {
    return assetPath ? { mode: "image", assetPath } : { mode: "image" };
  }

  if (mode === "html") {
    return html ? { mode: "html", html } : { mode: "html", html: typeof raw.html === "string" ? raw.html : "" };
  }

  return {
    mode: "none",
  };
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
      coverSize: defaultLayoutConfig.props.coverSize,
      sideAngleDeg: defaultLayoutConfig.props.sideAngleDeg,
      centerScale: defaultLayoutConfig.props.centerScale,
      spacing: defaultLayoutConfig.props.spacing,
      showReflection: defaultLayoutConfig.props.showReflection,
      wheelSensitivity: defaultLayoutConfig.props.wheelSensitivity,
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
      coverSize: normalizeCoverSize(props.coverSize),
      sideAngleDeg: normalizeBoundedNumber(
        props.sideAngleDeg,
        defaultLayoutConfig.props.sideAngleDeg,
        SIDE_ANGLE_MIN,
        SIDE_ANGLE_MAX,
      ),
      centerScale: normalizeBoundedNumber(
        props.centerScale,
        defaultLayoutConfig.props.centerScale,
        CENTER_SCALE_MIN,
        CENTER_SCALE_MAX,
      ),
      spacing: normalizeSpacing(props.spacing),
      showReflection: normalizeBoolean(props.showReflection, defaultLayoutConfig.props.showReflection),
      wheelSensitivity: normalizeWheelSensitivity(props.wheelSensitivity),
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
  if (!["compact", "regular", "large"].includes(config.props.coverSize)) {
    errors["props.coverSize"] = "coverSize is invalid.";
  }
  if (
    !Number.isFinite(config.props.sideAngleDeg)
    || config.props.sideAngleDeg < SIDE_ANGLE_MIN
    || config.props.sideAngleDeg > SIDE_ANGLE_MAX
  ) {
    errors["props.sideAngleDeg"] = `sideAngleDeg must be between ${SIDE_ANGLE_MIN} and ${SIDE_ANGLE_MAX}.`;
  }
  if (
    !Number.isFinite(config.props.centerScale)
    || config.props.centerScale < CENTER_SCALE_MIN
    || config.props.centerScale > CENTER_SCALE_MAX
  ) {
    errors["props.centerScale"] = `centerScale must be between ${CENTER_SCALE_MIN} and ${CENTER_SCALE_MAX}.`;
  }
  if (!["tight", "regular", "wide"].includes(config.props.spacing)) {
    errors["props.spacing"] = "spacing is invalid.";
  }
  if (typeof config.props.showReflection !== "boolean") {
    errors["props.showReflection"] = "showReflection must be a boolean.";
  }
  if (!["low", "medium", "high"].includes(config.props.wheelSensitivity)) {
    errors["props.wheelSensitivity"] = "wheelSensitivity is invalid.";
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

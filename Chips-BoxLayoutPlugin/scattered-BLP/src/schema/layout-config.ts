export type SortMode = "manual" | "name" | "random";
export type CardSize = "compact" | "regular" | "large";
export type SpreadMode = "calm" | "loose" | "wild";
export type MotionMode = "auto" | "reduced";

export interface FrameRegionConfig {
  mode: "none" | "image" | "html";
  assetPath?: string;
  html?: string;
}

export interface LayoutConfig {
  schemaVersion: string;
  props: {
    sortMode: SortMode;
    randomSeed: string;
    visibleFakeCount: number;
    cycleIntervalMs: number;
    cardSize: CardSize;
    spread: SpreadMode;
    motion: MotionMode;
    background: FrameRegionConfig;
    topRegion: FrameRegionConfig;
  };
  assetRefs: string[];
}

export const VISIBLE_FAKE_COUNT_MIN = 0;
export const VISIBLE_FAKE_COUNT_MAX = 18;
export const CYCLE_INTERVAL_MS_MIN = 3000;
export const CYCLE_INTERVAL_MS_MAX = 60000;

export const defaultLayoutConfig: LayoutConfig = {
  schemaVersion: "1.0.0",
  props: {
    sortMode: "manual",
    randomSeed: "scattered",
    visibleFakeCount: 9,
    cycleIntervalMs: 8000,
    cardSize: "regular",
    spread: "loose",
    motion: "auto",
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
  if (value === "name" || value === "random") {
    return value;
  }
  return "manual";
}

function normalizeCardSize(value: unknown): CardSize {
  if (value === "compact" || value === "large") {
    return value;
  }
  return "regular";
}

function normalizeSpread(value: unknown): SpreadMode {
  if (value === "calm" || value === "wild") {
    return value;
  }
  return "loose";
}

function normalizeMotion(value: unknown): MotionMode {
  return value === "reduced" ? "reduced" : "auto";
}

function normalizeRandomSeed(value: unknown): string {
  if (typeof value !== "string") {
    return defaultLayoutConfig.props.randomSeed;
  }
  const normalized = value.trim().replace(/\s+/g, "-").slice(0, 64);
  return normalized.length > 0 ? normalized : defaultLayoutConfig.props.randomSeed;
}

function normalizeInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
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
      randomSeed: defaultLayoutConfig.props.randomSeed,
      visibleFakeCount: defaultLayoutConfig.props.visibleFakeCount,
      cycleIntervalMs: defaultLayoutConfig.props.cycleIntervalMs,
      cardSize: defaultLayoutConfig.props.cardSize,
      spread: defaultLayoutConfig.props.spread,
      motion: defaultLayoutConfig.props.motion,
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
      randomSeed: normalizeRandomSeed(props.randomSeed),
      visibleFakeCount: normalizeInteger(
        props.visibleFakeCount,
        defaultLayoutConfig.props.visibleFakeCount,
        VISIBLE_FAKE_COUNT_MIN,
        VISIBLE_FAKE_COUNT_MAX,
      ),
      cycleIntervalMs: normalizeInteger(
        props.cycleIntervalMs,
        defaultLayoutConfig.props.cycleIntervalMs,
        CYCLE_INTERVAL_MS_MIN,
        CYCLE_INTERVAL_MS_MAX,
      ),
      cardSize: normalizeCardSize(props.cardSize),
      spread: normalizeSpread(props.spread),
      motion: normalizeMotion(props.motion),
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

  if (!["manual", "name", "random"].includes(config.props.sortMode)) {
    errors["props.sortMode"] = "sortMode is invalid.";
  }
  if (!Number.isInteger(config.props.visibleFakeCount)
    || config.props.visibleFakeCount < VISIBLE_FAKE_COUNT_MIN
    || config.props.visibleFakeCount > VISIBLE_FAKE_COUNT_MAX) {
    errors["props.visibleFakeCount"] = "visibleFakeCount must be an integer between 0 and 18.";
  }
  if (!Number.isInteger(config.props.cycleIntervalMs)
    || config.props.cycleIntervalMs < CYCLE_INTERVAL_MS_MIN
    || config.props.cycleIntervalMs > CYCLE_INTERVAL_MS_MAX) {
    errors["props.cycleIntervalMs"] = "cycleIntervalMs must be an integer between 3000 and 60000.";
  }
  if (!["compact", "regular", "large"].includes(config.props.cardSize)) {
    errors["props.cardSize"] = "cardSize is invalid.";
  }
  if (!["calm", "loose", "wild"].includes(config.props.spread)) {
    errors["props.spread"] = "spread is invalid.";
  }
  if (!["auto", "reduced"].includes(config.props.motion)) {
    errors["props.motion"] = "motion is invalid.";
  }
  if (typeof config.props.randomSeed !== "string" || config.props.randomSeed.trim().length === 0) {
    errors["props.randomSeed"] = "randomSeed is required.";
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

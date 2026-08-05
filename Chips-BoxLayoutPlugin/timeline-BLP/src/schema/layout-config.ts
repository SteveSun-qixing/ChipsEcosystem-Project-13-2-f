export type TimelineOrientation = "horizontal" | "vertical";
export type TimelineScaleMode = "equal-points" | "date-distance";
export type TimelineCardDensity = "compact" | "comfortable" | "spacious";

export interface TimelinePointConfig {
  id: string;
  label: string;
  date?: string;
  entryIds: string[];
  note?: string;
}

export interface FrameRegionConfig {
  mode: "none" | "image" | "html";
  assetPath?: string;
  html?: string;
}

export interface LayoutConfig {
  schemaVersion: string;
  props: {
    orientation: TimelineOrientation;
    scaleMode: TimelineScaleMode;
    showCovers: boolean;
    cardDensity: TimelineCardDensity;
    points: TimelinePointConfig[];
    background: FrameRegionConfig;
    topRegion: FrameRegionConfig;
  };
  assetRefs: string[];
}

export const defaultLayoutConfig: LayoutConfig = {
  schemaVersion: "1.0.0",
  props: {
    orientation: "vertical",
    scaleMode: "equal-points",
    showCovers: true,
    cardDensity: "comfortable",
    points: [],
    background: {
      mode: "none",
    },
    topRegion: {
      mode: "none",
    },
  },
  assetRefs: [],
};

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

function normalizeOrientation(value: unknown): TimelineOrientation {
  return value === "horizontal" ? "horizontal" : "vertical";
}

function normalizeScaleMode(value: unknown): TimelineScaleMode {
  return value === "date-distance" ? "date-distance" : "equal-points";
}

function normalizeCardDensity(value: unknown): TimelineCardDensity {
  if (value === "compact" || value === "spacious") {
    return value;
  }
  return "comfortable";
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
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
    return {
      mode: "html",
      html: html ?? (typeof raw.html === "string" ? raw.html : ""),
    };
  }

  return {
    mode: "none",
  };
}

function normalizePointId(value: unknown, index: number, usedIds: Set<string>): string {
  const rawId = typeof value === "string" ? value.trim() : "";
  const baseId = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(rawId)
    ? rawId
    : `point-${index + 1}`;
  let candidate = baseId;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function normalizePointDate(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEntryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entryIds = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return [...new Set(entryIds)];
}

function normalizeTimelinePoints(value: unknown): TimelinePointConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const usedIds = new Set<string>();
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((point, index) => {
      const label = typeof point.label === "string" && point.label.trim().length > 0
        ? point.label.trim()
        : `Point ${index + 1}`;
      const date = normalizePointDate(point.date);
      const note = typeof point.note === "string" && point.note.trim().length > 0
        ? point.note.trim()
        : undefined;

      return {
        id: normalizePointId(point.id, index, usedIds),
        label,
        ...(date ? { date } : {}),
        entryIds: normalizeEntryIds(point.entryIds),
        ...(note ? { note } : {}),
      };
    });
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
      orientation: defaultLayoutConfig.props.orientation,
      scaleMode: defaultLayoutConfig.props.scaleMode,
      showCovers: defaultLayoutConfig.props.showCovers,
      cardDensity: defaultLayoutConfig.props.cardDensity,
      points: [],
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
      orientation: normalizeOrientation(props.orientation),
      scaleMode: normalizeScaleMode(props.scaleMode),
      showCovers: normalizeBoolean(props.showCovers, defaultLayoutConfig.props.showCovers),
      cardDensity: normalizeCardDensity(props.cardDensity),
      points: normalizeTimelinePoints(props.points),
      background: normalizeFrameRegion(props.background),
      topRegion: normalizeFrameRegion(props.topRegion),
    },
    assetRefs: Array.isArray(input?.assetRefs)
      ? input.assetRefs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
  });
}

function validateFrameRegion(
  errors: Record<string, string>,
  key: "background" | "topRegion",
  region: FrameRegionConfig
): void {
  const assetPath = region.assetPath;
  if (region.mode === "image") {
    if (!assetPath) {
      errors[`props.${key}.assetPath`] = `${key} assetPath is required when mode is image.`;
    } else if (!isSafeBoxAssetPath(assetPath)) {
      errors[`props.${key}.assetPath`] = `${key} assetPath must be a box assets/ relative path.`;
    }
  }
  if (region.mode === "html" && !region.html) {
    errors[`props.${key}.html`] = `${key} html is required when mode is html.`;
  }
}

export function validateLayoutConfig(config: LayoutConfig): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!["horizontal", "vertical"].includes(config.props.orientation)) {
    errors["props.orientation"] = "orientation is invalid.";
  }
  if (!["equal-points", "date-distance"].includes(config.props.scaleMode)) {
    errors["props.scaleMode"] = "scaleMode is invalid.";
  }
  if (typeof config.props.showCovers !== "boolean") {
    errors["props.showCovers"] = "showCovers must be boolean.";
  }
  if (!["compact", "comfortable", "spacious"].includes(config.props.cardDensity)) {
    errors["props.cardDensity"] = "cardDensity is invalid.";
  }

  const seenPointIds = new Set<string>();
  config.props.points.forEach((point, index) => {
    if (!point.id) {
      errors[`props.points[${index}].id`] = "point id is required.";
    }
    if (seenPointIds.has(point.id)) {
      errors[`props.points[${index}].id`] = "point id must be unique.";
    }
    seenPointIds.add(point.id);
    if (!point.label) {
      errors[`props.points[${index}].label`] = "point label is required.";
    }
    if (!Array.isArray(point.entryIds)) {
      errors[`props.points[${index}].entryIds`] = "point entryIds must be an array.";
    }
  });

  validateFrameRegion(errors, "background", config.props.background);
  validateFrameRegion(errors, "topRegion", config.props.topRegion);

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

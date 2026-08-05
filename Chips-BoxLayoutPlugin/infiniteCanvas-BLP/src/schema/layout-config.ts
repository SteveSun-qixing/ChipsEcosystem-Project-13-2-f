export type DisplayMode = "point" | "cover" | "mixed";
export type ItemDisplayMode = "point" | "cover";

export interface DefaultViewConfig {
  x: number;
  y: number;
  zoom: number;
}

export interface BackgroundConfig {
  mode: "none" | "image";
  assetPath?: string;
  width?: number;
  height?: number;
  opacity?: number;
}

export interface CanvasItemConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  mode?: ItemDisplayMode;
  labelOverride?: string;
}

export interface LayoutConfig {
  schemaVersion: string;
  props: {
    defaultView: DefaultViewConfig;
    displayMode: DisplayMode;
    gridVisible: boolean;
    snapToGrid: boolean;
    background: BackgroundConfig;
    items: Record<string, CanvasItemConfig>;
  };
  assetRefs: string[];
}

export const BACKGROUND_ASSET_PREFIX = "assets/layouts/infinitecanvas/background/";
export const GRID_SIZE = 32;

const MIN_COORD = -100000;
const MAX_COORD = 100000;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const MIN_ITEM_WIDTH = 96;
const MAX_ITEM_WIDTH = 520;
const MIN_ITEM_HEIGHT = 72;
const MAX_ITEM_HEIGHT = 420;
const MAX_BACKGROUND_SIZE = 100000;

export const defaultLayoutConfig: LayoutConfig = {
  schemaVersion: "1.0.0",
  props: {
    defaultView: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    displayMode: "mixed",
    gridVisible: true,
    snapToGrid: true,
    background: {
      mode: "none",
      opacity: 1,
    },
    items: {},
  },
  assetRefs: [],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeFiniteNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return clamp(value, min, max);
}

function normalizeOptionalFiniteNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return clamp(value, min, max);
}

function normalizeDisplayMode(value: unknown): DisplayMode {
  if (value === "point" || value === "cover") {
    return value;
  }
  return "mixed";
}

function normalizeItemDisplayMode(value: unknown): ItemDisplayMode | undefined {
  if (value === "point" || value === "cover") {
    return value;
  }
  return undefined;
}

export function isSafeBoxAssetPath(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed !== value || !trimmed.startsWith("assets/")) {
    return false;
  }
  if (
    trimmed.startsWith("/")
    || trimmed.includes("\\")
    || trimmed.includes("?")
    || trimmed.includes("#")
    || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  ) {
    return false;
  }
  return trimmed.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

export function isSafeBackgroundAssetPath(value: string): boolean {
  return isSafeBoxAssetPath(value) && value.startsWith(BACKGROUND_ASSET_PREFIX);
}

function normalizeDefaultView(value: unknown): DefaultViewConfig {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  return {
    x: normalizeFiniteNumber(raw.x, defaultLayoutConfig.props.defaultView.x, MIN_COORD, MAX_COORD),
    y: normalizeFiniteNumber(raw.y, defaultLayoutConfig.props.defaultView.y, MIN_COORD, MAX_COORD),
    zoom: normalizeFiniteNumber(raw.zoom, defaultLayoutConfig.props.defaultView.zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

function normalizeBackground(value: unknown): BackgroundConfig {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const mode = raw.mode === "image" ? "image" : "none";
  const rawAssetPath = typeof raw.assetPath === "string" ? raw.assetPath : "";
  const assetPath = rawAssetPath.length > 0 && isSafeBackgroundAssetPath(rawAssetPath)
    ? rawAssetPath
    : undefined;
  const opacity = normalizeFiniteNumber(raw.opacity, 1, 0, 1);
  const width = normalizeOptionalFiniteNumber(raw.width, 1, MAX_BACKGROUND_SIZE);
  const height = normalizeOptionalFiniteNumber(raw.height, 1, MAX_BACKGROUND_SIZE);

  if (mode === "image") {
    return {
      mode: "image",
      ...(assetPath ? { assetPath } : {}),
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      opacity,
    };
  }

  return {
    mode: "none",
    opacity,
  };
}

function normalizeCanvasItem(value: unknown): CanvasItemConfig | undefined {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const x = normalizeOptionalFiniteNumber(raw.x, MIN_COORD, MAX_COORD);
  const y = normalizeOptionalFiniteNumber(raw.y, MIN_COORD, MAX_COORD);
  if (typeof x !== "number" || typeof y !== "number") {
    return undefined;
  }

  const width = normalizeOptionalFiniteNumber(raw.width, MIN_ITEM_WIDTH, MAX_ITEM_WIDTH);
  const height = normalizeOptionalFiniteNumber(raw.height, MIN_ITEM_HEIGHT, MAX_ITEM_HEIGHT);
  const mode = normalizeItemDisplayMode(raw.mode);
  const labelOverride = typeof raw.labelOverride === "string" && raw.labelOverride.trim().length > 0
    ? raw.labelOverride.trim().slice(0, 120)
    : undefined;

  return {
    x,
    y,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(mode ? { mode } : {}),
    ...(labelOverride ? { labelOverride } : {}),
  };
}

function normalizeItems(value: unknown): Record<string, CanvasItemConfig> {
  const rawItems = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const items: Record<string, CanvasItemConfig> = {};

  Object.entries(rawItems).forEach(([entryId, itemValue]) => {
    if (entryId.trim().length === 0) {
      return;
    }
    const item = normalizeCanvasItem(itemValue);
    if (item) {
      items[entryId] = item;
    }
  });

  return items;
}

function syncAssetRefs(config: LayoutConfig): LayoutConfig {
  const assetRefs = config.props.background.mode === "image" && config.props.background.assetPath
    ? [config.props.background.assetPath]
    : [];
  return {
    ...config,
    assetRefs,
  };
}

export function createDefaultLayoutConfig(): LayoutConfig {
  return {
    schemaVersion: defaultLayoutConfig.schemaVersion,
    props: {
      defaultView: { ...defaultLayoutConfig.props.defaultView },
      displayMode: defaultLayoutConfig.props.displayMode,
      gridVisible: defaultLayoutConfig.props.gridVisible,
      snapToGrid: defaultLayoutConfig.props.snapToGrid,
      background: { ...defaultLayoutConfig.props.background },
      items: {},
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
      defaultView: normalizeDefaultView(props.defaultView),
      displayMode: normalizeDisplayMode(props.displayMode),
      gridVisible: typeof props.gridVisible === "boolean" ? props.gridVisible : defaultLayoutConfig.props.gridVisible,
      snapToGrid: typeof props.snapToGrid === "boolean" ? props.snapToGrid : defaultLayoutConfig.props.snapToGrid,
      background: normalizeBackground(props.background),
      items: normalizeItems(props.items),
    },
    assetRefs: Array.isArray(input?.assetRefs)
      ? input.assetRefs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
  });
}

export function snapCoordinate(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function validateLayoutConfig(config: LayoutConfig): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const { defaultView, displayMode, background, items } = config.props;

  if (!Number.isFinite(defaultView.x)) {
    errors["props.defaultView.x"] = "defaultView.x must be a finite number.";
  }
  if (!Number.isFinite(defaultView.y)) {
    errors["props.defaultView.y"] = "defaultView.y must be a finite number.";
  }
  if (!Number.isFinite(defaultView.zoom) || defaultView.zoom < MIN_ZOOM || defaultView.zoom > MAX_ZOOM) {
    errors["props.defaultView.zoom"] = "defaultView.zoom must be between 0.25 and 4.";
  }
  if (!["point", "cover", "mixed"].includes(displayMode)) {
    errors["props.displayMode"] = "displayMode is invalid.";
  }
  if (background.mode === "image") {
    if (!background.assetPath) {
      errors["props.background.assetPath"] = "background assetPath is required when mode is image.";
    } else if (!isSafeBackgroundAssetPath(background.assetPath)) {
      errors["props.background.assetPath"] = "background assetPath must be under assets/layouts/infinitecanvas/background/.";
    }
  }
  if (typeof background.opacity === "number" && (!Number.isFinite(background.opacity) || background.opacity < 0 || background.opacity > 1)) {
    errors["props.background.opacity"] = "background opacity must be between 0 and 1.";
  }

  Object.entries(items).forEach(([entryId, item]) => {
    if (!Number.isFinite(item.x)) {
      errors[`props.items.${entryId}.x`] = "item x must be a finite number.";
    }
    if (!Number.isFinite(item.y)) {
      errors[`props.items.${entryId}.y`] = "item y must be a finite number.";
    }
    if (item.mode && !["point", "cover"].includes(item.mode)) {
      errors[`props.items.${entryId}.mode`] = "item mode is invalid.";
    }
  });

  config.assetRefs.forEach((assetPath, index) => {
    if (!isSafeBackgroundAssetPath(assetPath)) {
      errors[`assetRefs[${index}]`] = "assetRefs item must be an infinite canvas background assets/ path.";
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
  const props = typeof input?.props === "object" && input?.props ? input.props as Record<string, unknown> : {};
  const rawBackground = typeof props.background === "object" && props.background ? props.background as Record<string, unknown> : {};

  if (rawBackground.mode === "image") {
    const rawAssetPath = rawBackground.assetPath;
    if (typeof rawAssetPath !== "string" || !isSafeBackgroundAssetPath(rawAssetPath)) {
      errors["props.background.assetPath"] = "background assetPath must be under assets/layouts/infinitecanvas/background/.";
    }
  }

  if (Array.isArray(input?.assetRefs)) {
    input.assetRefs.forEach((assetRef, index) => {
      if (typeof assetRef !== "string" || !isSafeBackgroundAssetPath(assetRef)) {
        errors[`assetRefs[${index}]`] = "assetRefs item must be an infinite canvas background assets/ path.";
      }
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

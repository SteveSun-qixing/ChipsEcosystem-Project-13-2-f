export type MapSourceMode = "image" | "host-map";
export type MapProjection = "linear-bounds" | "web-mercator";
export type MarkerStyle = "dot-title" | "pin-title";

export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface MapEntryLocation extends GeoPoint {
  labelOverride?: string;
}

export interface MapSourceConfig {
  mode: MapSourceMode;
  projection: MapProjection;
  assetPath?: string;
  bounds: GeoBounds;
}

export interface FrameRegionConfig {
  mode: "none" | "image" | "html";
  assetPath?: string;
  html?: string;
}

export interface LayoutConfig {
  schemaVersion: string;
  props: {
    mapSource: MapSourceConfig;
    defaultView: GeoPoint & {
      zoom: number;
    };
    markerStyle: MarkerStyle;
    showCoverOnSelect: boolean;
    entries: Record<string, MapEntryLocation>;
    topRegion: FrameRegionConfig;
  };
  assetRefs: string[];
}

export const DEFAULT_BOUNDS: GeoBounds = {
  west: -180,
  south: -85,
  east: 180,
  north: 85,
};

export const defaultLayoutConfig: LayoutConfig = {
  schemaVersion: "1.0.0",
  props: {
    mapSource: {
      mode: "image",
      projection: "linear-bounds",
      bounds: { ...DEFAULT_BOUNDS },
    },
    defaultView: {
      latitude: 0,
      longitude: 0,
      zoom: 1,
    },
    markerStyle: "dot-title",
    showCoverOnSelect: true,
    entries: {},
    topRegion: {
      mode: "none",
    },
  },
  assetRefs: [],
};

const BOX_ASSET_PATH_PATTERN = /^assets\/[^\\:?#/]+(?:\/[^\\:?#/]+)*$/;
const ENTRY_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

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

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidBounds(bounds: GeoBounds): boolean {
  return (
    isValidLongitude(bounds.west) &&
    isValidLongitude(bounds.east) &&
    isValidLatitude(bounds.south) &&
    isValidLatitude(bounds.north) &&
    bounds.west < bounds.east &&
    bounds.south < bounds.north
  );
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toBoundedZoom(value: unknown, fallback: number): number {
  const parsed = toFiniteNumber(value, fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parsed));
}

function normalizeMarkerStyle(value: unknown): MarkerStyle {
  return value === "pin-title" ? "pin-title" : "dot-title";
}

function normalizeMapSourceMode(value: unknown): MapSourceMode {
  return value === "host-map" ? "host-map" : "image";
}

function normalizeProjection(mode: MapSourceMode, value: unknown): MapProjection {
  if (mode === "host-map" && value === "web-mercator") {
    return "web-mercator";
  }
  return "linear-bounds";
}

function normalizeBounds(value: unknown): GeoBounds {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  return {
    west: toFiniteNumber(raw.west, DEFAULT_BOUNDS.west),
    south: toFiniteNumber(raw.south, DEFAULT_BOUNDS.south),
    east: toFiniteNumber(raw.east, DEFAULT_BOUNDS.east),
    north: toFiniteNumber(raw.north, DEFAULT_BOUNDS.north),
  };
}

function normalizeDefaultView(value: unknown): LayoutConfig["props"]["defaultView"] {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  return {
    latitude: toFiniteNumber(raw.latitude, defaultLayoutConfig.props.defaultView.latitude),
    longitude: toFiniteNumber(raw.longitude, defaultLayoutConfig.props.defaultView.longitude),
    zoom: toBoundedZoom(raw.zoom, defaultLayoutConfig.props.defaultView.zoom),
  };
}

function normalizeMapSource(value: unknown): MapSourceConfig {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const mode = normalizeMapSourceMode(raw.mode);
  const rawAssetPath = typeof raw.assetPath === "string" ? raw.assetPath : "";
  const assetPath = rawAssetPath.length > 0 && isSafeBoxAssetPath(rawAssetPath) ? rawAssetPath : undefined;

  return {
    mode,
    projection: normalizeProjection(mode, raw.projection),
    ...(mode === "image" && assetPath ? { assetPath } : {}),
    bounds: normalizeBounds(raw.bounds),
  };
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
    return { mode: "html", html: html ?? (typeof raw.html === "string" ? raw.html : "") };
  }
  return { mode: "none" };
}

function normalizeEntryLocations(value: unknown): Record<string, MapEntryLocation> {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const entries: Record<string, MapEntryLocation> = {};

  for (const [entryId, rawLocation] of Object.entries(raw)) {
    if (!ENTRY_ID_PATTERN.test(entryId)) {
      continue;
    }
    const location = typeof rawLocation === "object" && rawLocation
      ? rawLocation as Record<string, unknown>
      : {};
    const latitude = toFiniteNumber(location.latitude, Number.NaN);
    const longitude = toFiniteNumber(location.longitude, Number.NaN);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }
    const labelOverride = typeof location.labelOverride === "string"
      ? location.labelOverride.trim()
      : "";
    entries[entryId] = {
      latitude,
      longitude,
      ...(labelOverride.length > 0 ? { labelOverride: labelOverride.slice(0, 120) } : {}),
    };
  }

  return entries;
}

function collectAssetRefs(config: LayoutConfig): string[] {
  const refs = [
    config.props.mapSource.mode === "image" ? config.props.mapSource.assetPath : undefined,
    config.props.topRegion.mode === "image" ? config.props.topRegion.assetPath : undefined,
  ].filter((value): value is string =>
    typeof value === "string" && value.length > 0 && isSafeBoxAssetPath(value)
  );

  return [...new Set(refs)];
}

function syncAssetRefs(config: LayoutConfig): LayoutConfig {
  return {
    ...config,
    assetRefs: collectAssetRefs(config),
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

export function hasCustomMapImage(mapSource: MapSourceConfig): boolean {
  return mapSource.mode === "image" && typeof mapSource.assetPath === "string" && mapSource.assetPath.length > 0;
}

export function createDefaultLayoutConfig(): LayoutConfig {
  return {
    schemaVersion: defaultLayoutConfig.schemaVersion,
    props: {
      mapSource: {
        ...defaultLayoutConfig.props.mapSource,
        bounds: { ...defaultLayoutConfig.props.mapSource.bounds },
      },
      defaultView: { ...defaultLayoutConfig.props.defaultView },
      markerStyle: defaultLayoutConfig.props.markerStyle,
      showCoverOnSelect: defaultLayoutConfig.props.showCoverOnSelect,
      entries: {},
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
      mapSource: normalizeMapSource(props.mapSource),
      defaultView: normalizeDefaultView(props.defaultView),
      markerStyle: normalizeMarkerStyle(props.markerStyle),
      showCoverOnSelect: typeof props.showCoverOnSelect === "boolean"
        ? props.showCoverOnSelect
        : defaultLayoutConfig.props.showCoverOnSelect,
      entries: normalizeEntryLocations(props.entries),
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
  const { mapSource, defaultView, entries, topRegion } = config.props;

  if (mapSource.mode !== "image" && mapSource.mode !== "host-map") {
    errors["props.mapSource.mode"] = "mapSource mode is invalid.";
  }
  if (mapSource.mode === "image" && mapSource.projection !== "linear-bounds") {
    errors["props.mapSource.projection"] = "image mapSource requires linear-bounds projection.";
  }
  if (mapSource.mode === "host-map" && mapSource.projection !== "linear-bounds" && mapSource.projection !== "web-mercator") {
    errors["props.mapSource.projection"] = "host-map projection is invalid.";
  }
  if (mapSource.assetPath && !isSafeBoxAssetPath(mapSource.assetPath)) {
    errors["props.mapSource.assetPath"] = "mapSource assetPath must be a box assets/ relative path.";
  }
  if (!isValidBounds(mapSource.bounds)) {
    errors["props.mapSource.bounds"] = "mapSource bounds must be valid west/south/east/north coordinates.";
  }
  if (!isValidLatitude(defaultView.latitude)) {
    errors["props.defaultView.latitude"] = "defaultView latitude must be between -90 and 90.";
  }
  if (!isValidLongitude(defaultView.longitude)) {
    errors["props.defaultView.longitude"] = "defaultView longitude must be between -180 and 180.";
  }
  if (!Number.isFinite(defaultView.zoom) || defaultView.zoom < MIN_ZOOM || defaultView.zoom > MAX_ZOOM) {
    errors["props.defaultView.zoom"] = "defaultView zoom is out of range.";
  }
  if (config.props.markerStyle !== "dot-title" && config.props.markerStyle !== "pin-title") {
    errors["props.markerStyle"] = "markerStyle is invalid.";
  }

  for (const [entryId, location] of Object.entries(entries)) {
    if (!ENTRY_ID_PATTERN.test(entryId)) {
      errors[`props.entries.${entryId}`] = "entryId is invalid.";
    }
    if (!isValidLatitude(location.latitude)) {
      errors[`props.entries.${entryId}.latitude`] = "entry latitude must be between -90 and 90.";
    }
    if (!isValidLongitude(location.longitude)) {
      errors[`props.entries.${entryId}.longitude`] = "entry longitude must be between -180 and 180.";
    }
  }

  if (topRegion.mode === "image") {
    if (!topRegion.assetPath) {
      errors["props.topRegion.assetPath"] = "topRegion assetPath is required when mode is image.";
    } else if (!isSafeBoxAssetPath(topRegion.assetPath)) {
      errors["props.topRegion.assetPath"] = "topRegion assetPath must be a box assets/ relative path.";
    }
  }
  if (topRegion.mode === "html" && !topRegion.html) {
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

  const props = typeof input?.props === "object" && input?.props ? input.props as Record<string, unknown> : {};
  const rawMapSource = typeof props.mapSource === "object" && props.mapSource ? props.mapSource as Record<string, unknown> : {};
  if (typeof rawMapSource.assetPath === "string" && rawMapSource.assetPath.length > 0 && !isSafeBoxAssetPath(rawMapSource.assetPath)) {
    errors["props.mapSource.assetPath"] = "mapSource assetPath must be a box assets/ relative path.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

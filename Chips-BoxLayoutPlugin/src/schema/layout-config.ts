export type InformationDensity = "compact" | "comfortable" | "expanded";

export interface LayoutConfig {
  schemaVersion: string;
  props: {
    columnCount: number;
    gap: number;
    coverRatio: number;
    informationDensity: InformationDensity;
  };
  assetRefs: string[];
}

export const defaultLayoutConfig: LayoutConfig = {
  schemaVersion: "1.0.0",
  props: {
    columnCount: 4,
    gap: 16,
    coverRatio: 1.4,
    informationDensity: "comfortable",
  },
  assetRefs: [],
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeInformationDensity(value: unknown): InformationDensity {
  if (value === "compact" || value === "expanded") {
    return value;
  }
  return "comfortable";
}

export function createDefaultLayoutConfig(): LayoutConfig {
  return {
    schemaVersion: defaultLayoutConfig.schemaVersion,
    props: {
      ...defaultLayoutConfig.props,
    },
    assetRefs: [...defaultLayoutConfig.assetRefs],
  };
}

export function normalizeLayoutConfig(input: Record<string, unknown> | undefined): LayoutConfig {
  const props = typeof input?.props === "object" && input?.props ? input.props as Record<string, unknown> : {};
  const assetRefs = Array.isArray(input?.assetRefs)
    ? input!.assetRefs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  return {
    schemaVersion:
      typeof input?.schemaVersion === "string" && input.schemaVersion.trim().length > 0
        ? input.schemaVersion
        : defaultLayoutConfig.schemaVersion,
    props: {
      columnCount: Math.round(
        clampNumber(props.columnCount, 1, 12, defaultLayoutConfig.props.columnCount)
      ),
      gap: Math.round(clampNumber(props.gap, 0, 64, defaultLayoutConfig.props.gap)),
      coverRatio: clampNumber(props.coverRatio, 0.5, 3, defaultLayoutConfig.props.coverRatio),
      informationDensity: normalizeInformationDensity(props.informationDensity),
    },
    assetRefs,
  };
}

export function validateLayoutConfig(config: LayoutConfig): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!Number.isInteger(config.props.columnCount) || config.props.columnCount < 1 || config.props.columnCount > 12) {
    errors["props.columnCount"] = "columnCount must be an integer between 1 and 12.";
  }
  if (!Number.isInteger(config.props.gap) || config.props.gap < 0 || config.props.gap > 64) {
    errors["props.gap"] = "gap must be an integer between 0 and 64.";
  }
  if (config.props.coverRatio < 0.5 || config.props.coverRatio > 3) {
    errors["props.coverRatio"] = "coverRatio must be between 0.5 and 3.";
  }
  if (!["compact", "comfortable", "expanded"].includes(config.props.informationDensity)) {
    errors["props.informationDensity"] = "informationDensity is invalid.";
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

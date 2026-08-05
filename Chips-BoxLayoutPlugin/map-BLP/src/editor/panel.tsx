import React from "react";
import {
  ChipsButton,
  ChipsErrorState,
  ChipsForm,
  ChipsSelect,
  ChipsStack,
  ChipsText,
  type StandardErrorLike,
} from "@chips/component-library";
import { FrameRegionEditor } from "./frame-region-editor";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import {
  isSafeBoxAssetPath,
  normalizeLayoutConfig,
  validateLayoutConfig,
  type FrameRegionConfig,
  type GeoBounds,
  type LayoutConfig,
  type MapSourceConfig,
  type MarkerStyle,
} from "../schema/layout-config";
import { getLayoutMessage } from "../shared/i18n";

export interface LayoutEditorPanelProps {
  entries: BoxEntrySnapshot[];
  config: LayoutConfig;
  locale?: string;
  readBoxAsset?(assetPath: string): Promise<ResolvedRuntimeResource>;
  importBoxAsset?(input: { file: File; preferredPath?: string }): Promise<{ assetPath: string }>;
  deleteBoxAsset?(assetPath: string): Promise<void>;
  onChange(next: LayoutConfig): void;
}

type LayoutMessageKey = Parameters<typeof getLayoutMessage>[1];

const StableSelect = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof ChipsSelect>>((props, ref) => (
  <ChipsSelect
    {...props}
    ref={ref}
    iconContent={<span aria-hidden="true">{"\u25be"}</span>}
  />
));
StableSelect.displayName = "StableSelect";

const EDITOR_STYLE_TEXT = `
.chips-map-layout-editor {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  color: var(--chips-sys-color-on-surface);
  background: var(--chips-sys-color-surface);
  font: var(--chips-comp-text-root-font, inherit);
}

.chips-map-layout-editor,
.chips-map-layout-editor * {
  box-sizing: border-box;
}

.chips-map-layout-editor__form {
  width: 100%;
  min-width: 0;
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
}

.chips-map-layout-editor [data-scope="form"][data-part="section"],
.chips-map-layout-editor [data-scope="form"][data-part="field"],
.chips-map-layout-editor__field-grid,
.chips-map-layout-editor__entry-list,
.chips-map-layout-editor__entry-row {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

.chips-map-layout-editor__field-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chips-map-layout-editor__entry-row {
  grid-template-columns: minmax(120px, 1fr) minmax(80px, 110px) minmax(80px, 110px);
  align-items: end;
  padding-block: var(--chips-base-space-2);
  border-block-end: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
}

.chips-map-layout-editor__entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  grid-column: 1 / -1;
}

.chips-map-layout-editor input,
.chips-map-layout-editor select {
  min-width: 0;
  width: 100%;
  min-height: 36px;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-input-root-radius, var(--chips-base-radius-sm));
  padding-inline: var(--chips-base-space-2);
  color: var(--chips-sys-color-on-surface);
  background: var(--chips-comp-input-root-surface, var(--chips-sys-color-surface));
  font: inherit;
}

.chips-map-layout-editor input[type="checkbox"] {
  width: auto;
  min-height: auto;
}

.chips-map-layout-editor__asset-path,
.chips-map-layout-editor__error,
.chips-map-layout-editor__hint {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

.chips-map-layout-editor__error {
  color: var(--chips-sys-color-error, #b91c1c);
}

.chips-map-layout-editor__map-preview {
  min-height: 150px;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background:
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--chips-sys-color-outline, #64748b) 16%, transparent) 0 1px, transparent 1px 18px),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--chips-sys-color-outline, #64748b) 16%, transparent) 0 1px, transparent 1px 18px),
    var(--chips-sys-color-surface-container-low, #f8fafc);
}

.chips-map-layout-editor__map-preview img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 150px;
  object-fit: cover;
}

@media (max-width: 520px) {
  .chips-map-layout-editor__field-grid,
  .chips-map-layout-editor__entry-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;

function formatMessage(locale: string | undefined, key: LayoutMessageKey, params?: Record<string, string | number>): string {
  const message = getLayoutMessage(locale, key);
  if (!params) {
    return message;
  }
  return Object.entries(params).reduce(
    (current, [name, value]) => current.replace(`{${name}}`, String(value)),
    message,
  );
}

function createI18nAdapter(locale: string | undefined) {
  return {
    translate(
      input: string | { key: string; params?: Record<string, string | number> },
      params?: Record<string, string | number>,
    ) {
      const key = typeof input === "string" ? input : input.key;
      return formatMessage(
        locale,
        key as LayoutMessageKey,
        typeof input === "string" ? params : input.params,
      );
    },
  };
}

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
}

function sanitizeAssetFileName(name: string): string {
  const sanitized = name
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/^\.+/, "")
    .replace(/-+$/, "");
  return sanitized.length > 0 ? sanitized : "map";
}

function buildPreferredMapAssetPath(file: File): string {
  return `assets/layouts/map/base-map/${Date.now()}-${sanitizeAssetFileName(file.name)}`;
}

function toStandardError(locale: string | undefined, key: LayoutMessageKey | undefined): StandardErrorLike | null {
  if (!key) {
    return null;
  }
  return {
    code: key,
    message: getLayoutMessage(locale, key),
    retryable: true,
  };
}

function updateProps(config: LayoutConfig, patch: Partial<LayoutConfig["props"]>): LayoutConfig {
  return normalizeLayoutConfig({
    ...config,
    props: {
      ...config.props,
      ...patch,
    },
  });
}

function updateMapSource(config: LayoutConfig, patch: Partial<MapSourceConfig>): LayoutConfig {
  return updateProps(config, {
    mapSource: {
      ...config.props.mapSource,
      ...patch,
      bounds: patch.bounds ?? config.props.mapSource.bounds,
    },
  });
}

function updateBounds(config: LayoutConfig, patch: Partial<GeoBounds>): LayoutConfig {
  return updateMapSource(config, {
    bounds: {
      ...config.props.mapSource.bounds,
      ...patch,
    },
  });
}

function updateFrameRegion(config: LayoutConfig, region: FrameRegionConfig): LayoutConfig {
  return updateProps(config, {
    topRegion: region,
  });
}

function updateEntryLocation(
  config: LayoutConfig,
  entryId: string,
  patch: Partial<LayoutConfig["props"]["entries"][string]>,
): LayoutConfig {
  const current = config.props.entries[entryId] ?? {
    latitude: config.props.defaultView.latitude,
    longitude: config.props.defaultView.longitude,
  };
  return updateProps(config, {
    entries: {
      ...config.props.entries,
      [entryId]: {
        ...current,
        ...patch,
      },
    },
  });
}

function removeEntryLocation(config: LayoutConfig, entryId: string): LayoutConfig {
  const nextEntries = { ...config.props.entries };
  delete nextEntries[entryId];
  return updateProps(config, {
    entries: nextEntries,
  });
}

function parseNumberInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function MapAssetPreview({
  assetPath,
  locale,
  readBoxAsset,
}: {
  assetPath?: string;
  locale?: string;
  readBoxAsset?: (assetPath: string) => Promise<ResolvedRuntimeResource>;
}) {
  const [state, setState] = React.useState<{
    status: "idle" | "loading" | "ready" | "error";
    resourceUrl?: string;
  }>({ status: "idle" });

  React.useEffect(() => {
    if (!assetPath) {
      setState({ status: "idle" });
      return;
    }
    if (!readBoxAsset) {
      setState({ status: "error" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void readBoxAsset(assetPath)
      .then((resource) => {
        if (!cancelled && resource.resourceUrl) {
          setState({
            status: "ready",
            resourceUrl: resource.resourceUrl,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetPath, readBoxAsset]);

  return (
    <div className="chips-map-layout-editor__map-preview">
      {state.status === "ready" && state.resourceUrl ? (
        <img src={state.resourceUrl} alt={getLayoutMessage(locale, "editor.map_preview")} />
      ) : (
        <div className="chips-map-layout-editor__hint">
          {state.status === "loading"
            ? getLayoutMessage(locale, "editor.asset_loading")
            : assetPath
              ? getLayoutMessage(locale, "editor.read_failed")
              : getLayoutMessage(locale, "editor.default_map_preview")}
        </div>
      )}
    </div>
  );
}

export function LayoutEditorPanel({
  entries,
  config: initialConfig,
  locale,
  readBoxAsset,
  importBoxAsset,
  deleteBoxAsset,
  onChange,
}: LayoutEditorPanelProps) {
  const [config, setConfig] = React.useState(() => normalizeLayoutConfig(initialConfig));
  const [assetErrorKey, setAssetErrorKey] = React.useState<LayoutMessageKey | undefined>();
  const [busyAsset, setBusyAsset] = React.useState(false);
  const mapFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const i18n = React.useMemo(() => createI18nAdapter(locale), [locale]);
  const validation = React.useMemo(() => validateLayoutConfig(config), [config]);
  const assetError = toStandardError(locale, assetErrorKey);
  const locatedCount = entries.filter((entry) => config.props.entries[entry.entryId]).length;
  const unlocatedCount = entries.length - locatedCount;

  React.useEffect(() => {
    setConfig(normalizeLayoutConfig(initialConfig));
  }, [initialConfig]);

  function commit(next: LayoutConfig): void {
    const normalized = normalizeLayoutConfig(next);
    setConfig(normalized);
    onChange(normalized);
  }

  async function deleteMapAsset(assetPath: string | undefined): Promise<boolean> {
    if (!assetPath) {
      return true;
    }
    if (!deleteBoxAsset) {
      setAssetErrorKey("editor.asset_bridge_missing");
      return false;
    }
    try {
      await deleteBoxAsset(assetPath);
      setAssetErrorKey(undefined);
      return true;
    } catch {
      setAssetErrorKey("editor.delete_failed");
      return false;
    }
  }

  async function importMapAsset(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }
    if (!importBoxAsset || !readBoxAsset || !deleteBoxAsset) {
      setAssetErrorKey("editor.asset_bridge_missing");
      return;
    }

    setBusyAsset(true);
    try {
      const imported = await importBoxAsset({
        file,
        preferredPath: buildPreferredMapAssetPath(file),
      });
      if (!isSafeBoxAssetPath(imported.assetPath)) {
        setAssetErrorKey("editor.imported_asset_path_invalid");
        return;
      }
      const previousAssetPath = config.props.mapSource.assetPath;
      commit(updateMapSource(config, {
        mode: "image",
        projection: "linear-bounds",
        assetPath: imported.assetPath,
      }));
      setAssetErrorKey(undefined);
      if (previousAssetPath && previousAssetPath !== imported.assetPath) {
        await deleteBoxAsset(previousAssetPath).catch(() => {
          setAssetErrorKey("editor.delete_failed");
        });
      }
    } catch {
      setAssetErrorKey("editor.import_failed");
    } finally {
      if (mapFileInputRef.current) {
        mapFileInputRef.current.value = "";
      }
      setBusyAsset(false);
    }
  }

  async function clearMapAsset(): Promise<void> {
    const deleted = await deleteMapAsset(config.props.mapSource.assetPath);
    if (!deleted) {
      return;
    }
    commit(updateMapSource(config, {
      assetPath: undefined,
    }));
  }

  const modeOptions = config.props.mapSource.mode === "host-map"
    ? [
        { value: "image", label: getLayoutMessage(locale, "editor.map_source_image") },
        { value: "host-map", label: getLayoutMessage(locale, "editor.map_source_host"), disabled: true },
      ]
    : [
        { value: "image", label: getLayoutMessage(locale, "editor.map_source_image") },
      ];
  const markerOptions = [
    { value: "dot-title", label: getLayoutMessage(locale, "editor.marker_dot_title") },
    { value: "pin-title", label: getLayoutMessage(locale, "editor.marker_pin_title") },
  ];

  return (
    <section
      className="chips-map-layout-editor"
      data-scope="chips-box-layout-editor"
      aria-label={getLayoutMessage(locale, "editor.aria_label")}
    >
      <style>{EDITOR_STYLE_TEXT}</style>
      <ChipsForm.Root
        className="chips-map-layout-editor__form"
        aria-label={getLayoutMessage(locale, "editor.aria_label")}
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <ChipsStack gap="var(--chips-layout-gap-lg, var(--chips-base-space-4))">
          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.map_source")}
            description={getLayoutMessage(locale, "editor.section.map_source_desc")}
          >
            <ChipsForm.Field name="mapSource.mode">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.map_source_mode")}</ChipsForm.Label>
              <StableSelect
                value={config.props.mapSource.mode}
                placeholder={getLayoutMessage(locale, "editor.map_source_mode")}
                i18n={i18n}
                options={modeOptions}
                onValueChange={(_value: string) => {
                  if (config.props.mapSource.mode === "image") {
                    return;
                  }
                  void (async () => {
                    const deleted = await deleteMapAsset(config.props.mapSource.assetPath);
                    if (!deleted) {
                      return;
                    }
                    commit(updateMapSource(config, {
                      mode: "image",
                      projection: "linear-bounds",
                      assetPath: undefined,
                    }));
                  })();
                }}
              />
              {config.props.mapSource.mode === "host-map" ? (
                <ChipsForm.Hint>{getLayoutMessage(locale, "editor.host_map_reserved_hint")}</ChipsForm.Hint>
              ) : (
                <ChipsForm.Hint>{getLayoutMessage(locale, "editor.map_source_image_hint")}</ChipsForm.Hint>
              )}
            </ChipsForm.Field>

            <ChipsForm.Field name="mapSource.assetPath" error={assetError}>
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.map_asset")}</ChipsForm.Label>
              <input
                ref={mapFileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  void importMapAsset(event.currentTarget.files?.[0]);
                }}
              />
              <div className="chips-map-layout-editor__entry-actions">
                <ChipsButton
                  type="button"
                  disabled={busyAsset || config.props.mapSource.mode !== "image"}
                  onPress={() => {
                    mapFileInputRef.current?.click();
                  }}
                >
                  {config.props.mapSource.assetPath
                    ? getLayoutMessage(locale, "editor.replace_image")
                    : getLayoutMessage(locale, "editor.upload_image")}
                </ChipsButton>
                <ChipsButton
                  type="button"
                  disabled={busyAsset || !config.props.mapSource.assetPath}
                  onPress={() => {
                    void clearMapAsset();
                  }}
                >
                  {getLayoutMessage(locale, "editor.clear_asset")}
                </ChipsButton>
              </div>
              <span className="chips-map-layout-editor__asset-path">
                {config.props.mapSource.assetPath ?? getLayoutMessage(locale, "editor.default_map_asset")}
              </span>
              <ChipsForm.Error>{assetError?.message}</ChipsForm.Error>
              {assetErrorKey === "editor.asset_bridge_missing" ? (
                <ChipsErrorState
                  error={assetError}
                  title={getLayoutMessage(locale, "editor.asset_bridge_missing")}
                  description={getLayoutMessage(locale, "editor.asset_bridge_missing_desc")}
                />
              ) : null}
              <MapAssetPreview
                assetPath={config.props.mapSource.assetPath}
                locale={locale}
                readBoxAsset={readBoxAsset}
              />
            </ChipsForm.Field>

            <div className="chips-map-layout-editor__field-grid">
              {(["west", "south", "east", "north"] as const).map((key) => (
                <ChipsForm.Field key={key} name={`mapSource.bounds.${key}`}>
                  <ChipsForm.Label>{getLayoutMessage(locale, `editor.bounds_${key}` as LayoutMessageKey)}</ChipsForm.Label>
                  <input
                    type="number"
                    step="0.000001"
                    value={config.props.mapSource.bounds[key]}
                    onChange={(event) => {
                      commit(updateBounds(config, {
                        [key]: parseNumberInput(event.currentTarget.value, config.props.mapSource.bounds[key]),
                      }));
                    }}
                  />
                </ChipsForm.Field>
              ))}
            </div>
            {validation.errors["props.mapSource.bounds"] ? (
              <span className="chips-map-layout-editor__error">{validation.errors["props.mapSource.bounds"]}</span>
            ) : null}
          </ChipsForm.Section>

          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.view")}
            description={getLayoutMessage(locale, "editor.section.view_desc")}
          >
            <div className="chips-map-layout-editor__field-grid">
              <ChipsForm.Field name="defaultView.latitude">
                <ChipsForm.Label>{getLayoutMessage(locale, "editor.default_latitude")}</ChipsForm.Label>
                <input
                  type="number"
                  step="0.000001"
                  value={config.props.defaultView.latitude}
                  onChange={(event) => {
                    commit(updateProps(config, {
                      defaultView: {
                        ...config.props.defaultView,
                        latitude: parseNumberInput(event.currentTarget.value, config.props.defaultView.latitude),
                      },
                    }));
                  }}
                />
              </ChipsForm.Field>
              <ChipsForm.Field name="defaultView.longitude">
                <ChipsForm.Label>{getLayoutMessage(locale, "editor.default_longitude")}</ChipsForm.Label>
                <input
                  type="number"
                  step="0.000001"
                  value={config.props.defaultView.longitude}
                  onChange={(event) => {
                    commit(updateProps(config, {
                      defaultView: {
                        ...config.props.defaultView,
                        longitude: parseNumberInput(event.currentTarget.value, config.props.defaultView.longitude),
                      },
                    }));
                  }}
                />
              </ChipsForm.Field>
              <ChipsForm.Field name="defaultView.zoom">
                <ChipsForm.Label>{getLayoutMessage(locale, "editor.default_zoom")}</ChipsForm.Label>
                <input
                  type="number"
                  min="0.5"
                  max="8"
                  step="0.25"
                  value={config.props.defaultView.zoom}
                  onChange={(event) => {
                    commit(updateProps(config, {
                      defaultView: {
                        ...config.props.defaultView,
                        zoom: parseNumberInput(event.currentTarget.value, config.props.defaultView.zoom),
                      },
                    }));
                  }}
                />
              </ChipsForm.Field>
              <ChipsForm.Field name="markerStyle">
                <ChipsForm.Label>{getLayoutMessage(locale, "editor.marker_style")}</ChipsForm.Label>
                <select
                  value={config.props.markerStyle}
                  onChange={(event) => {
                    commit(updateProps(config, {
                      markerStyle: event.currentTarget.value as MarkerStyle,
                    }));
                  }}
                >
                  {markerOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </ChipsForm.Field>
            </div>
            <ChipsForm.Field name="showCoverOnSelect">
              <label>
                <input
                  type="checkbox"
                  checked={config.props.showCoverOnSelect}
                  onChange={(event) => {
                    commit(updateProps(config, {
                      showCoverOnSelect: event.currentTarget.checked,
                    }));
                  }}
                />{" "}
                {getLayoutMessage(locale, "editor.show_cover_on_select")}
              </label>
              <ChipsForm.Hint>{getLayoutMessage(locale, "editor.show_cover_on_select_hint")}</ChipsForm.Hint>
            </ChipsForm.Field>
            {["props.defaultView.latitude", "props.defaultView.longitude", "props.defaultView.zoom"].map((key) => (
              validation.errors[key] ? (
                <span key={key} className="chips-map-layout-editor__error">{validation.errors[key]}</span>
              ) : null
            ))}
          </ChipsForm.Section>

          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.entries")}
            description={formatMessage(locale, "editor.section.entries_desc", {
              located: locatedCount,
              unlocated: unlocatedCount,
            })}
          >
            <ChipsText
              as="p"
              tone="muted"
              text={formatMessage(locale, "editor.entry_count", { count: entries.length })}
            />
            <div className="chips-map-layout-editor__entry-list">
              {entries.map((entry) => {
                const location = config.props.entries[entry.entryId];
                const latitude = location?.latitude ?? config.props.defaultView.latitude;
                const longitude = location?.longitude ?? config.props.defaultView.longitude;
                const latitudeError = validation.errors[`props.entries.${entry.entryId}.latitude`];
                const longitudeError = validation.errors[`props.entries.${entry.entryId}.longitude`];
                return (
                  <div key={entry.entryId} className="chips-map-layout-editor__entry-row" data-entry-id={entry.entryId}>
                    <ChipsForm.Field name={`entries.${entry.entryId}.labelOverride`}>
                      <ChipsForm.Label>{resolveEntryTitle(entry)}</ChipsForm.Label>
                      <input
                        type="text"
                        value={location?.labelOverride ?? ""}
                        placeholder={getLayoutMessage(locale, "editor.label_override")}
                        onChange={(event) => {
                          commit(updateEntryLocation(config, entry.entryId, {
                            labelOverride: event.currentTarget.value,
                          }));
                        }}
                      />
                    </ChipsForm.Field>
                    <ChipsForm.Field name={`entries.${entry.entryId}.latitude`}>
                      <ChipsForm.Label>{getLayoutMessage(locale, "editor.latitude")}</ChipsForm.Label>
                      <input
                        data-entry-latitude={entry.entryId}
                        type="number"
                        step="0.000001"
                        value={latitude}
                        onChange={(event) => {
                          commit(updateEntryLocation(config, entry.entryId, {
                            latitude: parseNumberInput(event.currentTarget.value, latitude),
                          }));
                        }}
                      />
                      {latitudeError ? <span className="chips-map-layout-editor__error">{latitudeError}</span> : null}
                    </ChipsForm.Field>
                    <ChipsForm.Field name={`entries.${entry.entryId}.longitude`}>
                      <ChipsForm.Label>{getLayoutMessage(locale, "editor.longitude")}</ChipsForm.Label>
                      <input
                        data-entry-longitude={entry.entryId}
                        type="number"
                        step="0.000001"
                        value={longitude}
                        onChange={(event) => {
                          commit(updateEntryLocation(config, entry.entryId, {
                            longitude: parseNumberInput(event.currentTarget.value, longitude),
                          }));
                        }}
                      />
                      {longitudeError ? <span className="chips-map-layout-editor__error">{longitudeError}</span> : null}
                    </ChipsForm.Field>
                    <div className="chips-map-layout-editor__entry-actions">
                      <ChipsButton
                        type="button"
                        onPress={() => {
                          commit(updateEntryLocation(config, entry.entryId, {
                            latitude,
                            longitude,
                          }));
                        }}
                      >
                        {location ? getLayoutMessage(locale, "editor.update_location") : getLayoutMessage(locale, "editor.place_entry")}
                      </ChipsButton>
                      <ChipsButton
                        type="button"
                        disabled={!location}
                        onPress={() => {
                          commit(removeEntryLocation(config, entry.entryId));
                        }}
                      >
                        {getLayoutMessage(locale, "editor.clear_location")}
                      </ChipsButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChipsForm.Section>

          <FrameRegionEditor
            id="topRegion"
            region={config.props.topRegion}
            locale={locale}
            title={getLayoutMessage(locale, "editor.top_region_title")}
            description={getLayoutMessage(locale, "editor.top_region_desc")}
            previewRatio="16:5"
            preferredAssetPrefix="assets/layouts/map/top-region"
            readBoxAsset={readBoxAsset}
            importBoxAsset={importBoxAsset}
            deleteBoxAsset={deleteBoxAsset}
            onChange={(nextRegion) => {
              commit(updateFrameRegion(config, nextRegion));
            }}
          />
        </ChipsStack>
      </ChipsForm.Root>
    </section>
  );
}

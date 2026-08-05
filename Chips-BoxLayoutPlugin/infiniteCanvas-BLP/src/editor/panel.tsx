import React from "react";
import {
  BACKGROUND_ASSET_PREFIX,
  GRID_SIZE,
  isSafeBackgroundAssetPath,
  normalizeLayoutConfig,
  snapCoordinate,
  type CanvasItemConfig,
  type ItemDisplayMode,
  type LayoutConfig,
} from "../schema/layout-config";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
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

interface PreviewState {
  status: "idle" | "loading" | "ready" | "error";
  resourceUrl?: string;
}

const EDITOR_STYLE_TEXT = `
.chips-infinite-canvas-editor {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  color: var(--chips-sys-color-on-surface);
  background: var(--chips-sys-color-surface);
  font: var(--chips-comp-text-root-font, inherit);
}

.chips-infinite-canvas-editor,
.chips-infinite-canvas-editor * {
  box-sizing: border-box;
}

.chips-infinite-canvas-editor__panel,
.chips-infinite-canvas-editor__canvas-wrap {
  min-width: 0;
  min-height: 0;
}

.chips-infinite-canvas-editor__panel {
  display: grid;
  align-content: start;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  overflow: auto;
  padding: var(--chips-base-space-4);
  border-inline-end: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
}

.chips-infinite-canvas-editor__section {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

.chips-infinite-canvas-editor__section h2 {
  margin: 0;
  font-size: var(--chips-comp-title-root-font-size, 14px);
  line-height: var(--chips-comp-title-root-line-height, 1.4);
}

.chips-infinite-canvas-editor__field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.chips-infinite-canvas-editor__field label,
.chips-infinite-canvas-editor__hint,
.chips-infinite-canvas-editor__path {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

.chips-infinite-canvas-editor select,
.chips-infinite-canvas-editor input[type="number"],
.chips-infinite-canvas-editor input[type="text"] {
  width: 100%;
  min-width: 0;
  min-height: 34px;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-base-radius-sm, 6px);
  padding-inline: var(--chips-base-space-2);
  color: var(--chips-sys-color-on-surface);
  background: var(--chips-comp-field-root-surface, var(--chips-sys-color-surface));
  font: inherit;
}

.chips-infinite-canvas-editor__inline {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
}

.chips-infinite-canvas-editor__toggle {
  display: flex;
  align-items: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
}

.chips-infinite-canvas-editor button {
  min-height: 34px;
  border: 0;
  border-radius: var(--chips-comp-button-root-radius, var(--chips-base-radius-md));
  padding-inline: var(--chips-base-space-3);
  background: var(--chips-comp-button-root-surface-idle);
  color: var(--chips-comp-button-label-color-idle, var(--chips-sys-color-on-surface));
  font: inherit;
  cursor: pointer;
}

.chips-infinite-canvas-editor button:disabled {
  cursor: default;
  color: var(--chips-comp-button-label-color-disabled, var(--chips-sys-color-on-surface-muted));
  background: var(--chips-comp-button-root-surface-disabled);
}

.chips-infinite-canvas-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
}

.chips-infinite-canvas-editor__unplaced,
.chips-infinite-canvas-editor__placed {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

.chips-infinite-canvas-editor__entry-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  align-items: center;
  min-width: 0;
  padding: var(--chips-base-space-2);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-base-radius-sm, 6px);
  background: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

.chips-infinite-canvas-editor__entry-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chips-infinite-canvas-editor__preview {
  width: 100%;
  min-height: 120px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-base-radius-sm, 6px);
  background: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
}

.chips-infinite-canvas-editor__preview img {
  width: 100%;
  height: 100%;
  max-height: 180px;
  object-fit: cover;
}

.chips-infinite-canvas-editor__canvas-wrap {
  position: relative;
  overflow: hidden;
  background: var(--chips-sys-color-surface);
}

.chips-infinite-canvas-editor__canvas {
  position: absolute;
  inset: var(--chips-base-space-4);
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-base-radius-md, 8px);
  background-color: var(--chips-sys-color-surface);
  background-image:
    linear-gradient(to right, var(--chips-sys-color-border-subtle) 1px, transparent 1px),
    linear-gradient(to bottom, var(--chips-sys-color-border-subtle) 1px, transparent 1px);
  background-size: 32px 32px;
  cursor: crosshair;
}

.chips-infinite-canvas-editor__world {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: 0;
  transform-origin: 0 0;
}

.chips-infinite-canvas-editor__background {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: 0;
  width: 960px;
  height: 600px;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  pointer-events: none;
}

.chips-infinite-canvas-editor__background img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-infinite-canvas-editor__node {
  position: absolute;
  display: grid;
  gap: 4px;
  min-width: 112px;
  transform: translate(-50%, -50%);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-base-radius-sm, 6px);
  padding: 6px 8px;
  background: color-mix(in srgb, var(--chips-sys-color-surface) 90%, transparent);
  color: var(--chips-sys-color-on-surface);
  cursor: grab;
  user-select: none;
}

.chips-infinite-canvas-editor__node[data-active="true"] {
  outline: var(--chips-layout-focus-outline-width, 2px) solid var(--chips-sys-color-primary);
  outline-offset: var(--chips-layout-focus-outline-offset, 2px);
}

.chips-infinite-canvas-editor__node-dot {
  inline-size: 10px;
  block-size: 10px;
  border-radius: 999px;
  background: var(--chips-sys-color-primary);
}

.chips-infinite-canvas-editor__node-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
}

@media (max-width: 760px) {
  .chips-infinite-canvas-editor {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(320px, 44vh) minmax(0, 1fr);
  }

  .chips-infinite-canvas-editor__panel {
    border-inline-end: 0;
    border-block-start: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  }

  .chips-infinite-canvas-editor__canvas-wrap {
    order: -1;
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

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
}

function sanitizeAssetName(name: string): string {
  const normalized = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "background";
}

function getCanvasPoint(event: React.MouseEvent<HTMLElement>, config: LayoutConfig): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  const rawX = event.clientX - rect.left - config.props.defaultView.x;
  const rawY = event.clientY - rect.top - config.props.defaultView.y;
  const x = rawX / config.props.defaultView.zoom;
  const y = rawY / config.props.defaultView.zoom;
  return config.props.snapToGrid
    ? { x: snapCoordinate(x), y: snapCoordinate(y) }
    : { x, y };
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

function updateItem(config: LayoutConfig, entryId: string, item: CanvasItemConfig | undefined): LayoutConfig {
  const items = { ...config.props.items };
  if (item) {
    items[entryId] = item;
  } else {
    delete items[entryId];
  }
  return updateProps(config, { items });
}

function numberValue(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "";
}

function BackgroundPreview({
  config,
  locale,
  readBoxAsset,
}: {
  config: LayoutConfig;
  locale?: string;
  readBoxAsset?(assetPath: string): Promise<ResolvedRuntimeResource>;
}) {
  const [state, setState] = React.useState<PreviewState>({ status: "idle" });
  const assetPath = config.props.background.mode === "image" ? config.props.background.assetPath : undefined;

  React.useEffect(() => {
    if (!assetPath) {
      setState({ status: "idle" });
      return undefined;
    }
    if (!readBoxAsset) {
      setState({ status: "error" });
      return undefined;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void readBoxAsset(assetPath)
      .then((resource) => {
        if (!cancelled) {
          setState({ status: "ready", resourceUrl: resource.resourceUrl });
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
    <div className="chips-infinite-canvas-editor__preview" data-background-preview>
      {state.status === "ready" && state.resourceUrl ? (
        <img src={state.resourceUrl} alt="" />
      ) : (
        <span>
          {state.status === "loading"
            ? getLayoutMessage(locale, "editor.asset_loading")
            : assetPath
              ? getLayoutMessage(locale, "editor.asset_preview_unavailable")
              : getLayoutMessage(locale, "editor.no_background")}
        </span>
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
  const [selectedUnplacedId, setSelectedUnplacedId] = React.useState<string | undefined>();
  const [selectedPlacedId, setSelectedPlacedId] = React.useState<string | undefined>();
  const [assetError, setAssetError] = React.useState<string | undefined>();
  const [busyAsset, setBusyAsset] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const configRef = React.useRef(config);
  const dragRef = React.useRef<{
    entryId: string;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | undefined>();

  React.useEffect(() => {
    const normalized = normalizeLayoutConfig(initialConfig);
    setConfig(normalized);
    configRef.current = normalized;
  }, [initialConfig]);

  function commit(next: LayoutConfig): void {
    const normalized = normalizeLayoutConfig(next);
    configRef.current = normalized;
    setConfig(normalized);
    onChange(normalized);
  }

  const placedEntryIds = new Set(Object.keys(config.props.items));
  const unplacedEntries = entries.filter((entry) => !placedEntryIds.has(entry.entryId));
  const selectedItem = selectedPlacedId ? config.props.items[selectedPlacedId] : undefined;
  const selectedEntry = selectedPlacedId ? entries.find((entry) => entry.entryId === selectedPlacedId) : undefined;

  function placeEntry(entryId: string, x = 0, y = 0): void {
    const entry = entries.find((candidate) => candidate.entryId === entryId);
    if (!entry) {
      return;
    }
    const nextItem: CanvasItemConfig = {
      x: config.props.snapToGrid ? snapCoordinate(x) : x,
      y: config.props.snapToGrid ? snapCoordinate(y) : y,
      mode: config.props.displayMode === "cover" ? "cover" : "point",
    };
    commit(updateItem(configRef.current, entryId, nextItem));
    setSelectedUnplacedId(undefined);
    setSelectedPlacedId(entryId);
  }

  async function handleBackgroundUpload(file: File): Promise<void> {
    setAssetError(undefined);
    if (!importBoxAsset) {
      setAssetError(getLayoutMessage(locale, "editor.asset_bridge_missing"));
      return;
    }
    setBusyAsset(true);
    try {
      const previousAssetPath = configRef.current.props.background.assetPath;
      const result = await importBoxAsset({
        file,
        preferredPath: `${BACKGROUND_ASSET_PREFIX}${Date.now()}-${sanitizeAssetName(file.name)}`,
      });
      if (!isSafeBackgroundAssetPath(result.assetPath)) {
        setAssetError(getLayoutMessage(locale, "editor.imported_asset_path_invalid"));
        return;
      }
      commit(updateProps(configRef.current, {
        background: {
          ...configRef.current.props.background,
          mode: "image",
          assetPath: result.assetPath,
        },
      }));
      if (previousAssetPath && previousAssetPath !== result.assetPath && deleteBoxAsset) {
        await deleteBoxAsset(previousAssetPath);
      }
    } catch {
      setAssetError(getLayoutMessage(locale, "editor.import_failed"));
    } finally {
      setBusyAsset(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function clearBackground(): Promise<void> {
    const previousAssetPath = configRef.current.props.background.assetPath;
    commit(updateProps(configRef.current, {
      background: {
        mode: "none",
        opacity: configRef.current.props.background.opacity ?? 1,
      },
    }));
    if (previousAssetPath && deleteBoxAsset) {
      try {
        await deleteBoxAsset(previousAssetPath);
      } catch {
        setAssetError(getLayoutMessage(locale, "editor.delete_failed"));
      }
    }
  }

  function updateSelectedItem(patch: Partial<CanvasItemConfig>): void {
    if (!selectedPlacedId || !selectedItem) {
      return;
    }
    commit(updateItem(configRef.current, selectedPlacedId, {
      ...selectedItem,
      ...patch,
    }));
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget || !selectedUnplacedId) {
      return;
    }
    const point = getCanvasPoint(event, configRef.current);
    placeEntry(selectedUnplacedId, point.x, point.y);
  }

  function handleNodePointerDown(event: React.PointerEvent<HTMLDivElement>, entryId: string): void {
    event.stopPropagation();
    const item = configRef.current.props.items[entryId];
    if (!item) {
      return;
    }
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragRef.current = {
      entryId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: item.x,
      originY: item.y,
    };
    setSelectedPlacedId(entryId);
  }

  function handleNodePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const zoom = configRef.current.props.defaultView.zoom;
    const nextX = drag.originX + (event.clientX - drag.startX) / zoom;
    const nextY = drag.originY + (event.clientY - drag.startY) / zoom;
    const nextItem = {
      ...configRef.current.props.items[drag.entryId],
      x: configRef.current.props.snapToGrid ? snapCoordinate(nextX) : nextX,
      y: configRef.current.props.snapToGrid ? snapCoordinate(nextY) : nextY,
    } as CanvasItemConfig;
    commit(updateItem(configRef.current, drag.entryId, nextItem));
  }

  function handleNodePointerUp(event: React.PointerEvent<HTMLDivElement>): void {
    if (
      typeof event.currentTarget.hasPointerCapture === "function"
      && event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = undefined;
  }

  return (
    <section
      className="chips-infinite-canvas-editor"
      data-scope="chips-infinite-canvas-layout-editor"
      aria-label={getLayoutMessage(locale, "editor.aria_label")}
    >
      <style>{EDITOR_STYLE_TEXT}</style>

      <aside className="chips-infinite-canvas-editor__panel">
        <section className="chips-infinite-canvas-editor__section">
          <h2>{getLayoutMessage(locale, "editor.section.view")}</h2>
          <label className="chips-infinite-canvas-editor__field">
            <span>{getLayoutMessage(locale, "editor.display_mode")}</span>
            <select
              value={config.props.displayMode}
              onChange={(event) => {
                commit(updateProps(config, { displayMode: event.currentTarget.value as LayoutConfig["props"]["displayMode"] }));
              }}
            >
              <option value="point">{getLayoutMessage(locale, "editor.display_point")}</option>
              <option value="cover">{getLayoutMessage(locale, "editor.display_cover")}</option>
              <option value="mixed">{getLayoutMessage(locale, "editor.display_mixed")}</option>
            </select>
          </label>
          <label className="chips-infinite-canvas-editor__toggle">
            <input
              type="checkbox"
              checked={config.props.gridVisible}
              onChange={(event) => {
                commit(updateProps(config, { gridVisible: event.currentTarget.checked }));
              }}
            />
            <span>{getLayoutMessage(locale, "editor.grid_visible")}</span>
          </label>
          <label className="chips-infinite-canvas-editor__toggle">
            <input
              type="checkbox"
              checked={config.props.snapToGrid}
              onChange={(event) => {
                commit(updateProps(config, { snapToGrid: event.currentTarget.checked }));
              }}
            />
            <span>{getLayoutMessage(locale, "editor.snap_to_grid")}</span>
          </label>
          <div className="chips-infinite-canvas-editor__inline">
            <label className="chips-infinite-canvas-editor__field">
              <span>{getLayoutMessage(locale, "editor.default_x")}</span>
              <input
                type="number"
                value={numberValue(config.props.defaultView.x)}
                onChange={(event) => {
                  commit(updateProps(config, {
                    defaultView: {
                      ...config.props.defaultView,
                      x: Number(event.currentTarget.value),
                    },
                  }));
                }}
              />
            </label>
            <label className="chips-infinite-canvas-editor__field">
              <span>{getLayoutMessage(locale, "editor.default_y")}</span>
              <input
                type="number"
                value={numberValue(config.props.defaultView.y)}
                onChange={(event) => {
                  commit(updateProps(config, {
                    defaultView: {
                      ...config.props.defaultView,
                      y: Number(event.currentTarget.value),
                    },
                  }));
                }}
              />
            </label>
          </div>
          <label className="chips-infinite-canvas-editor__field">
            <span>{getLayoutMessage(locale, "editor.default_zoom")}</span>
            <input
              type="number"
              min="0.25"
              max="4"
              step="0.05"
              value={numberValue(config.props.defaultView.zoom)}
              onChange={(event) => {
                commit(updateProps(config, {
                  defaultView: {
                    ...config.props.defaultView,
                    zoom: Number(event.currentTarget.value),
                  },
                }));
              }}
            />
          </label>
        </section>

        <section className="chips-infinite-canvas-editor__section">
          <h2>{getLayoutMessage(locale, "editor.section.background")}</h2>
          <BackgroundPreview
            config={config}
            locale={locale}
            readBoxAsset={readBoxAsset}
          />
          <div className="chips-infinite-canvas-editor__toolbar">
            <button
              type="button"
              disabled={busyAsset}
              onClick={() => fileInputRef.current?.click()}
            >
              {config.props.background.assetPath
                ? getLayoutMessage(locale, "editor.replace_background")
                : getLayoutMessage(locale, "editor.upload_background")}
            </button>
            <button
              type="button"
              disabled={!config.props.background.assetPath}
              onClick={() => {
                void clearBackground();
              }}
            >
              {getLayoutMessage(locale, "editor.clear_background")}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) {
                void handleBackgroundUpload(file);
              }
            }}
          />
          <label className="chips-infinite-canvas-editor__field">
            <span>{getLayoutMessage(locale, "editor.background_opacity")}</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={numberValue(config.props.background.opacity ?? 1)}
              onChange={(event) => {
                commit(updateProps(config, {
                  background: {
                    ...config.props.background,
                    opacity: Number(event.currentTarget.value),
                  },
                }));
              }}
            />
          </label>
          {config.props.background.assetPath ? (
            <span className="chips-infinite-canvas-editor__path">{config.props.background.assetPath}</span>
          ) : null}
          {assetError ? (
            <span className="chips-infinite-canvas-editor__hint" role="status">{assetError}</span>
          ) : null}
        </section>

        <section className="chips-infinite-canvas-editor__section">
          <h2>{getLayoutMessage(locale, "editor.section.unplaced")}</h2>
          <span className="chips-infinite-canvas-editor__hint">
            {formatMessage(locale, "editor.unplaced_count", { count: unplacedEntries.length })}
          </span>
          <div className="chips-infinite-canvas-editor__unplaced">
            {unplacedEntries.length > 0 ? unplacedEntries.map((entry) => (
              <div
                key={entry.entryId}
                className="chips-infinite-canvas-editor__entry-row"
                draggable
                data-unplaced-entry-id={entry.entryId}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", entry.entryId);
                  setSelectedUnplacedId(entry.entryId);
                }}
              >
                <span className="chips-infinite-canvas-editor__entry-title">{resolveEntryTitle(entry)}</span>
                <button
                  type="button"
                  onClick={() => setSelectedUnplacedId(entry.entryId)}
                >
                  {selectedUnplacedId === entry.entryId
                    ? getLayoutMessage(locale, "editor.selected")
                    : getLayoutMessage(locale, "editor.select_to_place")}
                </button>
              </div>
            )) : (
              <span className="chips-infinite-canvas-editor__hint">{getLayoutMessage(locale, "editor.no_unplaced")}</span>
            )}
          </div>
        </section>

        <section className="chips-infinite-canvas-editor__section">
          <h2>{getLayoutMessage(locale, "editor.section.selected")}</h2>
          {selectedItem && selectedEntry ? (
            <>
              <span className="chips-infinite-canvas-editor__entry-title">{resolveEntryTitle(selectedEntry)}</span>
              <div className="chips-infinite-canvas-editor__inline">
                <label className="chips-infinite-canvas-editor__field">
                  <span>{getLayoutMessage(locale, "editor.item_x")}</span>
                  <input
                    type="number"
                    value={numberValue(selectedItem.x)}
                    onChange={(event) => updateSelectedItem({ x: Number(event.currentTarget.value) })}
                  />
                </label>
                <label className="chips-infinite-canvas-editor__field">
                  <span>{getLayoutMessage(locale, "editor.item_y")}</span>
                  <input
                    type="number"
                    value={numberValue(selectedItem.y)}
                    onChange={(event) => updateSelectedItem({ y: Number(event.currentTarget.value) })}
                  />
                </label>
              </div>
              <label className="chips-infinite-canvas-editor__field">
                <span>{getLayoutMessage(locale, "editor.item_mode")}</span>
                <select
                  value={selectedItem.mode ?? "point"}
                  onChange={(event) => updateSelectedItem({ mode: event.currentTarget.value as ItemDisplayMode })}
                >
                  <option value="point">{getLayoutMessage(locale, "editor.display_point")}</option>
                  <option value="cover">{getLayoutMessage(locale, "editor.display_cover")}</option>
                </select>
              </label>
              <label className="chips-infinite-canvas-editor__field">
                <span>{getLayoutMessage(locale, "editor.label_override")}</span>
                <input
                  type="text"
                  value={selectedItem.labelOverride ?? ""}
                  onChange={(event) => updateSelectedItem({ labelOverride: event.currentTarget.value })}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  commit(updateItem(configRef.current, selectedEntry.entryId, undefined));
                  setSelectedPlacedId(undefined);
                }}
              >
                {getLayoutMessage(locale, "editor.unplace_entry")}
              </button>
            </>
          ) : (
            <span className="chips-infinite-canvas-editor__hint">{getLayoutMessage(locale, "editor.no_selected")}</span>
          )}
        </section>
      </aside>

      <div className="chips-infinite-canvas-editor__canvas-wrap">
        <div
          className="chips-infinite-canvas-editor__canvas"
          data-editor-canvas
          onClick={handleCanvasClick}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const entryId = event.dataTransfer.getData("text/plain");
            if (entryId) {
              const point = getCanvasPoint(event, configRef.current);
              placeEntry(entryId, point.x, point.y);
            }
          }}
        >
          <div
            className="chips-infinite-canvas-editor__world"
            style={{
              transform: `translate(${config.props.defaultView.x}px, ${config.props.defaultView.y}px) scale(${config.props.defaultView.zoom})`,
            }}
          >
            {config.props.background.mode === "image" && config.props.background.assetPath ? (
              <div
                className="chips-infinite-canvas-editor__background"
                style={{
                  width: config.props.background.width ?? 960,
                  height: config.props.background.height ?? 600,
                  opacity: config.props.background.opacity ?? 1,
                }}
              >
                <BackgroundPreview
                  config={config}
                  locale={locale}
                  readBoxAsset={readBoxAsset}
                />
              </div>
            ) : null}
            {entries.filter((entry) => config.props.items[entry.entryId]).map((entry) => {
              const item = config.props.items[entry.entryId] as CanvasItemConfig;
              return (
                <div
                  key={entry.entryId}
                  className="chips-infinite-canvas-editor__node"
                  data-editor-entry-id={entry.entryId}
                  data-active={selectedPlacedId === entry.entryId ? "true" : undefined}
                  style={{ left: item.x, top: item.y }}
                  onPointerDown={(event) => handleNodePointerDown(event, entry.entryId)}
                  onPointerMove={handleNodePointerMove}
                  onPointerUp={handleNodePointerUp}
                  onPointerCancel={handleNodePointerUp}
                >
                  <span className="chips-infinite-canvas-editor__node-dot" aria-hidden="true" />
                  <span className="chips-infinite-canvas-editor__node-title">{item.labelOverride ?? resolveEntryTitle(entry)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

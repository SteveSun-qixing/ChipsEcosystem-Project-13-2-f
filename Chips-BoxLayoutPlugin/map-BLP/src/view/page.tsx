import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmbeddedDocumentFrame } from "@chips/component-library";
import {
  hasCustomMapImage,
  hasFrameRegionContent,
  isValidBounds,
  isValidLatitude,
  isValidLongitude,
  type FrameRegionConfig,
  type GeoPoint,
  type LayoutConfig,
} from "../schema/layout-config";
import type {
  BoxEntryCoverView,
  BoxEntryPage,
  BoxEntrySnapshot,
  BoxLayoutRuntime,
  ResolvedRuntimeResource,
} from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";

const PAGE_LIMIT = 120;

export interface LayoutViewProps {
  initialView: BoxEntryPage;
  config: LayoutConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
}

interface ResourceState {
  status: "idle" | "loading" | "ready" | "error";
  resource?: ResolvedRuntimeResource;
}

interface CoverState {
  status: "idle" | "loading" | "ready" | "error";
  view?: BoxEntryCoverView;
}

interface PositionedEntry {
  entry: BoxEntrySnapshot;
  location: LayoutConfig["props"]["entries"][string];
  label: string;
  x: number;
  y: number;
}

const MAP_LAYOUT_STYLE = `
[data-scope="chips-box-map-layout"] {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  box-sizing: border-box;
  color: var(--chips-sys-color-on-surface);
  background: var(--chips-sys-color-surface);
  font: var(--chips-comp-text-root-font, inherit);
}

[data-scope="chips-box-map-layout"],
[data-scope="chips-box-map-layout"] * {
  box-sizing: border-box;
}

[data-scope="chips-box-map-layout"] [data-layout-shell] {
  position: relative;
  display: grid;
  gap: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  min-width: 0;
  min-height: 100%;
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
}

[data-scope="chips-box-map-layout"] [data-layout-top-region] {
  min-width: 0;
  min-block-size: clamp(120px, 20vw, 240px);
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

[data-scope="chips-box-map-layout"] [data-frame-region],
[data-scope="chips-box-map-layout"] [data-frame-region] [data-part="root"],
[data-scope="chips-box-map-layout"] [data-frame-region] [data-part="frame-container"],
[data-scope="chips-box-map-layout"] [data-frame-region] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-map-layout"] [data-frame-region-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

[data-scope="chips-box-map-layout"] [data-map-stage] {
  position: relative;
  min-width: 0;
  min-height: clamp(420px, 66vh, 760px);
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  isolation: isolate;
}

[data-scope="chips-box-map-layout"] [data-map-world] {
  position: absolute;
  inset: 0;
  transform-origin: center;
  transition: transform 180ms ease;
}

[data-scope="chips-box-map-layout"] [data-map-default-image] {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 34%, color-mix(in srgb, var(--chips-sys-color-primary, #2563eb) 18%, transparent) 0 10%, transparent 11%),
    radial-gradient(circle at 72% 46%, color-mix(in srgb, var(--chips-sys-color-tertiary, #0f766e) 22%, transparent) 0 13%, transparent 14%),
    radial-gradient(circle at 48% 72%, color-mix(in srgb, var(--chips-sys-color-secondary, #7c3aed) 16%, transparent) 0 11%, transparent 12%),
    linear-gradient(120deg, transparent 0 44%, color-mix(in srgb, var(--chips-sys-color-primary, #2563eb) 14%, transparent) 45% 47%, transparent 48%),
    linear-gradient(35deg, transparent 0 52%, color-mix(in srgb, var(--chips-sys-color-tertiary, #0f766e) 14%, transparent) 53% 55%, transparent 56%),
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--chips-sys-color-outline, #64748b) 16%, transparent) 0 1px, transparent 1px 11.111%),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--chips-sys-color-outline, #64748b) 16%, transparent) 0 1px, transparent 1px 11.111%),
    var(--chips-sys-color-surface-container-low, #f8fafc);
}

[data-scope="chips-box-map-layout"] [data-map-asset-image] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

[data-scope="chips-box-map-layout"] [data-map-unavailable],
[data-scope="chips-box-map-layout"] [data-map-asset-status],
[data-scope="chips-box-map-layout"] [data-layout-empty],
[data-scope="chips-box-map-layout"] [data-layout-page-error] {
  display: grid;
  place-items: center;
  min-height: 120px;
  padding: var(--chips-base-space-4);
  text-align: center;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
}

[data-scope="chips-box-map-layout"] [data-map-markers] {
  position: absolute;
  inset: 0;
}

[data-scope="chips-box-map-layout"] [data-map-marker] {
  position: absolute;
  left: var(--marker-x);
  top: var(--marker-y);
  display: inline-flex;
  align-items: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-height: 32px;
  max-width: min(280px, 48vw);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: 999px;
  padding: var(--chips-base-space-1) var(--chips-base-space-3);
  color: var(--chips-sys-color-on-surface);
  background: color-mix(in srgb, var(--chips-sys-color-surface, #fff) 92%, transparent);
  box-shadow: var(--chips-elevation-shadow-md, 0 8px 20px rgba(15, 23, 42, 0.12));
  font: inherit;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}

[data-scope="chips-box-map-layout"] [data-map-marker][data-marker-style="pin-title"] {
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
}

[data-scope="chips-box-map-layout"] [data-map-marker][data-selected="true"] {
  border-color: var(--chips-sys-color-primary, currentColor);
  box-shadow: var(--chips-elevation-shadow-lg, 0 14px 28px rgba(15, 23, 42, 0.18));
  transform: translate(-50%, -50%) scale(1.04);
  z-index: 3;
}

[data-scope="chips-box-map-layout"] [data-map-marker-dot] {
  inline-size: 10px;
  block-size: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--chips-sys-color-primary, currentColor);
}

[data-scope="chips-box-map-layout"] [data-map-marker][data-marker-style="pin-title"] [data-map-marker-dot] {
  inline-size: 12px;
  block-size: 12px;
  border-radius: 999px 999px 999px 2px;
  transform: rotate(-45deg);
}

[data-scope="chips-box-map-layout"] [data-map-marker-label] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
}

[data-scope="chips-box-map-layout"] [data-map-controls] {
  position: absolute;
  inset-block-start: var(--chips-base-space-3);
  inset-inline-end: var(--chips-base-space-3);
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
}

[data-scope="chips-box-map-layout"] [data-map-controls] button,
[data-scope="chips-box-map-layout"] [data-map-marker],
[data-scope="chips-box-map-layout"] [data-layout-load-more],
[data-scope="chips-box-map-layout"] [data-layout-retry],
[data-scope="chips-box-map-layout"] [data-unlocated-entry] {
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
}

[data-scope="chips-box-map-layout"] [data-map-controls] button,
[data-scope="chips-box-map-layout"] [data-layout-load-more],
[data-scope="chips-box-map-layout"] [data-layout-retry],
[data-scope="chips-box-map-layout"] [data-unlocated-entry] {
  min-height: 36px;
  border-radius: var(--chips-comp-button-root-radius, var(--chips-base-radius-md));
  padding-inline: var(--chips-base-space-3);
  background: var(--chips-comp-button-root-surface-idle, var(--chips-sys-color-surface));
  color: var(--chips-comp-button-label-color-idle, var(--chips-sys-color-on-surface));
  font: inherit;
  cursor: pointer;
}

[data-scope="chips-box-map-layout"] [data-map-selected] {
  position: absolute;
  inset-inline: var(--chips-base-space-3);
  inset-block-end: var(--chips-base-space-3);
  z-index: 4;
  display: grid;
  grid-template-columns: minmax(0, 120px) minmax(0, 1fr);
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  max-width: min(520px, calc(100% - var(--chips-base-space-6, 48px)));
  padding: var(--chips-base-space-3);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background: color-mix(in srgb, var(--chips-sys-color-surface, #fff) 94%, transparent);
  box-shadow: var(--chips-elevation-shadow-lg, 0 14px 28px rgba(15, 23, 42, 0.18));
}

[data-scope="chips-box-map-layout"] [data-selected-cover] {
  min-width: 0;
  overflow: hidden;
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background: var(--chips-sys-color-surface);
  aspect-ratio: 3 / 4;
}

[data-scope="chips-box-map-layout"] [data-selected-cover] [data-scope="embedded-document-frame"],
[data-scope="chips-box-map-layout"] [data-selected-cover] [data-part="root"],
[data-scope="chips-box-map-layout"] [data-selected-cover] [data-part="frame-container"],
[data-scope="chips-box-map-layout"] [data-selected-cover] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-map-layout"] [data-selected-cover-status] {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: var(--chips-base-space-2);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  text-align: center;
}

[data-scope="chips-box-map-layout"] [data-selected-body] {
  display: grid;
  align-content: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

[data-scope="chips-box-map-layout"] [data-selected-title] {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

[data-scope="chips-box-map-layout"] [data-selected-summary] {
  margin: 0;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
}

[data-scope="chips-box-map-layout"] [data-selected-actions] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
}

[data-scope="chips-box-map-layout"] [data-selected-actions] button {
  min-height: 36px;
  border: none;
  border-radius: var(--chips-comp-button-root-radius, var(--chips-base-radius-md));
  padding-inline: var(--chips-base-space-3);
  color: var(--chips-comp-button-label-color-idle, var(--chips-sys-color-on-surface));
  background: var(--chips-comp-button-root-surface-idle, var(--chips-sys-color-surface-container-high, #e2e8f0));
  font: inherit;
  cursor: pointer;
}

[data-scope="chips-box-map-layout"] [data-unlocated] {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

[data-scope="chips-box-map-layout"] [data-unlocated-list] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

[data-scope="chips-box-map-layout"] [data-layout-footer] {
  display: flex;
  justify-content: center;
  align-items: center;
}

[data-scope="chips-box-map-layout"] button:focus-visible,
[data-scope="chips-box-map-layout"] [data-map-marker]:focus-visible {
  outline: var(--chips-layout-focus-outline-width, 2px) solid var(--chips-comp-button-focus-outline, currentColor);
  outline-offset: var(--chips-layout-focus-outline-offset, 2px);
}

@media (max-width: 640px) {
  [data-scope="chips-box-map-layout"] [data-layout-shell] {
    padding: var(--chips-base-space-3);
  }

  [data-scope="chips-box-map-layout"] [data-map-stage] {
    min-height: 520px;
  }

  [data-scope="chips-box-map-layout"] [data-map-selected] {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
}

function appendUniqueEntries(current: BoxEntrySnapshot[], incoming: BoxEntrySnapshot[]): BoxEntrySnapshot[] {
  const seen = new Set(current.map((entry) => entry.entryId));
  const next = [...current];
  for (const entry of incoming) {
    if (!seen.has(entry.entryId)) {
      seen.add(entry.entryId);
      next.push(entry);
    }
  }
  return next;
}

function projectPoint(point: GeoPoint, config: LayoutConfig): { x: number; y: number } | undefined {
  const bounds = config.props.mapSource.bounds;
  if (!isValidBounds(bounds) || !isValidLatitude(point.latitude) || !isValidLongitude(point.longitude)) {
    return undefined;
  }
  const x = ((point.longitude - bounds.west) / (bounds.east - bounds.west)) * 100;
  const y = ((bounds.north - point.latitude) / (bounds.north - bounds.south)) * 100;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined;
  }
  return {
    x,
    y,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function FrameRegionSurface({
  region,
  runtime,
  locale,
  title,
  ratio,
}: {
  region: FrameRegionConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
  title: string;
  ratio: string;
}) {
  const [state, setState] = useState<ResourceState>({ status: "idle" });

  useEffect(() => {
    if (region.mode !== "image" || !region.assetPath) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void runtime.readBoxAsset(region.assetPath)
      .then((resource) => {
        if (!cancelled) {
          setState({ status: "ready", resource });
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
  }, [region.assetPath, region.mode, runtime]);

  if (region.mode === "html") {
    return (
      <div data-frame-region>
        <EmbeddedDocumentFrame title={title} srcDoc={region.html ?? ""} ratio={ratio} />
      </div>
    );
  }

  if (region.mode !== "image") {
    return null;
  }

  if (state.status === "ready" && state.resource?.resourceUrl) {
    return (
      <div data-frame-region>
        <img data-frame-region-image src={state.resource.resourceUrl} alt={title} />
      </div>
    );
  }

  return (
    <div data-map-asset-status role="status">
      {state.status === "loading"
        ? getLayoutMessage(locale, "layout.asset_loading")
        : getLayoutMessage(locale, "layout.asset_error")}
    </div>
  );
}

function MapAssetLayer({
  config,
  runtime,
  locale,
}: {
  config: LayoutConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
}) {
  const [state, setState] = useState<ResourceState>({ status: "idle" });
  const assetPath = config.props.mapSource.assetPath;

  useEffect(() => {
    if (!hasCustomMapImage(config.props.mapSource) || !assetPath) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void runtime.readBoxAsset(assetPath)
      .then((resource) => {
        if (!cancelled) {
          setState({ status: "ready", resource });
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
  }, [assetPath, config.props.mapSource, runtime]);

  if (state.status === "ready" && state.resource?.resourceUrl) {
    return <img data-map-asset-image src={state.resource.resourceUrl} alt={getLayoutMessage(locale, "layout.map_image_alt")} />;
  }

  return (
    <>
      <div data-map-default-image aria-hidden="true" />
      {state.status === "loading" || state.status === "error" ? (
        <div data-map-asset-status role="status">
          {state.status === "loading"
            ? getLayoutMessage(locale, "layout.asset_loading")
            : getLayoutMessage(locale, "layout.asset_error")}
        </div>
      ) : null}
    </>
  );
}

function SelectedEntryPreview({
  entry,
  runtime,
  locale,
  showCover,
  onClose,
}: {
  entry: BoxEntrySnapshot;
  runtime: BoxLayoutRuntime;
  locale?: string;
  showCover: boolean;
  onClose(): void;
}) {
  const [coverState, setCoverState] = useState<CoverState>({ status: "idle" });

  useEffect(() => {
    if (!showCover || entry.snapshot.cover?.mode === "none") {
      setCoverState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setCoverState({ status: "loading" });
    void runtime.renderEntryCover(entry.entryId)
      .then((view) => {
        if (!cancelled) {
          setCoverState({ status: "ready", view });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoverState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entry.entryId, entry.snapshot.cover?.mode, runtime, showCover]);

  const title = resolveEntryTitle(entry);
  const openEntry = () => {
    void runtime.openEntry(entry.entryId);
  };

  return (
    <aside data-map-selected data-entry-id={entry.entryId}>
      {showCover ? (
        <div data-selected-cover>
          {coverState.status === "ready" && coverState.view?.coverUrl ? (
            <EmbeddedDocumentFrame
              title={coverState.view.title || title}
              src={coverState.view.coverUrl}
              ratio={coverState.view.ratio ?? "3:4"}
              onActivate={openEntry}
            />
          ) : (
            <div data-selected-cover-status role={coverState.status === "loading" ? "status" : undefined}>
              {coverState.status === "loading"
                ? getLayoutMessage(locale, "layout.loading")
                : coverState.status === "error"
                  ? getLayoutMessage(locale, "layout.cover_error")
                  : getLayoutMessage(locale, "layout.cover_missing")}
            </div>
          )}
        </div>
      ) : null}
      <div data-selected-body>
        <h2 data-selected-title>{title}</h2>
        {entry.snapshot.summary ? <p data-selected-summary>{entry.snapshot.summary}</p> : null}
        <div data-selected-actions>
          <button type="button" onClick={openEntry}>{getLayoutMessage(locale, "layout.open_entry")}</button>
          <button type="button" onClick={onClose}>{getLayoutMessage(locale, "layout.close_preview")}</button>
        </div>
      </div>
    </aside>
  );
}

export function LayoutViewPage({ initialView, config, runtime, locale }: LayoutViewProps) {
  const isMountedRef = useRef(true);
  const [items, setItems] = useState<BoxEntrySnapshot[]>(initialView.items);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialView.nextCursor);
  const [total, setTotal] = useState(initialView.total);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>();
  const [viewState, setViewState] = useState(() => ({
    center: config.props.defaultView,
    zoom: config.props.defaultView.zoom,
  }));

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setItems(initialView.items);
    setNextCursor(initialView.nextCursor);
    setTotal(initialView.total);
    setIsLoadingNext(false);
    setPageError(false);
    setSelectedEntryId(undefined);
  }, [initialView]);

  useEffect(() => {
    setViewState({
      center: config.props.defaultView,
      zoom: config.props.defaultView.zoom,
    });
  }, [config.props.defaultView]);

  const enabledEntries = useMemo(
    () => items.filter((entry) => entry.enabled),
    [items],
  );
  const positionedEntries = useMemo<PositionedEntry[]>(() => {
    return enabledEntries.flatMap((entry) => {
      const location = config.props.entries[entry.entryId];
      if (!location) {
        return [];
      }
      const projected = projectPoint(location, config);
      if (!projected) {
        return [];
      }
      return [{
        entry,
        location,
        label: location.labelOverride ?? resolveEntryTitle(entry),
        x: projected.x,
        y: projected.y,
      }];
    });
  }, [config, enabledEntries]);
  const locatedIds = useMemo(
    () => new Set(positionedEntries.map((item) => item.entry.entryId)),
    [positionedEntries],
  );
  const unlocatedEntries = useMemo(
    () => enabledEntries.filter((entry) => !locatedIds.has(entry.entryId)),
    [enabledEntries, locatedIds],
  );
  const selectedEntry = selectedEntryId
    ? enabledEntries.find((entry) => entry.entryId === selectedEntryId)
    : undefined;
  const hasTopRegion = hasFrameRegionContent(config.props.topRegion);
  const centerProjection = projectPoint(viewState.center, config) ?? { x: 50, y: 50 };
  const translateX = 50 - centerProjection.x;
  const translateY = 50 - centerProjection.y;
  const mapTransform = `translate(${translateX}%, ${translateY}%) scale(${viewState.zoom})`;

  const loadNextPage = useCallback(async () => {
    if (!nextCursor || isLoadingNext) {
      return;
    }

    setIsLoadingNext(true);
    setPageError(false);
    try {
      const page = await runtime.listEntries({
        cursor: nextCursor,
        limit: PAGE_LIMIT,
      });
      if (!page || !Array.isArray(page.items)) {
        throw new Error("Invalid box entry page.");
      }
      if (!isMountedRef.current) {
        return;
      }
      setItems((current) => appendUniqueEntries(current, page.items));
      setNextCursor(page.nextCursor);
      setTotal(page.total);
    } catch {
      if (isMountedRef.current) {
        setPageError(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingNext(false);
      }
    }
  }, [isLoadingNext, nextCursor, runtime]);

  const resetView = () => {
    setViewState({
      center: config.props.defaultView,
      zoom: config.props.defaultView.zoom,
    });
  };

  const panView = (deltaLatitude: number, deltaLongitude: number) => {
    setViewState((current) => ({
      ...current,
      center: {
        ...current.center,
        latitude: clamp(current.center.latitude + deltaLatitude, -90, 90),
        longitude: clamp(current.center.longitude + deltaLongitude, -180, 180),
      },
    }));
  };

  const zoomView = (delta: number) => {
    setViewState((current) => ({
      ...current,
      zoom: clamp(Number((current.zoom + delta).toFixed(2)), 0.5, 8),
    }));
  };

  return (
    <section data-scope="chips-box-map-layout">
      <style>{MAP_LAYOUT_STYLE}</style>
      <div data-layout-shell>
        {hasTopRegion ? (
          <div data-layout-top-region>
            <FrameRegionSurface
              region={config.props.topRegion}
              runtime={runtime}
              locale={locale}
              title={getLayoutMessage(locale, "layout.top_region_title")}
              ratio="16:5"
            />
          </div>
        ) : null}

        <div data-map-stage>
          {config.props.mapSource.mode === "host-map" ? (
            <div data-map-unavailable role="status">
              {getLayoutMessage(locale, "layout.host_map_unavailable")}
            </div>
          ) : (
            <div data-map-world style={{ transform: mapTransform }}>
              <MapAssetLayer config={config} runtime={runtime} locale={locale} />
              <div data-map-markers>
                {positionedEntries.map((item) => {
                  const selected = selectedEntryId === item.entry.entryId;
                  return (
                    <button
                      key={item.entry.entryId}
                      type="button"
                      data-map-marker
                      data-marker-style={config.props.markerStyle}
                      data-selected={selected ? "true" : undefined}
                      data-entry-id={item.entry.entryId}
                      style={{
                        "--marker-x": `${item.x}%`,
                        "--marker-y": `${item.y}%`,
                      } as React.CSSProperties}
                      title={item.label}
                      onClick={() => {
                        if (selected) {
                          void runtime.openEntry(item.entry.entryId);
                          return;
                        }
                        setSelectedEntryId(item.entry.entryId);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (selected) {
                            void runtime.openEntry(item.entry.entryId);
                          } else {
                            setSelectedEntryId(item.entry.entryId);
                          }
                        }
                      }}
                    >
                      <span data-map-marker-dot aria-hidden="true" />
                      <span data-map-marker-label>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div data-map-controls aria-label={getLayoutMessage(locale, "layout.map_controls")}>
            <button type="button" onClick={() => zoomView(0.25)} aria-label={getLayoutMessage(locale, "layout.zoom_in")}>+</button>
            <button type="button" onClick={() => zoomView(-0.25)} aria-label={getLayoutMessage(locale, "layout.zoom_out")}>-</button>
            <button type="button" onClick={() => panView(5, 0)} aria-label={getLayoutMessage(locale, "layout.pan_north")}>↑</button>
            <button type="button" onClick={() => panView(-5, 0)} aria-label={getLayoutMessage(locale, "layout.pan_south")}>↓</button>
            <button type="button" onClick={() => panView(0, -5)} aria-label={getLayoutMessage(locale, "layout.pan_west")}>←</button>
            <button type="button" onClick={() => panView(0, 5)} aria-label={getLayoutMessage(locale, "layout.pan_east")}>→</button>
            <button type="button" onClick={resetView}>{getLayoutMessage(locale, "layout.reset_view")}</button>
          </div>

          {enabledEntries.length === 0 ? (
            <div data-layout-empty>
              <strong>{getLayoutMessage(locale, "layout.empty")}</strong>
              <span>{getLayoutMessage(locale, "layout.empty_hint")}</span>
            </div>
          ) : null}

          {selectedEntry ? (
            <SelectedEntryPreview
              entry={selectedEntry}
              runtime={runtime}
              locale={locale}
              showCover={config.props.showCoverOnSelect}
              onClose={() => setSelectedEntryId(undefined)}
            />
          ) : null}
        </div>

        {unlocatedEntries.length > 0 ? (
          <section data-unlocated aria-label={getLayoutMessage(locale, "layout.unlocated_title")}>
            <strong>{getLayoutMessage(locale, "layout.unlocated_title")}</strong>
            <div data-unlocated-list>
              {unlocatedEntries.map((entry) => (
                <button
                  key={entry.entryId}
                  type="button"
                  data-unlocated-entry
                  onClick={() => {
                    void runtime.openEntry(entry.entryId);
                  }}
                >
                  {resolveEntryTitle(entry)}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {nextCursor || pageError ? (
          <div data-layout-footer data-total={total}>
            {pageError ? (
              <div data-layout-page-error role="status">
                <span>{getLayoutMessage(locale, "layout.page_error")}</span>
                <button type="button" data-layout-retry onClick={loadNextPage}>
                  {getLayoutMessage(locale, "layout.retry")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-layout-load-more
                onClick={loadNextPage}
                disabled={isLoadingNext}
              >
                {isLoadingNext
                  ? getLayoutMessage(locale, "layout.loading_more")
                  : getLayoutMessage(locale, "layout.load_more")}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

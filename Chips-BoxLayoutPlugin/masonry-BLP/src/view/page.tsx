import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmbeddedDocumentFrame } from "@chips/component-library";
import { hasFrameRegionContent, type FrameRegionConfig, type LayoutConfig } from "../schema/layout-config";
import type {
  BoxEntryCoverView,
  BoxEntryPage,
  BoxEntrySnapshot,
  BoxLayoutRuntime,
  ResolvedRuntimeResource,
} from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";

const DEFAULT_PAGE_LIMIT = 120;

export interface LayoutViewProps {
  initialView: BoxEntryPage;
  config: LayoutConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
}

interface CoverState {
  status: "idle" | "loading" | "ready" | "error";
  view?: BoxEntryCoverView;
}

interface FrameRegionState {
  status: "idle" | "loading" | "ready" | "error";
  resource?: ResolvedRuntimeResource;
}

const MASONRY_LAYOUT_STYLE = `
[data-scope="chips-box-masonry-layout"] {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  box-sizing: border-box;
  color: var(--chips-sys-color-on-surface);
  background-color: var(--chips-sys-color-surface);
}

[data-scope="chips-box-masonry-layout"] [data-layout-background] {
  position: sticky;
  top: 0;
  width: 100%;
  block-size: 100vh;
  margin-block-end: -100vh;
  pointer-events: none;
}

[data-scope="chips-box-masonry-layout"] [data-layout-shell] {
  position: relative;
  display: grid;
  gap: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  min-width: 0;
  min-height: 100%;
  box-sizing: border-box;
}

[data-scope="chips-box-masonry-layout"] [data-layout-top-region] {
  min-width: 0;
  min-block-size: clamp(132px, 24vw, 288px);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  overflow: hidden;
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
}

[data-scope="chips-box-masonry-layout"] [data-frame-region],
[data-scope="chips-box-masonry-layout"] [data-frame-region] [data-part="root"],
[data-scope="chips-box-masonry-layout"] [data-frame-region] [data-part="frame-container"],
[data-scope="chips-box-masonry-layout"] [data-frame-region] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-masonry-layout"] [data-frame-region-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

[data-scope="chips-box-masonry-layout"] [data-frame-region-status],
[data-scope="chips-box-masonry-layout"] [data-masonry-cover-placeholder],
[data-scope="chips-box-masonry-layout"] [data-layout-empty],
[data-scope="chips-box-masonry-layout"] [data-layout-page-error] {
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
}

[data-scope="chips-box-masonry-layout"] [data-layout-masonry] {
  display: grid;
  grid-template-columns: repeat(var(--chips-masonry-column-count, 3), minmax(0, 1fr));
  gap: var(--chips-masonry-gap, var(--chips-layout-gap-md, var(--chips-base-space-3)));
  align-items: start;
  min-width: 0;
  align-content: start;
}

[data-scope="chips-box-masonry-layout"] [data-layout-masonry][data-empty="true"] {
  grid-template-columns: minmax(0, 1fr);
}

[data-scope="chips-box-masonry-layout"] [data-masonry-column] {
  display: grid;
  align-content: start;
  gap: var(--chips-masonry-gap, var(--chips-layout-gap-md, var(--chips-base-space-3)));
  min-width: 0;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-entry] {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
  align-content: start;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-cover-shell] {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
}

[data-scope="chips-box-masonry-layout"] [data-masonry-cover-shell] [data-scope="embedded-document-frame"] {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-cover-shell] [data-part="frame-container"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-cover-shell] [data-part="iframe"] {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  pointer-events: none;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-cover-shell] [data-part="status"] {
  display: none;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-cover-placeholder] {
  width: 100%;
  min-height: 160px;
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  padding: var(--chips-base-space-4);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  text-align: center;
  cursor: pointer;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-cover-placeholder-title] {
  color: var(--chips-sys-color-on-surface);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
  line-height: var(--chips-comp-text-root-line-height, 1.5);
}

[data-scope="chips-box-masonry-layout"] [data-masonry-cover-placeholder-text],
[data-scope="chips-box-masonry-layout"] [data-masonry-cover-placeholder-kind] {
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

[data-scope="chips-box-masonry-layout"] [data-masonry-entry-title],
[data-scope="chips-box-masonry-layout"] [data-layout-load-more],
[data-scope="chips-box-masonry-layout"] [data-layout-retry] {
  border: none;
  margin: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-entry-title] {
  padding: 0;
  color: var(--chips-sys-color-on-surface);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
  line-height: var(--chips-comp-text-root-line-height, 1.5);
  text-align: start;
  width: 100%;
  min-width: 0;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-entry][data-title-mode="overlay"] {
  position: relative;
}

[data-scope="chips-box-masonry-layout"] [data-masonry-entry][data-title-mode="overlay"] [data-masonry-entry-meta] {
  position: absolute;
  inset-inline: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  inset-block-end: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  display: grid;
  gap: var(--chips-layout-gap-xs, 4px);
  padding: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background: color-mix(in srgb, var(--chips-sys-color-surface, #fff) 88%, transparent);
}

[data-scope="chips-box-masonry-layout"] [data-masonry-entry-summary] {
  margin: 0;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
  line-height: 1.45;
}

[data-scope="chips-box-masonry-layout"] [data-layout-footer] {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

[data-scope="chips-box-masonry-layout"] [data-layout-load-more],
[data-scope="chips-box-masonry-layout"] [data-layout-retry] {
  min-block-size: var(--chips-layout-density-comfortable, 40px);
  padding-inline: var(--chips-base-space-4);
  padding-block: var(--chips-base-space-2);
  border-radius: var(--chips-comp-button-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-button-root-surface-idle);
  color: var(--chips-comp-button-label-color-idle, var(--chips-sys-color-on-surface));
}

[data-scope="chips-box-masonry-layout"] [data-layout-load-more]:disabled {
  cursor: default;
  color: var(--chips-comp-button-label-color-disabled, var(--chips-sys-color-on-surface-muted));
  background-color: var(--chips-comp-button-root-surface-disabled);
}

[data-scope="chips-box-masonry-layout"] [data-layout-empty],
[data-scope="chips-box-masonry-layout"] [data-layout-page-error],
[data-scope="chips-box-masonry-layout"] [data-frame-region-status] {
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-height: 160px;
  padding: var(--chips-base-space-4);
  text-align: center;
}

[data-scope="chips-box-masonry-layout"] [data-layout-empty-title] {
  color: var(--chips-sys-color-on-surface);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
}

[data-scope="chips-box-masonry-layout"] [data-masonry-entry-title]:focus-visible,
[data-scope="chips-box-masonry-layout"] [data-masonry-cover-placeholder]:focus-visible,
[data-scope="chips-box-masonry-layout"] [data-layout-load-more]:focus-visible,
[data-scope="chips-box-masonry-layout"] [data-layout-retry]:focus-visible {
  outline: var(--chips-layout-focus-outline-width, 2px) solid var(--chips-comp-button-focus-outline, currentColor);
  outline-offset: var(--chips-layout-focus-outline-offset, 2px);
}

@media (max-width: 720px) {
  [data-scope="chips-box-masonry-layout"] [data-layout-masonry] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
}

function resolveEntryKindMessage(entry: BoxEntrySnapshot, locale?: string): string {
  if (entry.snapshot.contentType === "chips/box") {
    return getLayoutMessage(locale, "layout.entry_type_box");
  }
  return getLayoutMessage(locale, "layout.entry_type_card");
}

function toCssAspectRatio(value: string | number | undefined, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value}`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.includes(":") ? value.trim().replace(":", " / ") : value.trim();
  }

  return fallback.includes(":") ? fallback.replace(":", " / ") : fallback;
}

function toRatioToken(value: string | number | undefined, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value}`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
}

function sortEntries(
  entries: BoxEntrySnapshot[],
  sortMode: LayoutConfig["props"]["sortMode"],
  locale?: string
): BoxEntrySnapshot[] {
  if (sortMode === "manual") {
    return entries;
  }

  const direction = sortMode === "name-desc" ? -1 : 1;
  const compareLocale = locale === "zh-CN" ? "zh-CN" : "en-US";

  return [...entries].sort((left, right) => {
    const compared = resolveEntryTitle(left).localeCompare(resolveEntryTitle(right), compareLocale);
    if (compared !== 0) {
      return compared * direction;
    }
    return left.entryId.localeCompare(right.entryId);
  });
}

function appendUniqueEntries(
  current: BoxEntrySnapshot[],
  incoming: BoxEntrySnapshot[]
): BoxEntrySnapshot[] {
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

function resolveColumnCount(columnMode: LayoutConfig["props"]["columnMode"], itemCount: number): number {
  const target = columnMode === "compact" ? 4 : columnMode === "wide" ? 2 : 3;
  return Math.max(1, Math.min(target, Math.max(1, itemCount)));
}

function estimateEntryHeight(entry: BoxEntrySnapshot, config: LayoutConfig): number {
  const ratio = typeof entry.layoutHints?.aspectRatio === "number" && Number.isFinite(entry.layoutHints.aspectRatio) && entry.layoutHints.aspectRatio > 0
    ? entry.layoutHints.aspectRatio
    : 0.75;
  const coverHeight = 1 / ratio;
  const titleHeight = config.props.titleMode === "hidden" ? 0 : 0.18;
  const summaryHeight = config.props.showSummary && entry.snapshot.summary ? 0.22 : 0;
  return coverHeight + titleHeight + summaryHeight;
}

export function buildMasonryColumns(
  entries: BoxEntrySnapshot[],
  config: LayoutConfig
): BoxEntrySnapshot[][] {
  const columnCount = resolveColumnCount(config.props.columnMode, entries.length);
  const columns = Array.from({ length: columnCount }, () => [] as BoxEntrySnapshot[]);
  const heights = Array.from({ length: columnCount }, () => 0);

  for (const entry of entries) {
    let targetIndex = 0;
    for (let index = 1; index < heights.length; index += 1) {
      if ((heights[index] ?? Number.POSITIVE_INFINITY) < (heights[targetIndex] ?? Number.POSITIVE_INFINITY)) {
        targetIndex = index;
      }
    }
    const targetColumn = columns[targetIndex];
    if (targetColumn) {
      targetColumn.push(entry);
      heights[targetIndex] = (heights[targetIndex] ?? 0) + estimateEntryHeight(entry, config);
    }
  }

  return columns;
}

function FrameRegionSurface({
  region,
  runtime,
  locale,
  title,
  ratio,
  decorative = false,
}: {
  region: FrameRegionConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
  title: string;
  ratio: string;
  decorative?: boolean;
}) {
  const [state, setState] = useState<FrameRegionState>({ status: "idle" });

  useEffect(() => {
    if (region.mode !== "image" || !region.assetPath) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void runtime
      .readBoxAsset(region.assetPath)
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
        <EmbeddedDocumentFrame
          title={title}
          srcDoc={region.html ?? ""}
          ratio={ratio}
          disabled={decorative}
        />
      </div>
    );
  }

  if (region.mode !== "image") {
    return null;
  }

  if (state.status === "ready" && state.resource?.resourceUrl) {
    return (
      <div data-frame-region>
        <img
          data-frame-region-image
          src={state.resource.resourceUrl}
          alt={decorative ? "" : title}
        />
      </div>
    );
  }

  const message =
    state.status === "loading"
      ? getLayoutMessage(locale, "layout.asset_loading")
      : getLayoutMessage(locale, "layout.asset_error");

  return (
    <div data-frame-region-status role={decorative ? undefined : "status"}>
      {message}
    </div>
  );
}

function CoverTile({
  entry,
  runtime,
  locale,
}: {
  entry: BoxEntrySnapshot;
  runtime: BoxLayoutRuntime;
  locale?: string;
}) {
  const [coverState, setCoverState] = useState<CoverState>(() => ({
    status: entry.snapshot.cover?.mode === "none" ? "idle" : "loading",
  }));

  useEffect(() => {
    if (entry.snapshot.cover?.mode === "none") {
      setCoverState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setCoverState({ status: "loading" });
    void runtime
      .renderEntryCover(entry.entryId)
      .then((view) => {
        if (!cancelled) {
          setCoverState({
            status: "ready",
            view,
          });
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
  }, [entry.entryId, entry.snapshot.cover?.mode, runtime]);

  const handleOpen = () => {
    void runtime.openEntry(entry.entryId);
  };

  const fallbackRatio = "3:4";
  const aspectRatio = toCssAspectRatio(
    coverState.view?.ratio ?? entry.layoutHints?.aspectRatio,
    fallbackRatio
  );
  const ratioToken = toRatioToken(
    coverState.view?.ratio ?? entry.layoutHints?.aspectRatio,
    fallbackRatio
  );
  const title = resolveEntryTitle(entry);

  if (coverState.status === "ready" && coverState.view?.coverUrl) {
    return (
      <div
        data-masonry-cover-shell
        style={{
          aspectRatio,
        }}
      >
        <EmbeddedDocumentFrame
          title={coverState.view.title || title}
          src={coverState.view.coverUrl}
          ratio={ratioToken}
          onActivate={handleOpen}
        />
      </div>
    );
  }

  const message =
    coverState.status === "loading"
      ? getLayoutMessage(locale, "layout.loading")
      : coverState.status === "error"
        ? getLayoutMessage(locale, "layout.cover_error")
        : getLayoutMessage(locale, "layout.cover_missing");

  return (
    <button
      type="button"
      data-masonry-cover-shell
      data-masonry-cover-placeholder
      data-state={coverState.status}
      style={{
        aspectRatio,
      }}
      onClick={handleOpen}
    >
      <strong data-masonry-cover-placeholder-title>{title}</strong>
      <span data-masonry-cover-placeholder-text>{message}</span>
      <span data-masonry-cover-placeholder-kind>{resolveEntryKindMessage(entry, locale)}</span>
    </button>
  );
}

function EntryCard({
  entry,
  runtime,
  locale,
  config,
}: {
  entry: BoxEntrySnapshot;
  runtime: BoxLayoutRuntime;
  locale?: string;
  config: LayoutConfig;
}) {
  const handleOpen = () => {
    void runtime.openEntry(entry.entryId);
  };
  const title = resolveEntryTitle(entry);

  return (
    <article
      key={entry.entryId}
      data-entry-id={entry.entryId}
      data-masonry-entry
      data-title-mode={config.props.titleMode}
    >
      <CoverTile
        entry={entry}
        runtime={runtime}
        locale={locale}
      />
      {config.props.titleMode !== "hidden" ? (
        <div data-masonry-entry-meta>
          <button
            type="button"
            data-masonry-entry-title
            onClick={handleOpen}
            title={title}
          >
            {title}
          </button>
          {config.props.showSummary && entry.snapshot.summary ? (
            <p data-masonry-entry-summary>{entry.snapshot.summary}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function LayoutViewPage({ initialView, config, runtime, locale }: LayoutViewProps) {
  const isMountedRef = useRef(true);
  const [items, setItems] = useState<BoxEntrySnapshot[]>(initialView.items);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialView.nextCursor);
  const [total, setTotal] = useState(initialView.total);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [pageError, setPageError] = useState(false);

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
  }, [initialView]);

  const enabledEntries = useMemo(
    () => sortEntries(items.filter((entry) => entry.enabled), config.props.sortMode, locale),
    [config.props.sortMode, items, locale]
  );
  const masonryColumns = useMemo(
    () => buildMasonryColumns(enabledEntries, config),
    [config, enabledEntries]
  );
  const prefetchEntries = useMemo(
    () => enabledEntries.slice(0, Math.min(enabledEntries.length, config.props.pageSize)),
    [config.props.pageSize, enabledEntries]
  );
  const hasTopRegion = hasFrameRegionContent(config.props.topRegion);
  const hasBackground = hasFrameRegionContent(config.props.background);

  useEffect(() => {
    if (prefetchEntries.length === 0) {
      return;
    }
    void runtime
      .prefetchEntries({
        entryIds: prefetchEntries.map((entry) => entry.entryId),
        targets: ["cover"],
      })
      .catch(() => undefined);
  }, [prefetchEntries, runtime]);

  const loadNextPage = useCallback(async () => {
    if (!nextCursor || isLoadingNext) {
      return;
    }

    setIsLoadingNext(true);
    setPageError(false);
    try {
      const page = await runtime.listEntries({
        cursor: nextCursor,
        limit: config.props.pageSize || DEFAULT_PAGE_LIMIT,
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
  }, [config.props.pageSize, isLoadingNext, nextCursor, runtime]);

  const gapValue = config.props.gap === "compact"
    ? "var(--chips-layout-gap-sm, var(--chips-base-space-2))"
    : config.props.gap === "spacious"
      ? "var(--chips-layout-gap-xl, var(--chips-base-space-5))"
      : "var(--chips-layout-gap-md, var(--chips-base-space-3))";

  return (
    <section
      data-scope="chips-box-masonry-layout"
      data-column-mode={config.props.columnMode}
      data-gap={config.props.gap}
      data-title-mode={config.props.titleMode}
    >
      <style>{MASONRY_LAYOUT_STYLE}</style>

      {hasBackground ? (
        <div data-layout-background aria-hidden="true">
          <FrameRegionSurface
            region={config.props.background}
            runtime={runtime}
            locale={locale}
            title={getLayoutMessage(locale, "layout.background_title")}
            ratio="16:9"
            decorative
          />
        </div>
      ) : null}

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

        <div
          data-layout-masonry
          data-empty={enabledEntries.length === 0 ? "true" : undefined}
          style={{
            "--chips-masonry-column-count": String(masonryColumns.length || 1),
            "--chips-masonry-gap": gapValue,
          } as React.CSSProperties}
        >
          {enabledEntries.length > 0 ? (
            masonryColumns.map((column, columnIndex) => (
              <div key={columnIndex} data-masonry-column>
                {column.map((entry) => (
                  <EntryCard
                    key={entry.entryId}
                    entry={entry}
                    runtime={runtime}
                    locale={locale}
                    config={config}
                  />
                ))}
              </div>
            ))
          ) : (
            <div data-layout-empty>
              <strong data-layout-empty-title>{getLayoutMessage(locale, "layout.empty")}</strong>
              <span>{getLayoutMessage(locale, "layout.empty_hint")}</span>
            </div>
          )}
        </div>

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

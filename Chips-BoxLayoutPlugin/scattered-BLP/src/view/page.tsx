import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmbeddedDocumentFrame } from "@chips/component-library";
import { hasFrameRegionContent, type FrameRegionConfig, type LayoutConfig } from "../schema/layout-config";
import { createScatterPlacements, orderScatteredEntries } from "../shared/scatter";
import type {
  BoxEntryCoverView,
  BoxEntryPage,
  BoxEntrySnapshot,
  BoxLayoutRuntime,
  ResolvedRuntimeResource,
} from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";

const PAGE_LIMIT = 36;
const COVER_PREFETCH_COUNT = 4;

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
  source?: {
    srcDoc?: string;
  };
}

const SCATTERED_LAYOUT_STYLE = `
[data-scope="chips-box-scattered-layout"] {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  overflow: visible;
  box-sizing: border-box;
  color: var(--chips-sys-color-on-surface, #111827);
  background: var(--chips-sys-color-surface, #ffffff);
}

[data-scope="chips-box-scattered-layout"] * {
  box-sizing: border-box;
}

[data-scope="chips-box-scattered-layout"] [data-layout-background] {
  position: sticky;
  top: 0;
  width: 100%;
  height: 100vh;
  margin-bottom: -100vh;
  z-index: 0;
  pointer-events: none;
}

[data-scope="chips-box-scattered-layout"] [data-layout-background] [data-scope="embedded-document-frame"],
[data-scope="chips-box-scattered-layout"] [data-layout-background] [data-part="root"],
[data-scope="chips-box-scattered-layout"] [data-layout-background] [data-part="frame-container"],
[data-scope="chips-box-scattered-layout"] [data-layout-background] [data-part="iframe"],
[data-scope="chips-box-scattered-layout"] [data-layout-top-region] [data-scope="embedded-document-frame"],
[data-scope="chips-box-scattered-layout"] [data-layout-top-region] [data-part="root"],
[data-scope="chips-box-scattered-layout"] [data-layout-top-region] [data-part="frame-container"],
[data-scope="chips-box-scattered-layout"] [data-layout-top-region] [data-part="iframe"],
[data-scope="chips-box-scattered-layout"] [data-scattered-real-cover] [data-scope="embedded-document-frame"],
[data-scope="chips-box-scattered-layout"] [data-scattered-real-cover] [data-part="root"],
[data-scope="chips-box-scattered-layout"] [data-scattered-real-cover] [data-part="frame-container"],
[data-scope="chips-box-scattered-layout"] [data-scattered-real-cover] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-scattered-layout"] [data-layout-background] [data-part="status"],
[data-scope="chips-box-scattered-layout"] [data-layout-top-region] [data-part="status"],
[data-scope="chips-box-scattered-layout"] [data-scattered-real-cover] [data-part="status"] {
  display: none;
}

[data-scope="chips-box-scattered-layout"] [data-layout-shell] {
  position: relative;
  z-index: 1;
  display: grid;
  gap: var(--chips-layout-gap-lg, 18px);
  min-width: 0;
  min-height: 100%;
  padding: var(--chips-layout-gap-lg, 18px);
}

[data-scope="chips-box-scattered-layout"] [data-layout-top-region] {
  width: 100%;
  min-width: 0;
  min-height: clamp(116px, 20vw, 248px);
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.32));
  border-radius: var(--chips-comp-box-root-radius, 12px);
  background: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface, #ffffff));
}

[data-scope="chips-box-scattered-layout"] [data-frame-region-status] {
  display: grid;
  place-items: center;
  min-height: 128px;
  padding: var(--chips-layout-gap-lg, 18px);
  color: var(--chips-sys-color-on-surface-muted, #64748b);
  text-align: center;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-stage] {
  --scattered-card-width: clamp(190px, 34vw, 320px);
  position: relative;
  display: grid;
  place-items: center;
  min-height: clamp(440px, 68vh, 760px);
  padding: clamp(48px, 8vw, 92px) 18px;
  overflow: visible;
  isolation: isolate;
  outline: none;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-stage][data-card-size="compact"] {
  --scattered-card-width: clamp(168px, 28vw, 252px);
}

[data-scope="chips-box-scattered-layout"] [data-scattered-stage][data-card-size="large"] {
  --scattered-card-width: clamp(220px, 40vw, 380px);
}

[data-scope="chips-box-scattered-layout"] [data-scattered-stack] {
  position: relative;
  width: min(100%, calc(var(--scattered-card-width) + 220px));
  min-height: calc(var(--scattered-card-width) * 1.62);
}

[data-scope="chips-box-scattered-layout"] [data-scattered-fake],
[data-scope="chips-box-scattered-layout"] [data-scattered-real] {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--scattered-card-width);
  aspect-ratio: 3 / 4;
  border-radius: var(--chips-comp-box-root-radius, 12px);
  transform: translate(calc(-50% + var(--scatter-x)), calc(-50% + var(--scatter-y))) rotate(var(--scatter-rotate)) scale(var(--scatter-scale));
  transform-origin: center;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-fake] {
  z-index: var(--scatter-depth);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.12);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.28));
  background: var(--scatter-color);
}

[data-scope="chips-box-scattered-layout"] [data-scattered-real] {
  z-index: 64;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.36));
  box-shadow: 0 22px 58px rgba(15, 23, 42, 0.24);
  background: var(--chips-sys-color-surface, #ffffff);
  transition: transform 240ms ease, box-shadow 240ms ease;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-real-cover] {
  position: relative;
  min-height: 0;
  background: var(--chips-sys-color-surface-muted, #f8fafc);
}

[data-scope="chips-box-scattered-layout"] [data-scattered-cover-placeholder] {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-sm, 8px);
  border: none;
  padding: var(--chips-layout-gap-lg, 18px);
  background: transparent;
  color: var(--chips-sys-color-on-surface, #111827);
  cursor: pointer;
  text-align: center;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-cover-placeholder-title] {
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
  line-height: 1.45;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-cover-placeholder-text] {
  color: var(--chips-sys-color-on-surface-muted, #64748b);
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

[data-scope="chips-box-scattered-layout"] [data-scattered-real-body] {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 12px 14px 14px;
  background: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface, #ffffff));
}

[data-scope="chips-box-scattered-layout"] [data-scattered-title],
[data-scope="chips-box-scattered-layout"] [data-scattered-nav],
[data-scope="chips-box-scattered-layout"] [data-layout-retry] {
  border: none;
  margin: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-title] {
  min-width: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
  color: var(--chips-sys-color-on-surface, #111827);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
  line-height: 1.45;
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-summary] {
  overflow: hidden;
  color: var(--chips-sys-color-on-surface-muted, #64748b);
  font-size: var(--chips-comp-label-root-font-size, 12px);
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-controls] {
  display: flex;
  justify-content: center;
  gap: var(--chips-layout-gap-sm, 8px);
  flex-wrap: wrap;
  min-width: 0;
}

[data-scope="chips-box-scattered-layout"] [data-scattered-nav],
[data-scope="chips-box-scattered-layout"] [data-layout-retry] {
  min-height: 38px;
  padding: 0 14px;
  border-radius: var(--chips-comp-button-root-radius, 10px);
  background: var(--chips-comp-button-root-surface-idle, var(--chips-sys-color-surface, #ffffff));
  color: var(--chips-comp-button-label-color-idle, var(--chips-sys-color-on-surface, #111827));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.32));
}

[data-scope="chips-box-scattered-layout"] [data-scattered-count] {
  display: inline-grid;
  place-items: center;
  min-height: 38px;
  padding: 0 12px;
  color: var(--chips-sys-color-on-surface-muted, #64748b);
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

[data-scope="chips-box-scattered-layout"] [data-layout-empty],
[data-scope="chips-box-scattered-layout"] [data-layout-page-error] {
  position: relative;
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-sm, 8px);
  min-height: clamp(360px, 62vh, 620px);
  overflow: hidden;
  color: var(--chips-sys-color-on-surface-muted, #64748b);
  text-align: center;
}

[data-scope="chips-box-scattered-layout"] [data-empty-fake] {
  position: absolute;
  width: clamp(120px, 26vw, 220px);
  aspect-ratio: 3 / 4;
  border-radius: var(--chips-comp-box-root-radius, 12px);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.24));
  background: var(--scatter-color);
  opacity: 0.48;
}

[data-scope="chips-box-scattered-layout"] [data-layout-empty-title],
[data-scope="chips-box-scattered-layout"] [data-layout-empty-hint],
[data-scope="chips-box-scattered-layout"] [data-layout-page-error] > * {
  position: relative;
  z-index: 1;
}

[data-scope="chips-box-scattered-layout"] [data-layout-empty-title] {
  color: var(--chips-sys-color-on-surface, #111827);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
}

[data-scope="chips-box-scattered-layout"] [data-scattered-title]:focus-visible,
[data-scope="chips-box-scattered-layout"] [data-scattered-cover-placeholder]:focus-visible,
[data-scope="chips-box-scattered-layout"] [data-scattered-nav]:focus-visible,
[data-scope="chips-box-scattered-layout"] [data-layout-retry]:focus-visible,
[data-scope="chips-box-scattered-layout"] [data-scattered-stage]:focus-visible {
  outline: var(--chips-layout-focus-outline-width, 2px) solid var(--chips-sys-color-focus-ring, currentColor);
  outline-offset: var(--chips-layout-focus-outline-offset, 2px);
}

@media (prefers-reduced-motion: reduce) {
  [data-scope="chips-box-scattered-layout"] [data-scattered-real] {
    transition: none;
  }
}
`;

const FAKE_CARD_COLORS = [
  "color-mix(in srgb, var(--chips-sys-color-primary, #2563eb) 24%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-secondary, #16a34a) 24%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-tertiary, #db2777) 22%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-warning, #d97706) 20%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-info, #0891b2) 20%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-success, #059669) 20%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-surface-variant, #e5e7eb) 86%, var(--chips-sys-color-primary, #2563eb))",
];

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

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildImageFrameHtml(imageUrl: string): string {
  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    "  <style>",
    "    html, body { margin: 0; width: 100%; height: 100%; background: transparent; }",
    "    body { overflow: hidden; }",
    "    img { width: 100%; height: 100%; display: block; object-fit: cover; }",
    "  </style>",
    "</head>",
    `  <body><img src="${escapeHtmlAttribute(imageUrl)}" alt="" /></body>`,
    "</html>",
  ].join("\n");
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);
    const handleChange = () => {
      setPrefersReducedMotion(media.matches);
    };
    media.addEventListener?.("change", handleChange);
    return () => {
      media.removeEventListener?.("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
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
  const [state, setState] = useState<FrameRegionState>({ status: "idle" });

  useEffect(() => {
    if (region.mode === "html") {
      setState({ status: "ready", source: { srcDoc: region.html ?? "" } });
      return undefined;
    }

    if (region.mode !== "image" || !region.assetPath) {
      setState({ status: "idle" });
      return undefined;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void runtime
      .readBoxAsset(region.assetPath)
      .then((resource: ResolvedRuntimeResource) => {
        if (!cancelled) {
          setState({
            status: "ready",
            source: { srcDoc: buildImageFrameHtml(resource.resourceUrl) },
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
  }, [region.assetPath, region.html, region.mode, runtime]);

  if (state.status === "ready" && state.source?.srcDoc) {
    return (
      <EmbeddedDocumentFrame
        title={title}
        srcDoc={state.source.srcDoc}
        ratio={ratio}
      />
    );
  }

  if (state.status === "loading" || state.status === "error") {
    return (
      <div data-frame-region-status role="status">
        {getLayoutMessage(locale, state.status === "loading" ? "layout.asset_loading" : "layout.asset_error")}
      </div>
    );
  }

  return null;
}

function TopEntryCard({
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
  const title = resolveEntryTitle(entry);

  useEffect(() => {
    if (entry.snapshot.cover?.mode === "none") {
      setCoverState({ status: "idle" });
      return undefined;
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
  }, [entry.entryId, entry.snapshot.cover?.mode, runtime]);

  const openEntry = () => {
    void runtime.openEntry(entry.entryId);
  };

  const placeholderMessage = coverState.status === "loading"
    ? getLayoutMessage(locale, "layout.loading")
    : coverState.status === "error"
      ? getLayoutMessage(locale, "layout.cover_error")
      : getLayoutMessage(locale, "layout.cover_missing");

  return (
    <article data-scattered-real data-entry-id={entry.entryId}>
      <div data-scattered-real-cover>
        {coverState.status === "ready" && coverState.view?.coverUrl ? (
          <EmbeddedDocumentFrame
            title={coverState.view.title || title}
            src={coverState.view.coverUrl}
            ratio={coverState.view.ratio ?? "3:4"}
            onActivate={openEntry}
          />
        ) : (
          <button
            type="button"
            data-scattered-cover-placeholder
            onClick={openEntry}
            aria-label={`${getLayoutMessage(locale, "layout.open_entry")}: ${title}`}
          >
            <strong data-scattered-cover-placeholder-title>{title}</strong>
            <span data-scattered-cover-placeholder-text>{placeholderMessage}</span>
          </button>
        )}
      </div>
      <div data-scattered-real-body>
        <button
          type="button"
          data-scattered-title
          onClick={openEntry}
          title={title}
          aria-label={`${getLayoutMessage(locale, "layout.open_entry")}: ${title}`}
        >
          {title}
        </button>
        {entry.snapshot.summary ? (
          <span data-scattered-summary>{entry.snapshot.summary}</span>
        ) : null}
      </div>
    </article>
  );
}

function mod(value: number, length: number): number {
  return ((value % length) + length) % length;
}

export function LayoutViewPage({ initialView, config, runtime, locale }: LayoutViewProps) {
  const isMountedRef = useRef(true);
  const wheelTimeRef = useRef(0);
  const [items, setItems] = useState<BoxEntrySnapshot[]>(initialView.items);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialView.nextCursor);
  const [total, setTotal] = useState(initialView.total);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

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
    setActiveIndex(0);
  }, [initialView]);

  const enabledEntries = useMemo(
    () => orderScatteredEntries(
      items.filter((entry) => entry.enabled),
      config.props.sortMode,
      config.props.randomSeed,
      locale,
    ),
    [config.props.randomSeed, config.props.sortMode, items, locale],
  );

  useEffect(() => {
    if (enabledEntries.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((current) => mod(current, enabledEntries.length));
  }, [enabledEntries.length]);

  const activeEntry = enabledEntries.length > 0 ? enabledEntries[mod(activeIndex, enabledEntries.length)] : undefined;
  const hasTopRegion = hasFrameRegionContent(config.props.topRegion);
  const hasBackground = hasFrameRegionContent(config.props.background);
  const shouldAutoCycle = config.props.motion !== "reduced" && !prefersReducedMotion && enabledEntries.length > 1;

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

  const moveActive = useCallback((direction: 1 | -1) => {
    if (enabledEntries.length === 0) {
      return;
    }
    setActiveIndex((current) => {
      const next = mod(current + direction, enabledEntries.length);
      if (direction > 0 && next >= enabledEntries.length - 3 && nextCursor) {
        void loadNextPage();
      }
      return next;
    });
  }, [enabledEntries.length, loadNextPage, nextCursor]);

  useEffect(() => {
    if (!shouldAutoCycle) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      moveActive(1);
    }, config.props.cycleIntervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [config.props.cycleIntervalMs, moveActive, shouldAutoCycle]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        moveActive(1);
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveActive]);

  useEffect(() => {
    if (enabledEntries.length === 0 || !activeEntry) {
      return;
    }
    const entryIds = Array.from({ length: Math.min(COVER_PREFETCH_COUNT, enabledEntries.length) }, (_, index) => {
      const entry = enabledEntries[mod(activeIndex + index, enabledEntries.length)];
      return entry?.entryId;
    }).filter((entryId): entryId is string => typeof entryId === "string");

    void runtime.prefetchEntries({
      entryIds,
      targets: ["cover"],
    }).catch(() => undefined);
  }, [activeEntry, activeIndex, enabledEntries, runtime]);

  const fakePlacements = useMemo(
    () => createScatterPlacements(
      Math.min(config.props.visibleFakeCount, Math.max(0, enabledEntries.length - 1)),
      `${config.props.randomSeed}:${activeEntry?.entryId ?? "empty"}`,
      config.props.spread,
    ),
    [activeEntry?.entryId, config.props.randomSeed, config.props.spread, config.props.visibleFakeCount, enabledEntries.length],
  );

  const emptyPlacements = useMemo(
    () => createScatterPlacements(5, `${config.props.randomSeed}:empty`, "loose"),
    [config.props.randomSeed],
  );

  const handleWheel = (event: React.WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaY) < 18) {
      return;
    }
    const now = Date.now();
    if (now - wheelTimeRef.current < 420) {
      return;
    }
    wheelTimeRef.current = now;
    moveActive(event.deltaY > 0 ? 1 : -1);
  };

  return (
    <section data-scope="chips-box-scattered-layout">
      <style>{SCATTERED_LAYOUT_STYLE}</style>

      {hasBackground ? (
        <div data-layout-background aria-hidden="true">
          <FrameRegionSurface
            region={config.props.background}
            runtime={runtime}
            locale={locale}
            title={getLayoutMessage(locale, "layout.background_title")}
            ratio="16:9"
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

        {enabledEntries.length > 0 && activeEntry ? (
          <>
            <section
              data-scattered-stage
              data-card-size={config.props.cardSize}
              data-motion={config.props.motion}
              tabIndex={0}
              aria-label={getLayoutMessage(locale, "layout.stage_label")}
              onWheel={handleWheel}
            >
              <div data-scattered-stack>
                {fakePlacements.map((placement, index) => (
                  <div
                    key={`${activeEntry.entryId}-fake-${index}`}
                    data-scattered-fake
                    aria-hidden="true"
                    style={{
                      "--scatter-x": `${placement.x}%`,
                      "--scatter-y": `${placement.y}%`,
                      "--scatter-rotate": `${placement.rotate}deg`,
                      "--scatter-scale": placement.scale,
                      "--scatter-depth": index + 1,
                      "--scatter-color": FAKE_CARD_COLORS[placement.colorIndex % FAKE_CARD_COLORS.length],
                    } as React.CSSProperties}
                  />
                ))}
                <TopEntryCard
                  key={activeEntry.entryId}
                  entry={activeEntry}
                  runtime={runtime}
                  locale={locale}
                />
              </div>
            </section>

            <div data-scattered-controls>
              <button type="button" data-scattered-nav onClick={() => moveActive(-1)}>
                {getLayoutMessage(locale, "layout.previous")}
              </button>
              <span data-scattered-count>
                {getLayoutMessage(locale, "layout.position")
                  .replace("{current}", String(mod(activeIndex, enabledEntries.length) + 1))
                  .replace("{total}", String(total || enabledEntries.length))}
              </span>
              <button type="button" data-scattered-nav onClick={() => moveActive(1)}>
                {getLayoutMessage(locale, "layout.next")}
              </button>
            </div>
          </>
        ) : (
          <div data-layout-empty>
            {emptyPlacements.map((placement, index) => (
              <span
                key={`empty-${index}`}
                data-empty-fake
                aria-hidden="true"
                style={{
                  "--scatter-x": `${placement.x}%`,
                  "--scatter-y": `${placement.y}%`,
                  "--scatter-rotate": `${placement.rotate}deg`,
                  "--scatter-scale": placement.scale,
                  "--scatter-depth": index + 1,
                  "--scatter-color": FAKE_CARD_COLORS[placement.colorIndex % FAKE_CARD_COLORS.length],
                  transform: `translate(${placement.x}%, ${placement.y}%) rotate(${placement.rotate}deg) scale(${placement.scale})`,
                } as React.CSSProperties}
              />
            ))}
            <strong data-layout-empty-title>{getLayoutMessage(locale, "layout.empty")}</strong>
            <span data-layout-empty-hint>{getLayoutMessage(locale, "layout.empty_hint")}</span>
          </div>
        )}

        {pageError ? (
          <div data-layout-page-error role="status">
            <span>{getLayoutMessage(locale, "layout.page_error")}</span>
            <button type="button" data-layout-retry onClick={loadNextPage}>
              {getLayoutMessage(locale, "layout.retry")}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

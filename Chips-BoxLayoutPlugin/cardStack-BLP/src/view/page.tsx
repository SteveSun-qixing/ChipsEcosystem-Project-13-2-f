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

const PAGE_LIMIT = 64;
const PREFETCH_AHEAD = 2;
const WHEEL_COOLDOWN_MS = 420;
const NAVIGATION_ANIMATION_MS = 180;

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

interface DragState {
  active: boolean;
  pointerId: number;
  startX: number;
  currentX: number;
}

const CARD_SIZE_STYLE: Record<LayoutConfig["props"]["cardSize"], {
  width: string;
  minHeight: string;
}> = {
  compact: {
    width: "min(82vw, 320px)",
    minHeight: "420px",
  },
  regular: {
    width: "min(86vw, 420px)",
    minHeight: "520px",
  },
  large: {
    width: "min(90vw, 520px)",
    minHeight: "620px",
  },
};

const CARD_STACK_LAYOUT_STYLE = `
[data-scope="chips-box-cardstack-layout"] {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  box-sizing: border-box;
  color: var(--chips-sys-color-on-surface);
  background-color: var(--chips-sys-color-surface);
  overflow: visible;
}

[data-scope="chips-box-cardstack-layout"] [data-layout-background] {
  position: sticky;
  top: 0;
  width: 100%;
  block-size: 100vh;
  margin-block-end: -100vh;
  pointer-events: none;
}

[data-scope="chips-box-cardstack-layout"] [data-layout-shell] {
  position: relative;
  display: grid;
  gap: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  justify-items: center;
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  min-width: 0;
  min-height: 100%;
  box-sizing: border-box;
}

[data-scope="chips-box-cardstack-layout"] [data-layout-top-region] {
  width: min(100%, 960px);
  min-width: 0;
  min-block-size: clamp(132px, 24vw, 288px);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  overflow: hidden;
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
}

[data-scope="chips-box-cardstack-layout"] [data-frame-region],
[data-scope="chips-box-cardstack-layout"] [data-frame-region] [data-part="root"],
[data-scope="chips-box-cardstack-layout"] [data-frame-region] [data-part="frame-container"],
[data-scope="chips-box-cardstack-layout"] [data-frame-region] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-cardstack-layout"] [data-frame-region-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

[data-scope="chips-box-cardstack-layout"] [data-frame-region-status],
[data-scope="chips-box-cardstack-layout"] [data-layout-empty],
[data-scope="chips-box-cardstack-layout"] [data-layout-page-error] {
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
}

[data-scope="chips-box-cardstack-layout"] [data-stack-stage] {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  width: 100%;
  min-width: 0;
  min-height: min(72vh, 720px);
  padding-block: clamp(8px, 3vw, 32px);
}

[data-scope="chips-box-cardstack-layout"] [data-stack-count] {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

[data-scope="chips-box-cardstack-layout"] [data-stack-viewport] {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--card-stack-width);
  min-height: var(--card-stack-min-height);
  touch-action: pan-y;
  user-select: none;
}

[data-scope="chips-box-cardstack-layout"] [data-stack-placeholder] {
  position: absolute;
  inset: 0;
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  background:
    linear-gradient(135deg, var(--chips-sys-color-surface-container-high, var(--chips-sys-color-surface)) 0%, var(--chips-sys-color-surface-container-low, var(--chips-sys-color-surface)) 100%);
  box-shadow: var(--chips-comp-elevation-1, 0 8px 24px rgb(15 23 42 / 10%));
  opacity: calc(0.82 - (var(--stack-layer) * 0.12));
  transform:
    translate3d(calc(var(--stack-layer) * 12px), calc(var(--stack-layer) * 12px), 0)
    rotate(calc(var(--stack-rotation) * var(--stack-layer) * 1deg));
}

[data-scope="chips-box-cardstack-layout"] [data-stack-current-card] {
  position: relative;
  z-index: 4;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  width: 100%;
  min-height: var(--card-stack-min-height);
  padding: 0;
  overflow: hidden;
  text-align: start;
  color: inherit;
  font: inherit;
  cursor: grab;
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  box-shadow: var(--chips-comp-elevation-3, 0 18px 42px rgb(15 23 42 / 16%));
  transform: translateX(var(--drag-x, 0px)) rotate(var(--drag-rotation, 0deg));
  transition: transform 180ms ease, box-shadow 180ms ease;
}

[data-scope="chips-box-cardstack-layout"] [data-stack-current-card][data-dragging="true"] {
  cursor: grabbing;
  transition: none;
  box-shadow: var(--chips-comp-elevation-4, 0 24px 56px rgb(15 23 42 / 20%));
}

[data-scope="chips-box-cardstack-layout"] [data-stack-current-card][data-motion="next"] {
  transform: translateX(16px) rotate(2deg);
}

[data-scope="chips-box-cardstack-layout"] [data-stack-current-card][data-motion="prev"] {
  transform: translateX(-16px) rotate(-2deg);
}

[data-scope="chips-box-cardstack-layout"] [data-stack-cover] {
  position: relative;
  min-height: 0;
  background-color: var(--chips-sys-color-surface-container-low, var(--chips-sys-color-surface));
}

[data-scope="chips-box-cardstack-layout"] [data-stack-cover] [data-scope="embedded-document-frame"],
[data-scope="chips-box-cardstack-layout"] [data-stack-cover] [data-part="root"],
[data-scope="chips-box-cardstack-layout"] [data-stack-cover] [data-part="frame-container"],
[data-scope="chips-box-cardstack-layout"] [data-stack-cover] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-cardstack-layout"] [data-stack-cover] [data-part="iframe"] {
  pointer-events: none;
}

[data-scope="chips-box-cardstack-layout"] [data-stack-cover-placeholder] {
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  width: 100%;
  min-height: 100%;
  padding: var(--chips-base-space-5, 24px);
  text-align: center;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
}

[data-scope="chips-box-cardstack-layout"] [data-stack-cover-placeholder-title] {
  color: var(--chips-sys-color-on-surface);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
}

[data-scope="chips-box-cardstack-layout"] [data-stack-card-body] {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  padding: var(--chips-base-space-4, 16px);
  min-width: 0;
}

[data-scope="chips-box-cardstack-layout"] [data-stack-title] {
  margin: 0;
  color: var(--chips-sys-color-on-surface);
  font-size: clamp(18px, 2.4vw, 24px);
  line-height: 1.25;
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

[data-scope="chips-box-cardstack-layout"] [data-stack-summary] {
  margin: 0;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  line-height: var(--chips-comp-text-root-line-height, 1.5);
  overflow-wrap: anywhere;
}

[data-scope="chips-box-cardstack-layout"] [data-stack-entry-kind] {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

[data-scope="chips-box-cardstack-layout"] [data-stack-controls] {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
}

[data-scope="chips-box-cardstack-layout"] [data-stack-button] {
  min-block-size: var(--chips-layout-density-comfortable, 40px);
  padding-inline: var(--chips-base-space-4, 16px);
  padding-block: var(--chips-base-space-2, 8px);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-button-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-button-root-surface-idle, var(--chips-sys-color-surface));
  color: var(--chips-comp-button-label-color-idle, var(--chips-sys-color-on-surface));
  font: inherit;
  cursor: pointer;
}

[data-scope="chips-box-cardstack-layout"] [data-stack-button]:disabled {
  cursor: default;
  color: var(--chips-comp-button-label-color-disabled, var(--chips-sys-color-on-surface-muted));
  background-color: var(--chips-comp-button-root-surface-disabled, var(--chips-sys-color-surface-container-low));
}

[data-scope="chips-box-cardstack-layout"] [data-layout-empty],
[data-scope="chips-box-cardstack-layout"] [data-layout-page-error],
[data-scope="chips-box-cardstack-layout"] [data-frame-region-status] {
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-height: 160px;
  padding: var(--chips-base-space-4, 16px);
  text-align: center;
}

[data-scope="chips-box-cardstack-layout"] [data-layout-empty-illustration] {
  width: min(52vw, 220px);
  aspect-ratio: 4 / 3;
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  background:
    linear-gradient(135deg, transparent 0 28%, var(--chips-sys-color-border-subtle) 29% 31%, transparent 32%),
    var(--chips-sys-color-surface-container-low, var(--chips-sys-color-surface));
}

[data-scope="chips-box-cardstack-layout"] [data-layout-empty-title] {
  color: var(--chips-sys-color-on-surface);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
}

[data-scope="chips-box-cardstack-layout"] [data-stack-current-card]:focus-visible,
[data-scope="chips-box-cardstack-layout"] [data-stack-button]:focus-visible {
  outline: var(--chips-layout-focus-outline-width, 2px) solid var(--chips-comp-button-focus-outline, currentColor);
  outline-offset: var(--chips-layout-focus-outline-offset, 2px);
}

@media (max-width: 520px) {
  [data-scope="chips-box-cardstack-layout"] [data-layout-shell] {
    padding-inline: var(--chips-base-space-3, 12px);
  }

  [data-scope="chips-box-cardstack-layout"] [data-stack-stage] {
    min-height: 620px;
  }
}
`;

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
}

function resolveEntrySummary(entry: BoxEntrySnapshot, locale?: string): string {
  const summary = entry.snapshot.summary?.trim();
  return summary && summary.length > 0 ? summary : getLayoutMessage(locale, "layout.summary_missing");
}

function resolveEntryKindMessage(entry: BoxEntrySnapshot, locale?: string): string {
  if (entry.snapshot.contentType === "chips/box") {
    return getLayoutMessage(locale, "layout.entry_type_box");
  }
  return getLayoutMessage(locale, "layout.entry_type_card");
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sortEntries(
  entries: BoxEntrySnapshot[],
  config: LayoutConfig,
  locale?: string
): BoxEntrySnapshot[] {
  if (config.props.sortMode === "manual") {
    return entries;
  }

  const compareLocale = locale === "zh-CN" ? "zh-CN" : "en-US";
  if (config.props.sortMode === "name") {
    return [...entries].sort((left, right) => {
      const compared = resolveEntryTitle(left).localeCompare(resolveEntryTitle(right), compareLocale);
      return compared !== 0 ? compared : left.entryId.localeCompare(right.entryId);
    });
  }

  const seed = config.props.randomSeed;
  return [...entries].sort((left, right) => {
    const leftScore = hashString(`${seed}\u0000${left.entryId}`);
    const rightScore = hashString(`${seed}\u0000${right.entryId}`);
    return leftScore !== rightScore ? leftScore - rightScore : left.entryId.localeCompare(right.entryId);
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

function collectNextEntries(
  entries: BoxEntrySnapshot[],
  startIndex: number,
  count: number,
  loop: boolean
): BoxEntrySnapshot[] {
  if (entries.length <= 1 || count <= 0) {
    return [];
  }

  const next: BoxEntrySnapshot[] = [];
  for (let offset = 1; offset <= count; offset += 1) {
    const rawIndex = startIndex + offset;
    if (rawIndex < entries.length) {
      const entry = entries[rawIndex];
      if (entry) {
        next.push(entry);
      }
    } else if (loop) {
      const entry = entries[rawIndex % entries.length];
      if (entry) {
        next.push(entry);
      }
    }
  }

  return [...new Map(next.map((entry) => [entry.entryId, entry])).values()];
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

    const assetPath = region.assetPath;
    let cancelled = false;
    setState({ status: "loading" });
    void Promise
      .resolve()
      .then(() => runtime.readBoxAsset(assetPath))
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

function CurrentCover({
  entry,
  runtime,
  locale,
  onOpen,
}: {
  entry: BoxEntrySnapshot;
  runtime: BoxLayoutRuntime;
  locale?: string;
  onOpen(): void;
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
    void Promise
      .resolve()
      .then(() => runtime.renderEntryCover(entry.entryId))
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

  const title = resolveEntryTitle(entry);
  const ratio = coverState.view?.ratio ?? "3:4";

  if (coverState.status === "ready" && coverState.view?.coverUrl) {
    return (
      <div data-stack-cover>
        <EmbeddedDocumentFrame
          title={coverState.view.title || title}
          src={coverState.view.coverUrl}
          ratio={ratio}
          onActivate={onOpen}
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
    <div data-stack-cover>
      <div data-stack-cover-placeholder data-state={coverState.status}>
        <strong data-stack-cover-placeholder-title>{title}</strong>
        <span>{message}</span>
        <span data-stack-entry-kind>{resolveEntryKindMessage(entry, locale)}</span>
      </div>
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function LayoutViewPage({ initialView, config, runtime, locale }: LayoutViewProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const isMountedRef = useRef(true);
  const wheelTimeRef = useRef(0);
  const animationTimerRef = useRef<number | undefined>();
  const suppressClickRef = useRef(false);
  const [items, setItems] = useState<BoxEntrySnapshot[]>(initialView.items);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialView.nextCursor);
  const [total, setTotal] = useState(initialView.total);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [motion, setMotion] = useState<"next" | "prev" | undefined>();
  const [drag, setDrag] = useState<DragState | undefined>();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animationTimerRef.current !== undefined) {
        window.clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setItems(initialView.items);
    setNextCursor(initialView.nextCursor);
    setTotal(initialView.total);
    setCurrentIndex(0);
    setIsLoadingNext(false);
    setPageError(false);
  }, [initialView]);

  const enabledEntries = useMemo(
    () => sortEntries(items.filter((entry) => entry.enabled), config, locale),
    [config, items, locale]
  );
  const currentEntry = enabledEntries[currentIndex];
  const loop = config.props.reviewLoop === "loop";
  const lowerEntries = useMemo(
    () => collectNextEntries(enabledEntries, currentIndex, config.props.stackDepth - 1, loop),
    [config.props.stackDepth, currentIndex, enabledEntries, loop]
  );
  const prefetchEntries = useMemo(
    () => collectNextEntries(enabledEntries, currentIndex, PREFETCH_AHEAD, loop),
    [currentIndex, enabledEntries, loop]
  );
  const hasTopRegion = hasFrameRegionContent(config.props.topRegion);
  const hasBackground = hasFrameRegionContent(config.props.background);
  const cardSize = CARD_SIZE_STYLE[config.props.cardSize];
  const hasPrevious = enabledEntries.length > 1 && (currentIndex > 0 || loop);
  const hasNext = Boolean(currentEntry)
    && (currentIndex < enabledEntries.length - 1 || (loop && enabledEntries.length > 1) || Boolean(nextCursor));
  const dragX = drag?.active ? drag.currentX - drag.startX : 0;

  const markMotion = useCallback((direction: "next" | "prev") => {
    if (animationTimerRef.current !== undefined) {
      window.clearTimeout(animationTimerRef.current);
    }
    setMotion(direction);
    animationTimerRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        setMotion(undefined);
      }
    }, NAVIGATION_ANIMATION_MS);
  }, []);

  const loadNextPage = useCallback(async (): Promise<boolean> => {
    if (!nextCursor || isLoadingNext) {
      return false;
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
        return false;
      }
      setItems((current) => appendUniqueEntries(current, page.items));
      setNextCursor(page.nextCursor);
      setTotal(page.total);
      return page.items.length > 0;
    } catch {
      if (isMountedRef.current) {
        setPageError(true);
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoadingNext(false);
      }
    }
  }, [isLoadingNext, nextCursor, runtime]);

  const goNext = useCallback(() => {
    if (enabledEntries.length === 0) {
      return;
    }
    markMotion("next");
    if (currentIndex < enabledEntries.length - 1) {
      setCurrentIndex((index) => Math.min(index + 1, enabledEntries.length - 1));
      return;
    }
    if (nextCursor) {
      void loadNextPage().then((added) => {
        if (added && isMountedRef.current) {
          setCurrentIndex((index) => Math.min(index + 1, Math.max(enabledEntries.length, index + 1)));
        } else if (loop && isMountedRef.current) {
          setCurrentIndex(0);
        }
      });
      return;
    }
    if (loop) {
      setCurrentIndex(0);
    }
  }, [currentIndex, enabledEntries.length, loadNextPage, loop, markMotion, nextCursor]);

  const goPrevious = useCallback(() => {
    if (enabledEntries.length === 0) {
      return;
    }
    markMotion("prev");
    if (currentIndex > 0) {
      setCurrentIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (loop) {
      setCurrentIndex(enabledEntries.length - 1);
    }
  }, [currentIndex, enabledEntries.length, loop, markMotion]);

  useEffect(() => {
    if (currentIndex <= enabledEntries.length - 1) {
      return;
    }
    setCurrentIndex(Math.max(0, enabledEntries.length - 1));
  }, [currentIndex, enabledEntries.length]);

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

  useEffect(() => {
    const ownerDocument = rootRef.current?.ownerDocument ?? document;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        goPrevious();
      }
    };
    ownerDocument.addEventListener("keydown", handleKeyDown);
    return () => {
      ownerDocument.removeEventListener("keydown", handleKeyDown);
    };
  }, [goNext, goPrevious]);

  const handleOpen = useCallback(() => {
    if (!currentEntry || suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    void runtime.openEntry(currentEntry.entryId);
  }, [currentEntry, runtime]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaY) < 20) {
      return;
    }
    event.preventDefault();
    const now = Date.now();
    if (now - wheelTimeRef.current < WHEEL_COOLDOWN_MS) {
      return;
    }
    wheelTimeRef.current = now;
    if (event.deltaY > 0) {
      goNext();
    } else {
      goPrevious();
    }
  }, [goNext, goPrevious]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable in test environments.
    }
    setDrag({
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      currentX: event.clientX,
    });
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    setDrag((current) => {
      if (!current?.active || current.pointerId !== event.pointerId) {
        return current;
      }
      return {
        ...current,
        currentX: event.clientX,
      };
    });
  }, []);

  const finishDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    setDrag((current) => {
      if (!current?.active || current.pointerId !== event.pointerId) {
        return current;
      }
      const offset = current.currentX - current.startX;
      suppressClickRef.current = Math.abs(offset) > 8;
      if (Math.abs(offset) >= config.props.swipeThreshold) {
        if (offset < 0) {
          goNext();
        } else {
          goPrevious();
        }
      }
      return undefined;
    });
  }, [config.props.swipeThreshold, goNext, goPrevious]);

  return (
    <section
      ref={rootRef}
      data-scope="chips-box-cardstack-layout"
      style={{
        "--card-stack-width": cardSize.width,
        "--card-stack-min-height": cardSize.minHeight,
        "--stack-rotation": String(config.props.spreadRotationDeg),
      } as React.CSSProperties}
    >
      <style>{CARD_STACK_LAYOUT_STYLE}</style>

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

        {currentEntry ? (
          <div data-stack-stage onWheel={handleWheel}>
            <span data-stack-count>
              {getLayoutMessage(locale, "layout.position")
                .replace("{current}", String(currentIndex + 1))
                .replace("{total}", String(total || enabledEntries.length))}
            </span>
            <div data-stack-viewport data-entry-count={enabledEntries.length}>
              {lowerEntries.map((entry, index) => (
                <div
                  key={`${entry.entryId}-${index}`}
                  data-stack-placeholder
                  data-entry-id={entry.entryId}
                  aria-hidden="true"
                  style={{
                    "--stack-layer": String(index + 1),
                  } as React.CSSProperties}
                />
              ))}
              <button
                type="button"
                data-stack-current-card
                data-entry-id={currentEntry.entryId}
                data-dragging={drag?.active ? "true" : undefined}
                data-motion={motion}
                style={{
                  "--drag-x": `${dragX}px`,
                  "--drag-rotation": `${Math.max(-10, Math.min(10, dragX / 24))}deg`,
                } as React.CSSProperties}
                onClick={handleOpen}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
              >
                <CurrentCover
                  entry={currentEntry}
                  runtime={runtime}
                  locale={locale}
                  onOpen={handleOpen}
                />
                <span data-stack-card-body>
                  <strong data-stack-title>{resolveEntryTitle(currentEntry)}</strong>
                  <span data-stack-summary>{resolveEntrySummary(currentEntry, locale)}</span>
                  <span data-stack-entry-kind>{resolveEntryKindMessage(currentEntry, locale)}</span>
                </span>
              </button>
            </div>
            <div data-stack-controls>
              <button
                type="button"
                data-stack-button
                data-stack-prev
                disabled={!hasPrevious}
                onClick={goPrevious}
              >
                {getLayoutMessage(locale, "layout.previous")}
              </button>
              <button
                type="button"
                data-stack-button
                data-stack-next
                disabled={!hasNext || isLoadingNext}
                onClick={goNext}
              >
                {isLoadingNext
                  ? getLayoutMessage(locale, "layout.loading_more")
                  : getLayoutMessage(locale, "layout.next")}
              </button>
            </div>
            {pageError ? (
              <div data-layout-page-error role="status">
                <span>{getLayoutMessage(locale, "layout.page_error")}</span>
                <button type="button" data-stack-button onClick={() => void loadNextPage()}>
                  {getLayoutMessage(locale, "layout.retry")}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div data-layout-empty>
            <div data-layout-empty-illustration aria-hidden="true" />
            <strong data-layout-empty-title>{getLayoutMessage(locale, "layout.empty")}</strong>
            <span>{getLayoutMessage(locale, "layout.empty_hint")}</span>
          </div>
        )}
      </div>
    </section>
  );
}

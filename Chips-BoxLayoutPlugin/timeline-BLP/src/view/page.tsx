import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmbeddedDocumentFrame } from "@chips/component-library";
import {
  hasFrameRegionContent,
  type FrameRegionConfig,
  type LayoutConfig,
  type TimelinePointConfig,
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

interface CoverState {
  status: "idle" | "loading" | "ready" | "error";
  view?: BoxEntryCoverView;
}

interface FrameRegionState {
  status: "idle" | "loading" | "ready" | "error";
  resource?: ResolvedRuntimeResource;
}

interface TimelineGroup {
  id: string;
  label: string;
  date?: string;
  note?: string;
  entries: BoxEntrySnapshot[];
  position: number;
  isUnscheduled?: boolean;
}

const TIMELINE_LAYOUT_STYLE = `
[data-scope="chips-box-timeline-layout"] {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  box-sizing: border-box;
  color: var(--chips-sys-color-on-surface);
  background-color: var(--chips-sys-color-surface);
}

[data-scope="chips-box-timeline-layout"] * {
  box-sizing: border-box;
}

[data-scope="chips-box-timeline-layout"] [data-layout-background] {
  position: sticky;
  top: 0;
  width: 100%;
  block-size: 100vh;
  margin-block-end: -100vh;
  pointer-events: none;
}

[data-scope="chips-box-timeline-layout"] [data-layout-shell] {
  position: relative;
  display: grid;
  gap: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  min-height: 100%;
  min-width: 0;
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
}

[data-scope="chips-box-timeline-layout"] [data-layout-top-region] {
  min-width: 0;
  min-block-size: clamp(132px, 24vw, 288px);
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

[data-scope="chips-box-timeline-layout"] [data-frame-region],
[data-scope="chips-box-timeline-layout"] [data-frame-region] [data-part="root"],
[data-scope="chips-box-timeline-layout"] [data-frame-region] [data-part="frame-container"],
[data-scope="chips-box-timeline-layout"] [data-frame-region] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-timeline-layout"] [data-frame-region-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

[data-scope="chips-box-timeline-layout"] [data-frame-region-status],
[data-scope="chips-box-timeline-layout"] [data-layout-empty],
[data-scope="chips-box-timeline-layout"] [data-layout-page-error],
[data-scope="chips-box-timeline-layout"] [data-timeline-entry-cover-placeholder] {
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
}

[data-scope="chips-box-timeline-layout"] [data-timeline-root] {
  min-width: 0;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-root][data-orientation="vertical"] {
  display: grid;
  gap: var(--chips-layout-gap-lg, var(--chips-base-space-4));
}

[data-scope="chips-box-timeline-layout"] [data-timeline-root][data-orientation="horizontal"] {
  display: flex;
  gap: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  min-width: 0;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  padding-block-end: var(--chips-base-space-2);
}

[data-scope="chips-box-timeline-layout"] [data-timeline-point] {
  position: relative;
  display: grid;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  min-width: 0;
  isolation: isolate;
}

[data-scope="chips-box-timeline-layout"] [data-orientation="vertical"] [data-timeline-point] {
  grid-template-columns: minmax(96px, 148px) minmax(0, 1fr);
  padding-block-end: var(--chips-base-space-3);
}

[data-scope="chips-box-timeline-layout"] [data-orientation="horizontal"] [data-timeline-point] {
  flex: 0 0 clamp(240px, 32vw, 360px);
  scroll-snap-align: start;
  align-content: start;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-marker] {
  display: grid;
  align-content: start;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-dot] {
  inline-size: 16px;
  block-size: 16px;
  border-radius: 999px;
  background: var(--chips-sys-color-primary, currentColor);
  box-shadow: 0 0 0 4px var(--chips-sys-color-primary-container, transparent);
}

[data-scope="chips-box-timeline-layout"] [data-orientation="vertical"] [data-timeline-point]::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 20px;
  bottom: -12px;
  width: 2px;
  background: var(--chips-sys-color-border-subtle);
  z-index: -1;
}

[data-scope="chips-box-timeline-layout"] [data-orientation="horizontal"] [data-timeline-point]::before {
  content: "";
  position: absolute;
  left: 16px;
  right: calc(-1 * var(--chips-layout-gap-lg, var(--chips-base-space-4)));
  top: 7px;
  height: 2px;
  background: var(--chips-sys-color-border-subtle);
  z-index: -1;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-title] {
  margin: 0;
  color: var(--chips-sys-color-on-surface);
  font-size: var(--chips-comp-title-sm-font-size, 16px);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
  line-height: var(--chips-comp-text-root-line-height, 1.5);
}

[data-scope="chips-box-timeline-layout"] [data-timeline-date],
[data-scope="chips-box-timeline-layout"] [data-timeline-count],
[data-scope="chips-box-timeline-layout"] [data-timeline-note],
[data-scope="chips-box-timeline-layout"] [data-timeline-entry-kind],
[data-scope="chips-box-timeline-layout"] [data-timeline-entry-summary] {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
  line-height: 1.45;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-note] {
  margin: 0;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-point-button],
[data-scope="chips-box-timeline-layout"] [data-timeline-entry-title],
[data-scope="chips-box-timeline-layout"] [data-layout-load-more],
[data-scope="chips-box-timeline-layout"] [data-layout-retry] {
  border: none;
  margin: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-point-button] {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  padding: 0;
  text-align: start;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry-list] {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry] {
  display: grid;
  grid-template-columns: var(--timeline-cover-size, 104px) minmax(0, 1fr);
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
  align-items: start;
  padding: var(--timeline-entry-padding, var(--chips-base-space-3));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry][data-show-cover="false"] {
  grid-template-columns: minmax(0, 1fr);
}

[data-scope="chips-box-timeline-layout"] [data-density="compact"] {
  --timeline-cover-size: 72px;
  --timeline-entry-padding: var(--chips-base-space-2);
}

[data-scope="chips-box-timeline-layout"] [data-density="spacious"] {
  --timeline-cover-size: 132px;
  --timeline-entry-padding: var(--chips-base-space-4);
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry-cover] {
  width: 100%;
  overflow: hidden;
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  background-color: var(--chips-sys-color-surface);
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry-cover] [data-scope="embedded-document-frame"],
[data-scope="chips-box-timeline-layout"] [data-timeline-entry-cover] [data-part="frame-container"],
[data-scope="chips-box-timeline-layout"] [data-timeline-entry-cover] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry-cover] [data-part="iframe"] {
  border: none;
  pointer-events: none;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry-cover-placeholder] {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 96px;
  padding: var(--chips-base-space-2);
  text-align: center;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry-body] {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry-title] {
  padding: 0;
  color: var(--chips-sys-color-on-surface);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
  text-align: start;
  min-width: 0;
  overflow-wrap: anywhere;
}

[data-scope="chips-box-timeline-layout"] [data-timeline-entry-summary] {
  margin: 0;
  overflow-wrap: anywhere;
}

[data-scope="chips-box-timeline-layout"] [data-layout-footer] {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
}

[data-scope="chips-box-timeline-layout"] [data-layout-load-more],
[data-scope="chips-box-timeline-layout"] [data-layout-retry] {
  min-block-size: var(--chips-layout-density-comfortable, 40px);
  padding-inline: var(--chips-base-space-4);
  padding-block: var(--chips-base-space-2);
  border-radius: var(--chips-comp-button-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-button-root-surface-idle);
  color: var(--chips-comp-button-label-color-idle, var(--chips-sys-color-on-surface));
}

[data-scope="chips-box-timeline-layout"] [data-layout-load-more]:disabled {
  cursor: default;
  color: var(--chips-comp-button-label-color-disabled, var(--chips-sys-color-on-surface-muted));
  background-color: var(--chips-comp-button-root-surface-disabled);
}

[data-scope="chips-box-timeline-layout"] [data-layout-empty],
[data-scope="chips-box-timeline-layout"] [data-layout-page-error],
[data-scope="chips-box-timeline-layout"] [data-frame-region-status] {
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-height: 160px;
  padding: var(--chips-base-space-4);
  text-align: center;
}

[data-scope="chips-box-timeline-layout"] [data-layout-empty-title] {
  color: var(--chips-sys-color-on-surface);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
}

[data-scope="chips-box-timeline-layout"] [data-timeline-point-button]:focus-visible,
[data-scope="chips-box-timeline-layout"] [data-timeline-entry-title]:focus-visible,
[data-scope="chips-box-timeline-layout"] [data-timeline-entry-cover-placeholder]:focus-visible,
[data-scope="chips-box-timeline-layout"] [data-layout-load-more]:focus-visible,
[data-scope="chips-box-timeline-layout"] [data-layout-retry]:focus-visible {
  outline: var(--chips-layout-focus-outline-width, 2px) solid var(--chips-comp-button-focus-outline, currentColor);
  outline-offset: var(--chips-layout-focus-outline-offset, 2px);
}

@media (max-width: 720px) {
  [data-scope="chips-box-timeline-layout"] [data-orientation="vertical"] [data-timeline-point] {
    grid-template-columns: minmax(0, 1fr);
  }

  [data-scope="chips-box-timeline-layout"] [data-orientation="vertical"] [data-timeline-point]::before {
    display: none;
  }

  [data-scope="chips-box-timeline-layout"] [data-timeline-entry] {
    grid-template-columns: minmax(0, 1fr);
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

function formatPointDate(date: string | undefined, locale?: string): string | undefined {
  if (!date) {
    return undefined;
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function readPointTime(point: TimelinePointConfig): number | undefined {
  if (!point.date) {
    return undefined;
  }
  const time = new Date(point.date).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function calculatePointPositions(points: TimelinePointConfig[], scaleMode: LayoutConfig["props"]["scaleMode"]): Map<string, number> {
  const positions = new Map<string, number>();
  if (points.length === 0) {
    return positions;
  }
  if (scaleMode !== "date-distance") {
    points.forEach((point, index) => {
      positions.set(point.id, index);
    });
    return positions;
  }

  const datedPoints = points
    .map((point) => ({ point, time: readPointTime(point) }))
    .filter((item): item is { point: TimelinePointConfig; time: number } => typeof item.time === "number");
  if (datedPoints.length < 2) {
    points.forEach((point, index) => {
      positions.set(point.id, index);
    });
    return positions;
  }

  const min = Math.min(...datedPoints.map((item) => item.time));
  const max = Math.max(...datedPoints.map((item) => item.time));
  const span = Math.max(1, max - min);
  points.forEach((point, index) => {
    const time = readPointTime(point);
    positions.set(point.id, typeof time === "number" ? ((time - min) / span) * Math.max(1, points.length - 1) : index);
  });
  return positions;
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

function buildTimelineGroups(entries: BoxEntrySnapshot[], config: LayoutConfig): TimelineGroup[] {
  const enabledEntries = entries.filter((entry) => entry.enabled);
  const entryById = new Map(enabledEntries.map((entry) => [entry.entryId, entry]));
  const assigned = new Set<string>();
  const pointPositions = calculatePointPositions(config.props.points, config.props.scaleMode);
  const groups: TimelineGroup[] = config.props.points.map((point, index) => {
    const pointEntries = point.entryIds
      .map((entryId) => entryById.get(entryId))
      .filter((entry): entry is BoxEntrySnapshot => Boolean(entry));
    pointEntries.forEach((entry) => assigned.add(entry.entryId));
    return {
      id: point.id,
      label: point.label,
      date: point.date,
      note: point.note,
      entries: pointEntries,
      position: pointPositions.get(point.id) ?? index,
    };
  });

  const unscheduledEntries = enabledEntries.filter((entry) => !assigned.has(entry.entryId));
  if (unscheduledEntries.length > 0) {
    groups.push({
      id: "__unscheduled",
      label: "unscheduled",
      entries: unscheduledEntries,
      position: groups.length,
      isUnscheduled: true,
    });
  }

  return groups;
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
        <img data-frame-region-image src={state.resource.resourceUrl} alt={decorative ? "" : title} />
      </div>
    );
  }

  return (
    <div data-frame-region-status role={decorative ? undefined : "status"}>
      {state.status === "loading"
        ? getLayoutMessage(locale, "layout.asset_loading")
        : getLayoutMessage(locale, "layout.asset_error")}
    </div>
  );
}

function EntryCover({
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
  const fallbackRatio = "3:4";
  const aspectRatio = toCssAspectRatio(coverState.view?.ratio ?? entry.layoutHints?.aspectRatio, fallbackRatio);
  const ratioToken = toRatioToken(coverState.view?.ratio ?? entry.layoutHints?.aspectRatio, fallbackRatio);
  const title = resolveEntryTitle(entry);

  if (coverState.status === "ready" && coverState.view?.coverUrl) {
    return (
      <div data-timeline-entry-cover style={{ aspectRatio }}>
        <EmbeddedDocumentFrame
          title={coverState.view.title || title}
          src={coverState.view.coverUrl}
          ratio={ratioToken}
          onActivate={openEntry}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      data-timeline-entry-cover
      data-timeline-entry-cover-placeholder
      data-state={coverState.status}
      style={{ aspectRatio }}
      onClick={openEntry}
    >
      {coverState.status === "loading"
        ? getLayoutMessage(locale, "layout.loading")
        : coverState.status === "error"
          ? getLayoutMessage(locale, "layout.cover_error")
          : getLayoutMessage(locale, "layout.cover_missing")}
    </button>
  );
}

function TimelineEntry({
  entry,
  runtime,
  locale,
  showCover,
}: {
  entry: BoxEntrySnapshot;
  runtime: BoxLayoutRuntime;
  locale?: string;
  showCover: boolean;
}) {
  const title = resolveEntryTitle(entry);
  const openEntry = () => {
    void runtime.openEntry(entry.entryId);
  };

  return (
    <article data-timeline-entry data-entry-id={entry.entryId} data-show-cover={showCover ? "true" : "false"}>
      {showCover ? <EntryCover entry={entry} runtime={runtime} locale={locale} /> : null}
      <div data-timeline-entry-body>
        <button type="button" data-timeline-entry-title onClick={openEntry} title={title}>
          {title}
        </button>
        <span data-timeline-entry-kind>{resolveEntryKindMessage(entry, locale)}</span>
        {entry.snapshot.summary ? <p data-timeline-entry-summary>{entry.snapshot.summary}</p> : null}
      </div>
    </article>
  );
}

function TimelinePoint({
  group,
  runtime,
  locale,
  config,
  expanded,
  onToggle,
}: {
  group: TimelineGroup;
  runtime: BoxLayoutRuntime;
  locale?: string;
  config: LayoutConfig;
  expanded: boolean;
  onToggle(groupId: string): void;
}) {
  const label = group.isUnscheduled ? getLayoutMessage(locale, "layout.unscheduled") : group.label;
  const dateLabel = group.isUnscheduled ? undefined : formatPointDate(group.date, locale);
  const entryCount = getLayoutMessage(locale, "layout.point_count").replace("{count}", String(group.entries.length));
  const visibleEntries = expanded || group.entries.length <= 1 ? group.entries : group.entries.slice(0, 2);

  const activatePoint = () => {
    if (group.entries.length === 1) {
      const onlyEntry = group.entries[0];
      if (onlyEntry) {
        void runtime.openEntry(onlyEntry.entryId);
      }
      return;
    }
    onToggle(group.id);
  };

  return (
    <article data-timeline-point data-point-id={group.id} style={{ "--timeline-position": group.position } as React.CSSProperties}>
      <div data-timeline-marker>
        <span data-timeline-dot aria-hidden="true" />
        <button
          type="button"
          data-timeline-point-button
          aria-expanded={group.entries.length > 1 ? expanded : undefined}
          onClick={activatePoint}
        >
          <h2 data-timeline-title>{label}</h2>
          {dateLabel ? <span data-timeline-date>{dateLabel}</span> : null}
          <span data-timeline-count>{entryCount}</span>
        </button>
        {group.note ? <p data-timeline-note>{group.note}</p> : null}
      </div>

      <div data-timeline-entry-list>
        {visibleEntries.map((entry) => (
          <TimelineEntry
            key={entry.entryId}
            entry={entry}
            runtime={runtime}
            locale={locale}
            showCover={config.props.showCovers}
          />
        ))}
        {!expanded && group.entries.length > visibleEntries.length ? (
          <button type="button" data-timeline-entry-title onClick={() => onToggle(group.id)}>
            {getLayoutMessage(locale, "layout.expand_entries").replace(
              "{count}",
              String(group.entries.length - visibleEntries.length)
            )}
          </button>
        ) : null}
      </div>
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
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set());
  const timelineRootRef = useRef<HTMLDivElement | null>(null);

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
    setExpandedGroupIds(new Set());
  }, [initialView]);

  const groups = useMemo(() => buildTimelineGroups(items, config), [config, items]);
  const enabledEntries = useMemo(() => items.filter((entry) => entry.enabled), [items]);
  const hasTopRegion = hasFrameRegionContent(config.props.topRegion);
  const hasBackground = hasFrameRegionContent(config.props.background);

  useEffect(() => {
    if (!config.props.showCovers || enabledEntries.length === 0) {
      return;
    }
    void runtime.prefetchEntries({
      entryIds: enabledEntries.slice(0, 24).map((entry) => entry.entryId),
      targets: ["cover"],
    }).catch(() => undefined);
  }, [config.props.showCovers, enabledEntries, runtime]);

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

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (config.props.orientation !== "horizontal") {
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    timelineRootRef.current?.scrollBy({
      left: event.key === "ArrowRight" ? 320 : -320,
      behavior: "smooth",
    });
  };

  return (
    <section data-scope="chips-box-timeline-layout">
      <style>{TIMELINE_LAYOUT_STYLE}</style>

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

        {enabledEntries.length === 0 ? (
          <div data-layout-empty>
            <strong data-layout-empty-title>{getLayoutMessage(locale, "layout.empty")}</strong>
            <span>{getLayoutMessage(locale, "layout.empty_hint")}</span>
          </div>
        ) : (
          <div
            ref={timelineRootRef}
            data-timeline-root
            data-orientation={config.props.orientation}
            data-scale-mode={config.props.scaleMode}
            data-density={config.props.cardDensity}
            tabIndex={config.props.orientation === "horizontal" ? 0 : undefined}
            onKeyDown={handleKeyDown}
          >
            {groups.map((group) => (
              <TimelinePoint
                key={group.id}
                group={group}
                runtime={runtime}
                locale={locale}
                config={config}
                expanded={expandedGroupIds.has(group.id)}
                onToggle={toggleGroup}
              />
            ))}
          </div>
        )}

        {pageError ? (
          <div data-layout-page-error role="status">
            <span>{getLayoutMessage(locale, "layout.page_error")}</span>
            <button type="button" data-layout-retry onClick={() => { void loadNextPage(); }}>
              {getLayoutMessage(locale, "layout.retry")}
            </button>
          </div>
        ) : null}

        {nextCursor ? (
          <div data-layout-footer>
            <button type="button" data-layout-load-more onClick={() => { void loadNextPage(); }} disabled={isLoadingNext}>
              {isLoadingNext
                ? getLayoutMessage(locale, "layout.loading_more")
                : `${getLayoutMessage(locale, "layout.load_more")} (${items.length}/${total})`}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { EmbeddedDocumentFrame } from "@chips/component-library";
import type { LayoutConfig } from "../schema/layout-config";
import type { BoxEntryCoverView, BoxEntrySnapshot, BoxLayoutRuntime } from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";

export interface LayoutViewProps {
  entries: BoxEntrySnapshot[];
  config: LayoutConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
}

interface CoverState {
  status: "idle" | "loading" | "ready" | "error";
  view?: BoxEntryCoverView;
}

const GRID_LAYOUT_STYLE = `
[data-scope="chips-box-grid-layout"] [data-grid-entry] {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] {
  position: relative;
  width: 100%;
  overflow: hidden;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-scope="embedded-document-frame"] {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-part="frame-container"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-part="iframe"] {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  pointer-events: none;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-part="status"] {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  font-size: 12px;
  color: #475569;
  text-align: center;
  pointer-events: none;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-scope="embedded-document-frame"][data-state="idle"] [data-part="status"],
[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-scope="embedded-document-frame"][data-state="ready"] [data-part="status"] {
  opacity: 0;
}

[data-scope="chips-box-grid-layout"] [data-grid-cover-shell] [data-scope="embedded-document-frame"][data-state="loading"] [data-part="status"] {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.78) 25%, rgba(255, 255, 255, 0.32) 50%, rgba(255, 255, 255, 0.78) 75%),
    linear-gradient(180deg, rgba(148, 163, 184, 0.24) 0%, rgba(226, 232, 240, 0.34) 100%);
  background-size: 220% 100%, 100% 100%;
  animation: chips-box-grid-cover-shimmer 1.3s linear infinite;
}

[data-scope="chips-box-grid-layout"] [data-grid-entry-title] {
  border: none;
  padding: 0;
  margin: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}

[data-scope="chips-box-grid-layout"] [data-grid-entry-title]:focus-visible {
  outline: 2px solid rgba(99, 102, 241, 0.7);
  outline-offset: 2px;
  border-radius: 4px;
}

@keyframes chips-box-grid-cover-shimmer {
  from {
    background-position: 200% 0, 0 0;
  }

  to {
    background-position: -20% 0, 0 0;
  }
}
`;

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
}

function toCssAspectRatio(value: string | number | undefined, fallback: number): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value}`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.includes(":") ? value.trim().replace(":", " / ") : value.trim();
  }

  return `${fallback}`;
}

function toRatioToken(value: string | number | undefined, fallback: number): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value}`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return `${fallback}`;
}

function CoverTile({
  entry,
  runtime,
  ratio,
  locale,
}: {
  entry: BoxEntrySnapshot;
  runtime: BoxLayoutRuntime;
  ratio: number;
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

  const aspectRatio = toCssAspectRatio(coverState.view?.ratio ?? entry.layoutHints?.aspectRatio, ratio);
  const ratioToken = toRatioToken(coverState.view?.ratio ?? entry.layoutHints?.aspectRatio, ratio);

  if (coverState.status === "ready" && coverState.view?.coverUrl) {
    return (
      <div
        data-grid-cover-shell
        style={{
          aspectRatio,
        }}
      >
        <EmbeddedDocumentFrame
          title={coverState.view.title || resolveEntryTitle(entry)}
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
      : getLayoutMessage(locale, "layout.cover_missing");

  return (
    <div
      data-grid-cover-shell
      style={{
        width: "100%",
        aspectRatio,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#475569",
        fontSize: "12px",
        background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(129,140,248,0.08))",
      }}
    >
      {message}
    </div>
  );
}

function EntryCard({
  entry,
  runtime,
  locale,
  ratio,
}: {
  entry: BoxEntrySnapshot;
  runtime: BoxLayoutRuntime;
  locale?: string;
  ratio: number;
}) {
  const handleOpen = () => {
    void runtime.openEntry(entry.entryId);
  };

  return (
    <div
      key={entry.entryId}
      data-entry-id={entry.entryId}
      data-grid-entry
    >
      <CoverTile
        entry={entry}
        runtime={runtime}
        ratio={ratio}
        locale={locale}
      />
      <button
        type="button"
        data-grid-entry-title
        onClick={handleOpen}
        title={resolveEntryTitle(entry)}
      >
        {resolveEntryTitle(entry)}
      </button>
    </div>
  );
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

export function LayoutViewPage({ entries, config, runtime, locale }: LayoutViewProps) {
  const enabledEntries = useMemo(
    () => sortEntries(entries.filter((entry) => entry.enabled), config.props.sortMode, locale),
    [config.props.sortMode, entries, locale]
  );

  useEffect(() => {
    if (enabledEntries.length === 0) {
      return;
    }
    void Promise.resolve(
      runtime.prefetchEntries({
        entryIds: enabledEntries.map((entry) => entry.entryId),
        targets: ["cover"],
      })
    ).catch(() => undefined);
  }, [enabledEntries, runtime]);

  return (
    <div
      data-scope="chips-box-grid-layout"
      style={{
        minHeight: "100%",
        display: "grid",
        gap: "16px",
        padding: "16px",
        alignContent: "start",
      }}
    >
      <style>{GRID_LAYOUT_STYLE}</style>
      {enabledEntries.length === 0 ? (
        <div data-layout-empty>{getLayoutMessage(locale, "layout.empty")}</div>
      ) : (
        <div
          data-layout-grid
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {enabledEntries.map((entry) => (
            <EntryCard
              key={entry.entryId}
              entry={entry}
              runtime={runtime}
              ratio={1.4}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { EmbeddedDocumentFrame } from "@chips/component-library";
import type { BoxEntryCoverView, BoxEntrySnapshot, BoxLayoutRuntime } from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";

interface CoverState {
  status: "idle" | "loading" | "ready" | "error";
  view?: BoxEntryCoverView;
}

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
}

function resolveEntryKindLabel(entry: BoxEntrySnapshot, locale?: string): string {
  if (entry.snapshot.contentType === "chips/box") {
    return getLayoutMessage(locale, "layout.entry_type_box");
  }
  return getLayoutMessage(locale, "layout.entry_type_card");
}

function resolveAspectRatio(entry: BoxEntrySnapshot, coverView?: BoxEntryCoverView): string {
  if (coverView?.ratio) {
    return coverView.ratio;
  }
  const value = entry.layoutHints?.aspectRatio;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value} / 1`;
  }
  return "3:4";
}

export function EntryTile({
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

  const title = useMemo(() => resolveEntryTitle(entry), [entry]);
  const kindLabel = useMemo(() => resolveEntryKindLabel(entry, locale), [entry, locale]);

  useEffect(() => {
    if (entry.snapshot.cover?.mode === "none") {
      setCoverState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setCoverState({ status: "loading" });
    void runtime.renderEntryCover(entry.entryId).then((view) => {
      if (!cancelled) {
        setCoverState({
          status: "ready",
          view,
        });
      }
    }).catch(() => {
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

  return (
    <article data-grid-entry data-entry-id={entry.entryId}>
      <div data-grid-cover-shell style={{ aspectRatio: resolveAspectRatio(entry, coverState.view).replace(":", " / ") }}>
        {coverState.status === "ready" && coverState.view?.coverUrl ? (
          <EmbeddedDocumentFrame
            title={coverState.view.title || title}
            src={coverState.view.coverUrl}
            ratio={coverState.view.ratio ?? resolveAspectRatio(entry, coverState.view)}
            onActivate={openEntry}
          />
        ) : (
          <button type="button" data-grid-cover-placeholder onClick={openEntry}>
            <strong data-grid-cover-placeholder-title>{title}</strong>
            <span data-grid-cover-placeholder-text>
              {coverState.status === "loading"
                ? getLayoutMessage(locale, "layout.loading")
                : `${kindLabel} · ${getLayoutMessage(locale, "layout.cover_missing")}`}
            </span>
          </button>
        )}
      </div>

      <div data-grid-entry-body>
        <button type="button" data-grid-entry-title onClick={openEntry}>
          {title}
        </button>
      </div>
    </article>
  );
}

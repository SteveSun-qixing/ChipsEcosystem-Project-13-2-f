import React from "react";
import type { BoxEntrySnapshot } from "../shared/types";
import type { LayoutConfig } from "../schema/layout-config";
import { getLayoutMessage } from "../shared/i18n";

export interface LayoutViewProps {
  entries: BoxEntrySnapshot[];
  config: LayoutConfig;
  locale?: string;
}

function resolveCardTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.cardId ?? entry.entryId;
}

export function LayoutViewPage({ entries, config, locale }: LayoutViewProps) {
  if (entries.length === 0) {
    return <div>{getLayoutMessage(locale, "layout.empty")}</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${config.props.columnCount}, minmax(0, 1fr))`,
        gap: `${config.props.gap}px`,
        padding: `${config.props.gap}px`,
        alignItems: "start",
      }}
    >
      {entries.filter((entry) => entry.enabled).map((entry) => (
        <article
          key={entry.entryId}
          data-entry-id={entry.entryId}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.28)",
            padding: "12px",
            background: "rgba(255,255,255,0.92)",
          }}
        >
          <div
            style={{
              width: "100%",
              aspectRatio: `${config.props.coverRatio}`,
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(129,140,248,0.08))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              fontSize: "12px",
            }}
          >
            {entry.snapshot.cover?.mode === "none"
              ? getLayoutMessage(locale, "layout.cover_missing")
              : resolveCardTitle(entry)}
          </div>
          <strong>{resolveCardTitle(entry)}</strong>
          {config.props.informationDensity !== "compact" ? (
            <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>
              {entry.snapshot.summary ?? entry.url}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

import React from "react";
import type { ReadingProgress } from "../engine/types";

export interface ProgressBarProps {
  progress: ReadingProgress | null;
  onSeek: (fraction: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ProgressBar(props: ProgressBarProps): React.ReactElement | null {
  const { progress, onSeek, t } = props;

  if (!progress) {
    return null;
  }

  const sectionValue = Math.round(progress.sectionFraction * 1000);
  const pageLabel =
    progress.readingMode === "paginated"
      ? t("book-reader.reader.pagePosition", {
          current: progress.currentPage,
          total: progress.totalPages,
        })
      : `${Math.round(progress.sectionFraction * 100)}%`;
  const progressLabel = t("book-reader.reader.bookProgress", {
    percentage: progress.bookPercentage,
  });

  return (
    <section className="book-reader-progress" aria-label={t("book-reader.labels.progress")}>
      <div className="book-reader-progress__meta">
        <span className="book-reader-progress__section">{progress.sectionTitle}</span>
        <span className="book-reader-progress__label">
          {pageLabel} · {progressLabel}
        </span>
      </div>
      <div className="book-reader-progress__track">
        <div className="book-reader-progress__fill" style={{ width: `${progress.sectionFraction * 100}%` }} />
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={sectionValue}
          className="book-reader-progress__input"
          aria-label={t("book-reader.labels.progress")}
          onChange={(event) => {
            onSeek(Number(event.target.value) / 1000);
          }}
        />
      </div>
    </section>
  );
}

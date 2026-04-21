import React from "react";
import type { IconDescriptor } from "chips-sdk";
import type { EpubBook, EpubSection } from "../domain/epub/types";
import type { PageDirection, ReadingProgress } from "../engine/types";
import { ControlButton } from "./ControlButton";

export type OverlayPanel = "source" | "contents" | "preferences" | "search" | "bookmarks";

export interface ReaderChromeProps {
  book: EpubBook;
  currentSection: EpubSection | null;
  currentSectionIndex: number;
  sectionCount: number;
  activePanel: OverlayPanel | null;
  progress: ReadingProgress | null;
  hasCurrentBookmark: boolean;
  onNavigate: (direction: PageDirection) => void;
  onTogglePanel: (panel: OverlayPanel) => void;
  onToggleBookmark: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const ICONS = {
  source: { name: "folder_open", decorative: true } satisfies IconDescriptor,
  contents: { name: "menu_book", decorative: true } satisfies IconDescriptor,
  search: { name: "search", decorative: true } satisfies IconDescriptor,
  bookmarks: { name: "bookmarks", decorative: true } satisfies IconDescriptor,
  bookmark: { name: "bookmark", decorative: true } satisfies IconDescriptor,
  bookmarkBorder: { name: "bookmark_border", decorative: true } satisfies IconDescriptor,
  preferences: { name: "tune", decorative: true } satisfies IconDescriptor,
  previous: { name: "chevron_left", decorative: true } satisfies IconDescriptor,
  next: { name: "chevron_right", decorative: true } satisfies IconDescriptor,
} as const;

export function ReaderChrome(props: ReaderChromeProps): React.ReactElement {
  const {
    book,
    currentSection,
    currentSectionIndex,
    sectionCount,
    activePanel,
    progress,
    hasCurrentBookmark,
    onNavigate,
    onTogglePanel,
    onToggleBookmark,
    t,
  } = props;

  const sectionLabel = t("book-reader.reader.sectionPosition", {
    current: currentSectionIndex + 1,
    total: Math.max(1, sectionCount),
  });
  const creatorLabel = book.metadata.creator?.trim() || t("book-reader.reader.unknownCreator");
  const sourceLabel = book.source.isRemote ? t("book-reader.reader.remoteSource") : t("book-reader.reader.localSource");
  const progressLabel =
    progress?.readingMode === "paginated"
      ? t("book-reader.reader.pagePosition", {
          current: progress.currentPage,
          total: progress.totalPages,
        })
      : progress
        ? t("book-reader.reader.bookProgress", {
            percentage: progress.bookPercentage,
          })
        : sourceLabel;

  return (
    <div className="book-reader-chrome" data-state="visible">
      <header className="book-reader-chrome__header">
        <div className="book-reader-metaCard">
          <div className="book-reader-metaCard__copy">
            <p className="book-reader-metaCard__eyebrow">{sectionLabel}</p>
            <h2 className="book-reader-metaCard__title">{currentSection?.title || book.metadata.title}</h2>
            <p className="book-reader-metaCard__meta">
              {book.metadata.title} · {creatorLabel} · {progressLabel}
            </p>
          </div>
          <span className="book-reader-metaCard__badge">{sourceLabel}</span>
        </div>
      </header>

      <div className="book-reader-chrome__navigation">
        <ControlButton
          label={t("book-reader.actions.previousPage")}
          icon={ICONS.previous}
          onClick={() => onNavigate("previous")}
          variant="nav"
        />
        <ControlButton
          label={t("book-reader.actions.nextPage")}
          icon={ICONS.next}
          onClick={() => onNavigate("next")}
          variant="nav"
        />
      </div>

      <div className="book-reader-chrome__dock">
        <ControlButton
          label={t("book-reader.actions.openLibrary")}
          icon={ICONS.source}
          onClick={() => onTogglePanel("source")}
          active={activePanel === "source"}
        />
        <ControlButton
          label={t("book-reader.actions.toggleToc")}
          icon={ICONS.contents}
          onClick={() => onTogglePanel("contents")}
          active={activePanel === "contents"}
        />
        <ControlButton
          label={t("book-reader.actions.toggleSearch")}
          icon={ICONS.search}
          onClick={() => onTogglePanel("search")}
          active={activePanel === "search"}
        />
        <ControlButton
          label={t("book-reader.actions.toggleBookmark")}
          icon={hasCurrentBookmark ? ICONS.bookmark : ICONS.bookmarkBorder}
          onClick={onToggleBookmark}
          active={hasCurrentBookmark}
        />
        <ControlButton
          label={t("book-reader.actions.openBookmarks")}
          icon={ICONS.bookmarks}
          onClick={() => onTogglePanel("bookmarks")}
          active={activePanel === "bookmarks"}
        />
        <ControlButton
          label={t("book-reader.actions.openPreferences")}
          icon={ICONS.preferences}
          onClick={() => onTogglePanel("preferences")}
          active={activePanel === "preferences"}
        />
      </div>
    </div>
  );
}

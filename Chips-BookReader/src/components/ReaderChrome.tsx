import React from "react";
import type { EpubBook, EpubSection } from "../domain/epub/types";
import type { ReadingProgress } from "../engine/types";
import type { BookReaderCommandId, BookReaderOverlayPanel } from "../commands/book-reader-commands";
import { BOOK_READER_COMMAND_IDS } from "../commands/book-reader-commands";
import { ControlButton } from "./ControlButton";

export type OverlayPanel = BookReaderOverlayPanel;

export interface ReaderChromeProps {
  book: EpubBook;
  currentSection: EpubSection | null;
  currentSectionIndex: number;
  sectionCount: number;
  activePanel: OverlayPanel | null;
  progress: ReadingProgress | null;
  hasCurrentBookmark: boolean;
  onInvokeCommand: (commandId: BookReaderCommandId) => void | Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ReaderChrome(props: ReaderChromeProps): React.ReactElement {
  const {
    book,
    currentSection,
    currentSectionIndex,
    sectionCount,
    activePanel,
    progress,
    hasCurrentBookmark,
    onInvokeCommand,
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
          icon={{ name: "chevron_left", decorative: true }}
          onClick={() => onInvokeCommand(BOOK_READER_COMMAND_IDS.previousPage)}
          variant="nav"
        />
        <ControlButton
          label={t("book-reader.actions.nextPage")}
          icon={{ name: "chevron_right", decorative: true }}
          onClick={() => onInvokeCommand(BOOK_READER_COMMAND_IDS.nextPage)}
          variant="nav"
        />
      </div>

      <div className="book-reader-chrome__dock">
        <ControlButton
          label={t("book-reader.actions.openLibrary")}
          icon={{ name: "folder_open", decorative: true }}
          onClick={() => onInvokeCommand(BOOK_READER_COMMAND_IDS.openSourcePanel)}
          active={activePanel === "source"}
        />
        <ControlButton
          label={t("book-reader.actions.toggleToc")}
          icon={{ name: "menu_book", decorative: true }}
          onClick={() => onInvokeCommand(BOOK_READER_COMMAND_IDS.toggleContents)}
          active={activePanel === "contents"}
        />
        <ControlButton
          label={t("book-reader.actions.toggleSearch")}
          icon={{ name: "search", decorative: true }}
          onClick={() => onInvokeCommand(BOOK_READER_COMMAND_IDS.toggleSearch)}
          active={activePanel === "search"}
        />
        <ControlButton
          label={t("book-reader.actions.toggleBookmark")}
          icon={{ name: hasCurrentBookmark ? "bookmark" : "bookmark_border", decorative: true }}
          onClick={() => onInvokeCommand(BOOK_READER_COMMAND_IDS.toggleBookmark)}
          active={hasCurrentBookmark}
        />
        <ControlButton
          label={t("book-reader.actions.openBookmarks")}
          icon={{ name: "bookmarks", decorative: true }}
          onClick={() => onInvokeCommand(BOOK_READER_COMMAND_IDS.toggleBookmarks)}
          active={activePanel === "bookmarks"}
        />
        <ControlButton
          label={t("book-reader.actions.openPreferences")}
          icon={{ name: "tune", decorative: true }}
          onClick={() => onInvokeCommand(BOOK_READER_COMMAND_IDS.togglePreferences)}
          active={activePanel === "preferences"}
        />
      </div>
    </div>
  );
}

import React from "react";
import type { Bookmark } from "../hooks/useBookmarks";
import { PanelShell } from "./PanelShell";

export interface BookmarkPanelProps {
  bookmarks: Bookmark[];
  activeBookmarkId?: string | null;
  onGoToBookmark: (bookmark: Bookmark) => void;
  onRemoveBookmark: (id: string) => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function formatBookmarkPosition(bookmark: Bookmark, t: BookmarkPanelProps["t"]): string {
  if (bookmark.readingMode === "paginated") {
    return t("book-reader.bookmarks.pageLabel", {
      page: bookmark.spreadIndex + 1,
    });
  }

  return t("book-reader.bookmarks.scrollLabel", {
    percentage: Math.round(bookmark.scrollFraction * 100),
  });
}

export function BookmarkPanel(props: BookmarkPanelProps): React.ReactElement {
  const { bookmarks, activeBookmarkId, onGoToBookmark, onRemoveBookmark, onClose, t } = props;

  const groups = bookmarks.reduce<Map<string, Bookmark[]>>((map, bookmark) => {
    const title = bookmark.sectionTitle || "Untitled";
    const bucket = map.get(title) ?? [];
    bucket.push(bookmark);
    map.set(title, bucket);
    return map;
  }, new Map());

  return (
    <PanelShell
      title={t("book-reader.labels.bookmarks")}
      eyebrow={t("book-reader.labels.appName")}
      onClose={onClose}
      className="book-reader-panel--bookmarks"
      t={t}
    >
      <div className="book-reader-bookmarks">
        <p className="book-reader-bookmarks__count">{t("book-reader.bookmarks.count", { count: bookmarks.length })}</p>

        {bookmarks.length === 0 ? <p className="book-reader-bookmarks__empty">{t("book-reader.bookmarks.empty")}</p> : null}

        {Array.from(groups.entries()).map(([sectionTitle, sectionBookmarks]) => (
          <section key={sectionTitle} className="book-reader-bookmarks__group">
            <h3>{sectionTitle}</h3>
            <div className="book-reader-bookmarks__items">
              {sectionBookmarks
                .slice()
                .sort((left, right) => right.createdAt - left.createdAt)
                .map((bookmark) => (
                  <article
                    key={bookmark.id}
                    className={`book-reader-bookmarks__item${activeBookmarkId === bookmark.id ? " book-reader-bookmarks__item--active" : ""}`}
                  >
                    <button
                      type="button"
                      className="book-reader-bookmarks__open"
                      onClick={() => onGoToBookmark(bookmark)}
                    >
                      <strong>{formatBookmarkPosition(bookmark, t)}</strong>
                      <span>{new Date(bookmark.createdAt).toLocaleString()}</span>
                    </button>
                    <button
                      type="button"
                      className="book-reader-bookmarks__remove"
                      onClick={() => onRemoveBookmark(bookmark.id)}
                    >
                      {t("book-reader.actions.removeBookmark")}
                    </button>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </PanelShell>
  );
}

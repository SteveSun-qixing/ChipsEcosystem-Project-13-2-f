import React from "react";
import type { EpubBook } from "../domain/epub/types";
import { NavigationTree } from "./NavigationTree";
import { PanelShell } from "./PanelShell";

export interface ContentsPanelProps {
  book: EpubBook;
  currentSectionIndex: number;
  onSelectSection: (index: number, fragment?: string) => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ContentsPanel(props: ContentsPanelProps): React.ReactElement {
  const { book, currentSectionIndex, onSelectSection, onClose, t } = props;

  return (
    <PanelShell
      title={t("book-reader.labels.contents")}
      eyebrow={book.metadata.title}
      onClose={onClose}
      className="book-reader-panel--contents"
      t={t}
    >
      <nav className="book-reader-nav" aria-label={t("book-reader.labels.contents")}>
        <NavigationTree
          items={book.navigation}
          currentSectionIndex={currentSectionIndex}
          onSelectSection={onSelectSection}
        />
      </nav>
    </PanelShell>
  );
}

import React from "react";

export interface EmptyStateProps {
  onOpenSource: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function EmptyState(props: EmptyStateProps): React.ReactElement {
  const { onOpenSource, t } = props;

  return (
    <div className="book-reader-empty">
      <div className="book-reader-empty__card">
        <span className="book-reader-empty__badge">{t("book-reader.empty.badge")}</span>
        <h1 className="book-reader-empty__title">{t("book-reader.empty.title")}</h1>
        <p className="book-reader-empty__description">{t("book-reader.empty.description")}</p>
        <button type="button" className="book-reader-empty__prompt" onClick={onOpenSource}>
          {t("book-reader.empty.prompt")}
        </button>
        <p className="book-reader-empty__hint">{t("book-reader.empty.dropHint")}</p>
        <p className="book-reader-empty__supported">{t("book-reader.empty.supportedFormat")}</p>
      </div>
    </div>
  );
}

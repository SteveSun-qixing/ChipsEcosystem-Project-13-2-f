import React from "react";
import type { SearchResult } from "../engine/search-engine";
import { PanelShell } from "./PanelShell";

export interface SearchPanelProps {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  statusLabel?: string | null;
  activeResultKey?: string | null;
  onQueryChange: (query: string) => void;
  onSelectResult: (result: SearchResult) => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function createResultKey(result: SearchResult): string {
  return `${result.sectionIndex}:${result.matchOffset}:${result.matchLength}:${result.query}`;
}

export function SearchPanel(props: SearchPanelProps): React.ReactElement {
  const {
    query,
    results,
    isSearching,
    statusLabel,
    activeResultKey,
    onQueryChange,
    onSelectResult,
    onClose,
    t,
  } = props;

  const groups = results.reduce<Map<string, SearchResult[]>>((map, result) => {
    const bucket = map.get(result.sectionTitle) ?? [];
    bucket.push(result);
    map.set(result.sectionTitle, bucket);
    return map;
  }, new Map());

  return (
    <PanelShell
      title={t("book-reader.labels.search")}
      eyebrow={t("book-reader.actions.search")}
      onClose={onClose}
      className="book-reader-panel--search"
      t={t}
    >
      <div className="book-reader-search">
        <label className="book-reader-search__field" htmlFor="book-reader-search-input">
          <span className="book-reader-visuallyHidden">{t("book-reader.actions.search")}</span>
          <input
            id="book-reader-search-input"
            type="search"
            value={query}
            autoFocus
            placeholder={t("book-reader.placeholders.search")}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>

        <p className="book-reader-search__status">
          {statusLabel ??
            (query.trim()
              ? isSearching
                ? t("book-reader.search.searching", { current: 0, total: 0 })
                : t("book-reader.search.results", { count: results.length })
              : t("book-reader.actions.search"))}
        </p>

        <div className="book-reader-search__results">
          {query.trim() && !isSearching && results.length === 0 ? (
            <p className="book-reader-search__empty">{t("book-reader.search.noResults")}</p>
          ) : null}

          {Array.from(groups.entries()).map(([sectionTitle, sectionResults]) => (
            <section key={sectionTitle} className="book-reader-search__group">
              <header className="book-reader-search__groupHeader">
                <h3>{sectionTitle}</h3>
                <span>{t("book-reader.search.matchesInSection", { count: sectionResults.length })}</span>
              </header>
              <div className="book-reader-search__items">
                {sectionResults.map((result) => {
                  const resultKey = createResultKey(result);
                  return (
                    <button
                      key={resultKey}
                      type="button"
                      className={`book-reader-search__item${activeResultKey === resultKey ? " book-reader-search__item--active" : ""}`}
                      onClick={() => onSelectResult(result)}
                    >
                      <span>{result.excerpt}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

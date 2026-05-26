import React, { useEffect, useMemo, useRef, useState } from "react";
import { createKeyboardMap, createRovingTabIndex, getRovingTabIndexProps } from "@chips/a11y";
import type { SearchResult } from "../engine/search-engine";
import { PanelShell } from "./PanelShell";

export interface SearchPanelProps {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  statusLabel?: string | null;
  activeResultKey?: string | null;
  restoreFocusElement?: HTMLElement | null;
  onQueryChange: (query: string) => void;
  onSelectResult: (result: SearchResult) => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function createResultKey(result: SearchResult): string {
  return `${result.sectionIndex}:${result.matchOffset}:${result.matchLength}:${result.query}`;
}

const SEARCH_RESULTS_KEYBOARD_MAP = createKeyboardMap({
  next: "ArrowDown",
  previous: "ArrowUp",
  first: "Home",
  last: "End",
});

interface SearchResultRow {
  id: string;
}

export function SearchPanel(props: SearchPanelProps): React.ReactElement {
  const {
    query,
    results,
    isSearching,
    statusLabel,
    activeResultKey,
    restoreFocusElement,
    onQueryChange,
    onSelectResult,
    onClose,
    t,
  } = props;
  const resultRefs = useRef(new Map<string, HTMLButtonElement>());

  const groups = useMemo(() => {
    return results.reduce<Map<string, SearchResult[]>>((map, result) => {
      const bucket = map.get(result.sectionTitle) ?? [];
      bucket.push(result);
      map.set(result.sectionTitle, bucket);
      return map;
    }, new Map());
  }, [results]);
  const resultRows = useMemo<SearchResultRow[]>(() => {
    return Array.from(groups.values()).flatMap((sectionResults) =>
      sectionResults.map((result) => ({
        id: createResultKey(result),
      })),
    );
  }, [groups]);
  const [activeRovingId, setActiveRovingId] = useState<string | null>(activeResultKey ?? null);
  const selectedResultExists = activeResultKey ? resultRows.some((row) => row.id === activeResultKey) : false;
  const roving = useMemo(
    () => createRovingTabIndex(resultRows, {
      activeId: activeRovingId ?? activeResultKey,
      selectedId: selectedResultExists ? activeResultKey : undefined,
      orientation: "vertical",
      loop: false,
    }),
    [activeResultKey, activeRovingId, resultRows, selectedResultExists],
  );

  useEffect(() => {
    setActiveRovingId(activeResultKey ?? resultRows[0]?.id ?? null);
  }, [activeResultKey, resultRows]);

  function focusResult(rowId: string): void {
    resultRefs.current.get(rowId)?.focus();
  }

  return (
    <PanelShell
      title={t("book-reader.labels.search")}
      eyebrow={t("book-reader.actions.search")}
      onClose={onClose}
      className="book-reader-panel--search"
      restoreFocusElement={restoreFocusElement}
      focusOnMount={false}
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
                  const rovingItem = roving.items.find((item) => item.id === resultKey);
                  const tabIndexProps = getRovingTabIndexProps(rovingItem);
                  return (
                    <button
                      ref={(element) => {
                        if (element) {
                          resultRefs.current.set(resultKey, element);
                        } else {
                          resultRefs.current.delete(resultKey);
                        }
                      }}
                      key={resultKey}
                      type="button"
                      className={`book-reader-search__item${activeResultKey === resultKey ? " book-reader-search__item--active" : ""}`}
                      tabIndex={tabIndexProps.tabIndex}
                      data-active={tabIndexProps["data-active"]}
                      aria-current={activeResultKey === resultKey ? "true" : undefined}
                      aria-label={t("book-reader.search.resultLabel", {
                        section: result.sectionTitle,
                        excerpt: result.excerpt,
                      })}
                      onClick={() => onSelectResult(result)}
                      onFocus={() => setActiveRovingId(resultKey)}
                      onKeyDown={(event) => {
                        const nextIndex = roving.getIndexByKey(event.nativeEvent, {
                          keyboardMap: SEARCH_RESULTS_KEYBOARD_MAP,
                          orientation: "vertical",
                          loop: false,
                        });

                        if (nextIndex >= 0) {
                          event.preventDefault();
                          const nextRow = roving.items[nextIndex]?.item;
                          if (nextRow) {
                            setActiveRovingId(nextRow.id);
                            focusResult(nextRow.id);
                          }
                        }
                      }}
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

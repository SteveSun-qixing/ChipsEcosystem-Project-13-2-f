import React, { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { EpubBook, EpubThemePalette, RenderedSectionDocument } from "../domain/epub/types";
import type { SearchResult } from "../engine/search-engine";
import { SearchEngine } from "../engine/search-engine";
import type { PageDirection, ReadingBoundary } from "../engine/types";
import { useBookmarks, type Bookmark } from "../hooks/useBookmarks";
import { useReaderEngine } from "../hooks/useReaderEngine";
import { useReaderInteraction } from "../hooks/useReaderInteraction";
import { useReaderProgress } from "../hooks/useReaderProgress";
import type { ReaderFeedback, ReaderPreferences } from "../utils/book-reader";
import { BookmarkPanel } from "./BookmarkPanel";
import { ContentsPanel } from "./ContentsPanel";
import { EmptyState } from "./EmptyState";
import { FeedbackToast } from "./FeedbackToast";
import { PreferencesPanel } from "./PreferencesPanel";
import { ProgressBar } from "./ProgressBar";
import { ReaderChrome, type OverlayPanel } from "./ReaderChrome";
import { SearchPanel } from "./SearchPanel";
import { SourcePanel } from "./SourcePanel";
import { ViewerStage } from "./ViewerStage";

function createSearchResultKey(result: SearchResult): string {
  return `${result.sectionIndex}:${result.matchOffset}:${result.matchLength}:${result.query}`;
}

function createBookmarkLookupPosition(
  sectionIndex: number,
  readingMode: ReaderPreferences["readingMode"],
  spreadIndex: number,
  scrollFraction: number,
) {
  return {
    sectionIndex,
    readingMode,
    spreadIndex,
    scrollFraction,
  } as const;
}

function isSameSearchResult(left: SearchResult | null, right: SearchResult | null): boolean {
  if (!left || !right) {
    return false;
  }

  return createSearchResultKey(left) === createSearchResultKey(right);
}

export interface ReaderShellProps {
  book: EpubBook | null;
  renderedSection: RenderedSectionDocument | null;
  currentSectionIndex: number;
  currentFragment?: string;
  feedback: ReaderFeedback | null;
  isResolving: boolean;
  isLoadingSection: boolean;
  preferences: ReaderPreferences;
  themePalette: EpubThemePalette;
  configClient: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    set<T = unknown>(key: string, value: T): Promise<void>;
  };
  onOpenFile: () => void | Promise<void>;
  onOpenUrl: (value: string) => void | Promise<void>;
  onSelectSection: (sectionIndex: number, fragment?: string) => void;
  onStepSection: (delta: number) => void;
  onUpdatePreferences: (next: ReaderPreferences) => void;
  onDropFiles: (files: File[]) => void | Promise<void>;
  onOpenExternalLink: (url: string) => void | Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ReaderShell(props: ReaderShellProps): React.ReactElement {
  const {
    book,
    renderedSection,
    currentSectionIndex,
    currentFragment,
    feedback,
    isResolving,
    isLoadingSection,
    preferences,
    themePalette,
    configClient,
    onOpenFile,
    onOpenUrl,
    onSelectSection,
    onStepSection,
    onUpdatePreferences,
    onDropFiles,
    onOpenExternalLink,
    t,
  } = props;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isChromeVisible, setIsChromeVisible] = useState(false);
  const [activePanel, setActivePanel] = useState<OverlayPanel | null>(null);
  const [pendingBoundary, setPendingBoundary] = useState<ReadingBoundary | null>(null);
  const [pendingBookmark, setPendingBookmark] = useState<Bookmark | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{ current: number; total: number } | null>(null);
  const [localFeedback, setLocalFeedback] = useState<ReaderFeedback | null>(null);

  const currentSection = book?.sections[currentSectionIndex] ?? null;
  const sectionCount = book?.sections.length ?? 0;
  const sectionIndexByPath = useMemo(() => {
    return new Map((book?.sections ?? []).map((section, index) => [section.path, index]));
  }, [book]);
  const sectionWeights = useMemo(() => {
    return book ? book.sections.map(() => 1) : [1];
  }, [book]);

  const {
    controller,
    frameDocument,
    isFrameLoading,
    navigatePage,
    navigateToBoundary,
    seekToFraction,
  } = useReaderEngine({
    iframeRef,
    renderedSection,
    preferences,
    themePalette,
    currentFragment,
    pendingBoundary,
    section: {
      index: currentSectionIndex,
      count: Math.max(1, sectionCount),
      title: currentSection?.title ?? book?.metadata.title ?? "",
      weights: sectionWeights,
    },
    onInitialLocationSettled: () => {
      setPendingBoundary(null);
    },
  });

  const { progress } = useReaderProgress({
    controller,
  });

  const {
    bookmarks,
    addBookmark,
    removeBookmark,
    findBookmarkAtPosition,
  } = useBookmarks({
    bookSourceId: book?.source.sourceId ?? null,
    configClient,
  });

  const currentAnchor = useMemo(() => {
    if (!progress) {
      return null;
    }

    const anchor = controller?.getCurrentAnchor();
    return {
      spreadIndex: anchor?.spreadIndex ?? Math.max(0, progress.currentPage - 1),
      scrollFraction: anchor?.scrollFraction ?? progress.sectionFraction,
    };
  }, [controller, progress]);

  const currentBookmark = useMemo(() => {
    if (!currentAnchor || !progress) {
      return null;
    }

    return findBookmarkAtPosition(
      createBookmarkLookupPosition(
        currentSectionIndex,
        preferences.readingMode,
        currentAnchor.spreadIndex,
        currentAnchor.scrollFraction,
      ),
    );
  }, [currentAnchor, currentSectionIndex, findBookmarkAtPosition, preferences.readingMode, progress]);

  const searchEngine = useMemo(() => {
    return book ? new SearchEngine(book) : null;
  }, [book]);

  const isViewerBusy = isResolving || isLoadingSection || isFrameLoading;
  const shouldShowChrome = Boolean(book) && (isChromeVisible || activePanel !== null);
  const displayedFeedback =
    feedback?.tone === "error"
      ? feedback
      : localFeedback ?? feedback;

  useReaderInteraction({
    book,
    controller,
    frameDocument,
    activePanel,
    preferences,
    sectionIndexByPath,
    onNavigate: handleNavigate,
    onNavigateBoundary: handleNavigateBoundary,
    onToggleChrome: () => {
      setIsChromeVisible((current) => !current);
    },
    onClosePanel: () => {
      setActivePanel(null);
    },
    onSelectSection: (sectionIndex, fragment) => {
      setPendingBoundary(null);
      setPendingBookmark(null);
      setActivePanel(null);
      onSelectSection(sectionIndex, fragment);
    },
    onOpenExternalLink,
    onUpdatePreferences,
  });

  useEffect(() => {
    if (!localFeedback || localFeedback.tone === "error") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLocalFeedback((current) => (current === localFeedback ? null : current));
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [localFeedback]);

  useEffect(() => {
    setActivePanel(null);
    setIsChromeVisible(false);
    setPendingBoundary(null);
    setPendingBookmark(null);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedSearchResult(null);
    setIsSearching(false);
    setSearchProgress(null);
    setLocalFeedback(null);
  }, [book?.source.sourceId]);

  useEffect(() => {
    if (!searchEngine) {
      setSearchResults([]);
      setSelectedSearchResult(null);
      setIsSearching(false);
      setSearchProgress(null);
      return;
    }

    const query = searchQuery.trim();
    searchEngine.cancel();

    if (!query) {
      setSearchResults([]);
      setSelectedSearchResult(null);
      setIsSearching(false);
      setSearchProgress(null);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchResults([]);
    setSelectedSearchResult(null);
    setSearchProgress({
      current: 0,
      total: book?.sections.length ?? 0,
    });

    void (async () => {
      try {
        for await (const batch of searchEngine.search(query, {
          onProgress: (current, total) => {
            if (!cancelled) {
              setSearchProgress({ current, total });
            }
          },
        })) {
          if (cancelled) {
            return;
          }

          startTransition(() => {
            setSearchResults((current) => [...current, ...batch]);
          });
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      searchEngine.cancel();
    };
  }, [book?.sections.length, searchEngine, searchQuery]);

  useEffect(() => {
    if (!controller || !pendingBookmark || pendingBookmark.sectionIndex !== currentSectionIndex) {
      return;
    }

    if (preferences.readingMode === "paginated" && pendingBookmark.readingMode === "paginated") {
      controller.goToSpread(pendingBookmark.spreadIndex, "smooth");
    } else {
      controller.goToProgress(pendingBookmark.scrollFraction, "smooth");
    }

    setPendingBookmark(null);
  }, [controller, currentSectionIndex, pendingBookmark, preferences.readingMode]);

  useEffect(() => {
    if (!frameDocument || !searchEngine) {
      return;
    }

    if (activePanel !== "search" || !searchQuery.trim()) {
      searchEngine.clearHighlights(frameDocument);
      return;
    }

    const currentSectionResults = searchResults.filter((result) => result.sectionIndex === currentSectionIndex);
    if (currentSectionResults.length === 0) {
      searchEngine.clearHighlights(frameDocument);
      return;
    }

    const currentResultIndex = selectedSearchResult
      ? Math.max(0, currentSectionResults.findIndex((result) => isSameSearchResult(result, selectedSearchResult)))
      : 0;

    searchEngine.highlightInDocument(frameDocument, currentSectionResults, currentResultIndex);

    return () => {
      searchEngine.clearHighlights(frameDocument);
    };
  }, [activePanel, currentSectionIndex, frameDocument, searchEngine, searchQuery, searchResults, selectedSearchResult]);

  const searchStatusLabel = useMemo(() => {
    if (!searchQuery.trim()) {
      return null;
    }

    if (isSearching && searchProgress) {
      return t("book-reader.search.searching", {
        current: searchProgress.current,
        total: searchProgress.total,
      });
    }

    return t("book-reader.search.results", {
      count: searchResults.length,
    });
  }, [isSearching, searchProgress, searchQuery, searchResults.length, t]);

  function openPanel(panel: OverlayPanel): void {
    setActivePanel((current) => (current === panel ? null : panel));
    setIsChromeVisible(true);
  }

  function handleNavigate(direction: PageDirection): void {
    if (!book) {
      return;
    }

    const result = navigatePage(direction);
    if (result?.moved) {
      return;
    }

    const delta = direction === "next" ? 1 : -1;
    const nextIndex = currentSectionIndex + delta;
    if (nextIndex < 0 || nextIndex >= sectionCount) {
      return;
    }

    setPendingBoundary(direction === "next" ? "start" : "end");
    onStepSection(delta);
  }

  function handleNavigateBoundary(boundary: ReadingBoundary): void {
    navigateToBoundary(boundary);
  }

  function handleStageClick(): void {
    if (activePanel) {
      setActivePanel(null);
      return;
    }

    setIsChromeVisible((current) => !current);
  }

  function handleToggleBookmark(): void {
    if (!book || !progress || !currentAnchor) {
      return;
    }

    if (currentBookmark) {
      removeBookmark(currentBookmark.id);
      setLocalFeedback({
        tone: "info",
        message: t("book-reader.feedback.bookmarkRemoved"),
      });
      return;
    }

    addBookmark({
      sectionIndex: currentSectionIndex,
      sectionTitle: currentSection?.title ?? book.metadata.title,
      spreadIndex: currentAnchor.spreadIndex,
      scrollFraction: currentAnchor.scrollFraction,
      readingMode: preferences.readingMode,
    });
    setLocalFeedback({
      tone: "success",
      message: t("book-reader.feedback.bookmarkAdded"),
    });
  }

  function handleOpenBookmark(bookmark: Bookmark): void {
    if (bookmark.sectionIndex !== currentSectionIndex) {
      setPendingBookmark(bookmark);
      onSelectSection(bookmark.sectionIndex);
    } else if (controller) {
      if (preferences.readingMode === "paginated" && bookmark.readingMode === "paginated") {
        controller.goToSpread(bookmark.spreadIndex, "smooth");
      } else {
        controller.goToProgress(bookmark.scrollFraction, "smooth");
      }
    }

    setActivePanel(null);
    setIsChromeVisible(true);
  }

  function handleSearchResult(result: SearchResult): void {
    setSelectedSearchResult(result);
    setIsChromeVisible(true);

    if (result.sectionIndex !== currentSectionIndex) {
      onSelectSection(result.sectionIndex);
    }
  }

  return (
    <main
      className={`book-reader-shell${isDragActive ? " book-reader-shell--dragActive" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget === event.target) {
          setIsDragActive(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) {
          void onDropFiles(files);
        }
      }}
    >
      <div className="book-reader-stage">
        {book ? (
          <ViewerStage
            iframeRef={iframeRef}
            title={currentSection?.title ?? book.metadata.title}
            isLoading={isViewerBusy}
            onClick={handleStageClick}
            t={t}
          >
            {shouldShowChrome ? (
              <>
                <ReaderChrome
                  book={book}
                  currentSection={currentSection}
                  currentSectionIndex={currentSectionIndex}
                  sectionCount={sectionCount}
                  activePanel={activePanel}
                  progress={progress}
                  hasCurrentBookmark={Boolean(currentBookmark)}
                  onNavigate={handleNavigate}
                  onTogglePanel={openPanel}
                  onToggleBookmark={handleToggleBookmark}
                  t={t}
                />
                <ProgressBar progress={progress} onSeek={seekToFraction} t={t} />
              </>
            ) : null}
          </ViewerStage>
        ) : (
          <EmptyState
            onOpenSource={() => {
              openPanel("source");
            }}
            t={t}
          />
        )}

        {book && activePanel === "contents" ? (
          <ContentsPanel
            book={book}
            currentSectionIndex={currentSectionIndex}
            onSelectSection={(sectionIndex, fragment) => {
              setActivePanel(null);
              onSelectSection(sectionIndex, fragment);
            }}
            onClose={() => setActivePanel(null)}
            t={t}
          />
        ) : null}

        {activePanel === "source" ? (
          <SourcePanel
            initialUrl=""
            onOpenFile={onOpenFile}
            onOpenUrl={onOpenUrl}
            onClose={() => setActivePanel(null)}
            t={t}
          />
        ) : null}

        {activePanel === "preferences" ? (
          <PreferencesPanel
            preferences={preferences}
            onUpdatePreferences={onUpdatePreferences}
            onClose={() => setActivePanel(null)}
            t={t}
          />
        ) : null}

        {activePanel === "search" ? (
          <SearchPanel
            query={searchQuery}
            results={searchResults}
            isSearching={isSearching}
            statusLabel={searchStatusLabel}
            activeResultKey={selectedSearchResult ? createSearchResultKey(selectedSearchResult) : null}
            onQueryChange={setSearchQuery}
            onSelectResult={handleSearchResult}
            onClose={() => setActivePanel(null)}
            t={t}
          />
        ) : null}

        {activePanel === "bookmarks" ? (
          <BookmarkPanel
            bookmarks={bookmarks}
            activeBookmarkId={currentBookmark?.id ?? null}
            onGoToBookmark={handleOpenBookmark}
            onRemoveBookmark={removeBookmark}
            onClose={() => setActivePanel(null)}
            t={t}
          />
        ) : null}

        <FeedbackToast feedback={displayedFeedback} />
      </div>
    </main>
  );
}

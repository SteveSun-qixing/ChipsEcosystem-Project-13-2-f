import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChipsCommandPalette,
  ChipsCommandProvider,
  ChipsMenuBar,
  ChipsToolbar,
} from "@chips/component-library";
import type { Client, CommandInvocationContext, CommandSource } from "chips-sdk";
import type { EpubBook, EpubThemePalette, RenderedSectionDocument } from "../domain/epub/types";
import type { SearchResult } from "../engine/search-engine";
import { SearchEngine } from "../engine/search-engine";
import type { PageDirection, ReadingBoundary } from "../engine/types";
import { useBookmarks, type Bookmark } from "../hooks/useBookmarks";
import { useReaderEngine } from "../hooks/useReaderEngine";
import { useReaderInteraction } from "../hooks/useReaderInteraction";
import { useReaderProgress } from "../hooks/useReaderProgress";
import { useBookReaderCommands } from "../commands/useBookReaderCommands";
import {
  BOOK_READER_COMMAND_HANDLER_IDS,
  createBookReaderCommandInvocationContext,
  type BookReaderCommandId,
  type BookReaderCommandRuntimeState,
} from "../commands/book-reader-commands";
import {
  clampContentWidth,
  clampFontScale,
  type ReaderFeedback,
  type ReaderPreferences,
} from "../utils/book-reader";
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
  commandClient?: Client;
  commandContext?: CommandInvocationContext;
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
    commandClient,
    commandContext,
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
  const commandRuntimeState = useMemo<BookReaderCommandRuntimeState>(() => ({
    hasBook: Boolean(book),
    activePanel,
    hasCurrentBookmark: Boolean(currentBookmark),
    readingMode: preferences.readingMode,
    isBusy: isViewerBusy,
    canPreviousSection: currentSectionIndex > 0,
    canNextSection: currentSectionIndex < sectionCount - 1,
  }), [
    activePanel,
    book,
    currentBookmark,
    currentSectionIndex,
    isViewerBusy,
    preferences.readingMode,
    sectionCount,
  ]);
  const baseCommandContext = useMemo(
    () => createBookReaderCommandInvocationContext({
      pluginId: commandContext?.pluginId,
      sceneId: commandContext?.sceneId,
      surfaceId: typeof commandContext?.surfaceId === "string" ? commandContext.surfaceId : null,
      documentId: book?.source.sourceId ?? commandContext?.documentId as string | undefined,
      componentId: "book-reader.reader-shell",
    }),
    [
      book?.source.sourceId,
      commandContext?.documentId,
      commandContext?.pluginId,
      commandContext?.sceneId,
      commandContext?.surfaceId,
    ],
  );
  const commands = useBookReaderCommands({
    client: commandClient,
    invocationContext: baseCommandContext,
    runtimeState: commandRuntimeState,
  });
  const {
    adapter: commandAdapter,
    commandViews,
    phase: commandPhase,
    errorCode: commandErrorCode,
    invocationContext: commandInvocationContext,
    invokeCommand,
    registerHandler,
  } = commands;
  const invokeReaderCommand = useCallback(
    (
      commandId: BookReaderCommandId,
      source: CommandSource = "api",
      payload?: Record<string, unknown>,
      contextPatch?: CommandInvocationContext,
    ) => {
      void invokeCommand(commandId, source, payload, contextPatch);
    },
    [invokeCommand],
  );

  useReaderInteraction({
    book,
    controller,
    frameDocument,
    activePanel,
    preferences,
    sectionIndexByPath,
    onNavigate: handleNavigate,
    onNavigateBoundary: handleNavigateBoundary,
    onInvokeCommand: (commandId) => invokeReaderCommand(commandId, "shortcut"),
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
    const unregisterHandlers = [
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.openSourcePanel, () => {
        openPanel("source");
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.openFile, () => {
        void onOpenFile();
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.openUrl, (status) => {
        const url = typeof status.payload?.url === "string" ? status.payload.url.trim() : "";
        if (url) {
          void onOpenUrl(url);
        }
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.toggleContents, () => {
        openPanel("contents");
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.toggleSearch, () => {
        openPanel("search");
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.toggleBookmarks, () => {
        openPanel("bookmarks");
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.togglePreferences, () => {
        openPanel("preferences");
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.closePanel, () => {
        setActivePanel(null);
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.previousPage, () => {
        handleNavigate("previous");
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.nextPage, () => {
        handleNavigate("next");
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.previousSection, () => {
        if (currentSectionIndex > 0) {
          setPendingBoundary("end");
          onStepSection(-1);
        }
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.nextSection, () => {
        if (currentSectionIndex < sectionCount - 1) {
          setPendingBoundary("start");
          onStepSection(1);
        }
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.goSectionStart, () => {
        handleNavigateBoundary("start");
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.goSectionEnd, () => {
        handleNavigateBoundary("end");
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.decreaseFont, () => {
        onUpdatePreferences({
          ...preferences,
          fontScale: clampFontScale(preferences.fontScale - 0.1),
        });
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.increaseFont, () => {
        onUpdatePreferences({
          ...preferences,
          fontScale: clampFontScale(preferences.fontScale + 0.1),
        });
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.narrowContent, () => {
        onUpdatePreferences({
          ...preferences,
          contentWidth: clampContentWidth(preferences.contentWidth - 40),
        });
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.widenContent, () => {
        onUpdatePreferences({
          ...preferences,
          contentWidth: clampContentWidth(preferences.contentWidth + 40),
        });
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.toggleBookmark, () => {
        handleToggleBookmark();
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.readingModePaginated, () => {
        onUpdatePreferences({ ...preferences, readingMode: "paginated" });
      }),
      registerHandler(BOOK_READER_COMMAND_HANDLER_IDS.readingModeScroll, () => {
        onUpdatePreferences({ ...preferences, readingMode: "scroll" });
      }),
    ];

    return () => {
      for (const unregister of unregisterHandlers) {
        unregister();
      }
    };
  }, [
    currentSectionIndex,
    onOpenFile,
    onOpenUrl,
    onStepSection,
    onUpdatePreferences,
    preferences,
    registerHandler,
    sectionCount,
  ]);

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

  const shell = (
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
                  onInvokeCommand={(commandId) => invokeReaderCommand(commandId, "toolbar")}
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
            onInvokeCommand={(commandId) => invokeReaderCommand(commandId, "api")}
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
            onInvokeCommand={(commandId, payload) => invokeReaderCommand(commandId, "toolbar", payload)}
            onClose={() => setActivePanel(null)}
            t={t}
          />
        ) : null}

        {activePanel === "preferences" ? (
          <PreferencesPanel
            preferences={preferences}
            onUpdatePreferences={onUpdatePreferences}
            onInvokeCommand={(commandId) => invokeReaderCommand(commandId, "toolbar")}
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

  return (
    <ChipsCommandProvider
      adapter={commandAdapter ?? undefined}
      commands={commandViews}
      i18n={t}
      query={{ includeDisabled: true }}
    >
      <div
        className="book-reader-commandChrome"
        data-command-phase={commandPhase}
      >
        <ChipsMenuBar
          adapter={commandAdapter ?? undefined}
          commands={commandViews}
          menus={[
            { menuId: "file", label: t("book-reader.commands.menu.file") },
            { menuId: "edit", label: t("book-reader.commands.menu.edit") },
            { menuId: "view", label: t("book-reader.commands.menu.view") },
            { menuId: "navigate", label: t("book-reader.commands.menu.navigate") },
            { menuId: "bookmarks", label: t("book-reader.commands.menu.bookmarks") },
          ]}
          i18n={t}
          ariaLabel={t("book-reader.commands.menu.ariaLabel")}
          invocationContext={commandInvocationContext}
          disabled={commandPhase === "error"}
        />
        <ChipsToolbar
          adapter={commandAdapter ?? undefined}
          commands={commandViews}
          toolbarId="reader"
          i18n={t}
          ariaLabel={t("book-reader.commands.toolbar.ariaLabel")}
          invocationContext={commandInvocationContext}
          disabled={commandPhase === "error"}
        />
        <ChipsCommandPalette
          adapter={commandAdapter ?? undefined}
          commands={commandViews}
          i18n={t}
          commandQuery={{ includeDisabled: true }}
          invocationContext={commandInvocationContext}
          ariaLabel={t("book-reader.commands.palette.ariaLabel")}
          inputPlaceholder={t("book-reader.commands.palette.placeholder")}
          disabled={commandPhase === "error"}
        />
        {commandErrorCode ? (
          <span role="status" className="book-reader-commandChrome__status">
            {commandErrorCode}
          </span>
        ) : null}
      </div>
      {shell}
    </ChipsCommandProvider>
  );
}

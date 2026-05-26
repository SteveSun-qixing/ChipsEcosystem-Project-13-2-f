import React, { startTransition } from "react";
import type { Client, PlatformLaunchContext, SurfaceContext } from "chips-sdk";
import { appConfig } from "../../config/app-config";
import { createLogger, createTraceId } from "../../config/logging";
import { ReaderShell } from "../components/ReaderShell";
import { loadReadableBook } from "../domain/book/virtual-book";
import { renderSectionDocument } from "../domain/epub/markup";
import type { EpubBook, EpubThemePalette, RenderedSectionDocument } from "../domain/epub/types";
import { resolveLocaleDirection } from "../i18n/messages";
import { useBookReaderText, type BookReaderTextResolver } from "../i18n/useBookReaderText";
import { chipsClient } from "../runtime/chips-client";
import { readLaunchContext } from "../runtime/launch-context";
import {
  readRendererThemePalette,
  resolveReaderThemePalette,
} from "../runtime/theme-runtime";
import { normalizeBinaryContent } from "../utils/binary";
import {
  createBookSourceDescriptor,
  isLikelyLocalPath,
  isProbablyRemoteBookSource,
  isSupportedBookResource,
  normalizeReaderPreferences,
  resolveFileName,
  SUPPORTED_BOOK_EXTENSION_LABEL,
  type LaunchBookTarget,
  type ReaderFeedback,
  type ReaderPreferences,
} from "../utils/book-reader";
import { resolveLaunchBookTarget } from "../utils/launch-resource";
import {
  getSceneDefinition,
  getSceneIdForReaderState,
  type BookReaderSceneDefinition,
  type BookReaderSceneId,
} from "./scene-registry";

export interface BookReaderRuntimeEnvironment {
  appId: string;
  pluginId: string;
  hostSceneId: string;
  activeSceneId: BookReaderSceneId;
  surfaceId: string | null;
  sessionId: string | null;
  surfaceKind: string;
  launchParams: Record<string, unknown>;
}

export interface BookReaderRuntimeValue {
  client: Client;
  traceId: string;
  launchContext: PlatformLaunchContext;
  surface: SurfaceContext | null;
  environment: BookReaderRuntimeEnvironment;
  activeSceneId: BookReaderSceneId;
  activeScene: BookReaderSceneDefinition;
  book: EpubBook | null;
  renderedSection: RenderedSectionDocument | null;
  currentSectionIndex: number;
  currentFragment?: string;
  feedback: ReaderFeedback | null;
  isResolving: boolean;
  isLoadingSection: boolean;
  preferences: ReaderPreferences;
  themePalette: EpubThemePalette;
  locale: string;
  t: BookReaderTextResolver;
  openBookTarget(target: LaunchBookTarget): Promise<void>;
  openFile(): Promise<void>;
  openUrl(sourceValue: string): Promise<void>;
  dropFiles(files: File[]): Promise<void>;
  selectSection(sectionIndex: number, fragment?: string): void;
  stepSection(delta: number): void;
  updatePreferences(next: ReaderPreferences): void;
  renderReaderShell(): React.ReactElement;
}

const AppRuntimeContext = React.createContext<BookReaderRuntimeValue | null>(null);

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallbackMessage;
}

function unwrapBinaryPayload(value: unknown): string | Uint8Array | ArrayBuffer {
  if (value && typeof value === "object") {
    if ("data" in value) {
      const data = (value as { data?: unknown }).data;
      if (data instanceof Uint8Array || data instanceof ArrayBuffer || typeof data === "string") {
        return data;
      }
    }

    if ("content" in value) {
      const content = (value as { content?: unknown }).content;
      if (content instanceof Uint8Array || content instanceof ArrayBuffer || typeof content === "string") {
        return content;
      }
    }
  }

  if (value instanceof Uint8Array || value instanceof ArrayBuffer || typeof value === "string") {
    return value;
  }

  throw new Error("无法识别的电子书二进制结果。");
}

function resolveLocalBookPath(target: LaunchBookTarget): string | undefined {
  const directFilePath = target.filePath?.trim();
  if (directFilePath) {
    return directFilePath;
  }

  const sourceId = target.sourceId.trim();
  if (!sourceId) {
    return undefined;
  }

  if (sourceId.startsWith("file://")) {
    try {
      return decodeURIComponent(new URL(sourceId).pathname);
    } catch {
      return undefined;
    }
  }

  return isLikelyLocalPath(sourceId) && !isProbablyRemoteBookSource(sourceId) ? sourceId : undefined;
}

function resolveHostSceneId(launchContext: PlatformLaunchContext): string {
  return launchContext.surfaceContext?.sceneId ?? launchContext.sceneId ?? appConfig.defaultSceneId;
}

function resolveSurfaceKind(launchContext: PlatformLaunchContext): string {
  return launchContext.surfaceContext?.kind ?? launchContext.kind ?? "window";
}

function resolveLaunchParams(launchContext: PlatformLaunchContext): Record<string, unknown> {
  return {
    ...launchContext.surfaceContext?.launchParams,
    ...launchContext.launchParams,
  };
}

export interface AppRuntimeProviderProps {
  children: React.ReactNode;
}

export function AppRuntimeProvider({ children }: AppRuntimeProviderProps): React.ReactElement {
  const client = chipsClient;
  const traceId = React.useMemo(() => createTraceId("book-reader"), []);
  const logger = React.useMemo(
    () =>
      createLogger({
        scope: "app-runtime",
        traceId,
      }),
    [traceId],
  );
  const [launchContext, setLaunchContext] = React.useState<PlatformLaunchContext>(() => readLaunchContext(client));
  const [book, setBook] = React.useState<EpubBook | null>(null);
  const [renderedSection, setRenderedSection] = React.useState<RenderedSectionDocument | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = React.useState(0);
  const [currentFragment, setCurrentFragment] = React.useState<string | undefined>();
  const [feedback, setFeedback] = React.useState<ReaderFeedback | null>(null);
  const [isResolving, setIsResolving] = React.useState(false);
  const [isLoadingSection, setIsLoadingSection] = React.useState(false);
  const [preferences, setPreferences] = React.useState<ReaderPreferences>(appConfig.defaultPreferences);
  const [themePalette, setThemePalette] = React.useState<EpubThemePalette>(() => readRendererThemePalette());
  const launchHandledRef = React.useRef(false);
  const { locale, text } = useBookReaderText();

  const t = text;

  const readBookBytes = React.useCallback(async (target: LaunchBookTarget): Promise<{ bytes: Uint8Array; mimeType?: string }> => {
    const localPath = resolveLocalBookPath(target);

    if (localPath) {
      const fileContent = await client.file.read(localPath, {
        encoding: "binary",
      });
      return {
        bytes: normalizeBinaryContent(unwrapBinaryPayload(fileContent)),
        mimeType: target.mimeType,
      };
    }

    if (isProbablyRemoteBookSource(target.sourceId)) {
      const response = await fetch(target.sourceId, {
        headers: {
          Accept: "application/epub+zip, application/pdf, text/plain, text/markdown, application/x-fictionbook+xml, application/rtf, application/octet-stream;q=0.9, */*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`远程电子书下载失败：${response.status} ${response.statusText}`);
      }

      const headerMimeType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        mimeType: target.mimeType ?? headerMimeType,
      };
    }

    const resourceBinary = await client.resource.readBinary(target.sourceId);
    return {
      bytes: normalizeBinaryContent(unwrapBinaryPayload(resourceBinary)),
      mimeType: target.mimeType,
    };
  }, [client]);

  const resolveBookResourceUri = React.useCallback(async (target: LaunchBookTarget): Promise<string | undefined> => {
    if (isProbablyRemoteBookSource(target.sourceId)) {
      return target.sourceId;
    }

    try {
      return (await client.resource.resolve(target.filePath ?? target.sourceId)).uri;
    } catch {
      return undefined;
    }
  }, [client]);

  const openBookTarget = React.useCallback(async (target: LaunchBookTarget): Promise<void> => {
    const sourceId = target.sourceId.trim();
    if (!sourceId) {
      setFeedback({
        tone: "error",
        message: t("book-reader.errors.missingTarget"),
      });
      return;
    }

    setIsResolving(true);
    setFeedback(null);

    try {
      const payload = await readBookBytes(target);
      const resourceUri = await resolveBookResourceUri(target);
      const normalizedTarget: LaunchBookTarget = {
        ...target,
        filePath: resolveLocalBookPath(target),
        fileName: target.fileName?.trim() || resolveFileName(target.filePath ?? sourceId),
        mimeType: target.mimeType ?? payload.mimeType,
      };

      if (!isSupportedBookResource(normalizedTarget)) {
        setFeedback({
          tone: "error",
          message: t("book-reader.errors.unsupportedFile", {
            extensions: SUPPORTED_BOOK_EXTENSION_LABEL,
          }),
        });
        return;
      }

      const nextBook = await loadReadableBook({
        bytes: payload.bytes,
        source: {
          ...createBookSourceDescriptor(normalizedTarget),
          resourceUri,
        },
      });

      startTransition(() => {
        setBook(nextBook);
        setRenderedSection(null);
        setCurrentSectionIndex(0);
        setCurrentFragment(undefined);
      });

      logger.info("电子书已加载完成", {
        sourceId: nextBook.source.sourceId,
        filePath: nextBook.source.filePath,
        title: nextBook.metadata.title,
      });
    } catch (error) {
      logger.error("打开电子书失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("book-reader.errors.openFailed")),
      });
    } finally {
      setIsResolving(false);
    }
  }, [logger, readBookBytes, resolveBookResourceUri, t]);

  const openFile = React.useCallback(async (): Promise<void> => {
    try {
      const selected = await client.platform.openFile({
        title: t("book-reader.dialogs.openFileTitle"),
        mode: "file",
        allowMultiple: false,
        mustExist: true,
      });
      const filePath = Array.isArray(selected) ? selected[0] : undefined;
      if (filePath) {
        await openBookTarget({
          sourceId: filePath,
          filePath,
          fileName: resolveFileName(filePath),
        });
      }
    } catch (error) {
      logger.error("调用系统文件选择器失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("book-reader.errors.openFailed")),
      });
    }
  }, [client, logger, openBookTarget, t]);

  const openUrl = React.useCallback(async (sourceValue: string): Promise<void> => {
    const nextValue = sourceValue.trim();
    if (!nextValue) {
      setFeedback({
        tone: "error",
        message: t("book-reader.errors.invalidUrl"),
      });
      return;
    }

    try {
      const url = new URL(nextValue);
      await openBookTarget({
        sourceId: url.href,
        fileName: resolveFileName(url.href),
      });
    } catch {
      setFeedback({
        tone: "error",
        message: t("book-reader.errors.invalidUrl"),
      });
    }
  }, [openBookTarget, t]);

  const dropFiles = React.useCallback(async (files: File[]): Promise<void> => {
    const candidate = files.find((file) => file.size > 0);
    if (!candidate) {
      return;
    }

    const bridgePath = client.platform.getPathForFile(candidate);
    const filePath = bridgePath || (candidate as File & { path?: string }).path || "";
    if (!filePath) {
      setFeedback({
        tone: "error",
        message: t("book-reader.errors.openFailed"),
      });
      return;
    }

    await openBookTarget({
      sourceId: filePath,
      filePath,
      fileName: resolveFileName(filePath),
    });
  }, [client, openBookTarget, t]);

  const selectSection = React.useCallback((sectionIndex: number, fragment?: string): void => {
    if (!book) {
      return;
    }

    const boundedIndex = Math.max(0, Math.min(book.sections.length - 1, sectionIndex));
    setCurrentSectionIndex(boundedIndex);
    setCurrentFragment(fragment);
  }, [book]);

  const stepSection = React.useCallback((delta: number): void => {
    setCurrentSectionIndex((current) => {
      if (!book) {
        return current;
      }
      const boundedIndex = Math.max(0, Math.min(book.sections.length - 1, current + delta));
      setCurrentFragment(undefined);
      return boundedIndex;
    });
  }, [book]);

  const updatePreferences = React.useCallback((next: ReaderPreferences): void => {
    setPreferences(normalizeReaderPreferences(next));
  }, []);

  React.useEffect(() => {
    if (appConfig.featureFlags.enableDiagnosticsLogging) {
      logger.info("阅读器运行时已初始化", {
        appId: appConfig.appId,
        diagnosticsLogging: appConfig.featureFlags.enableDiagnosticsLogging,
      });
    }

    return () => {
      logger.info("阅读器运行时已卸载");
    };
  }, [logger]);

  React.useEffect(() => {
    if (launchHandledRef.current) {
      return;
    }

    launchHandledRef.current = true;
    const nextLaunchContext = readLaunchContext(client);
    setLaunchContext(nextLaunchContext);
    const launchTarget = resolveLaunchBookTarget(nextLaunchContext);
    if (!launchTarget) {
      return;
    }

    logger.info("检测到启动参数中的电子书目标", {
      sourceId: launchTarget.sourceId,
      filePath: launchTarget.filePath,
    });
    void openBookTarget(launchTarget);
  }, [client, logger, openBookTarget]);

  React.useEffect(() => {
    const unsubscribeTheme = client.theme.onChanged(() => {
      window.setTimeout(() => {
        setThemePalette(readRendererThemePalette());
      }, 0);
    });

    return () => {
      unsubscribeTheme();
    };
  }, [client]);

  React.useEffect(() => {
    if (!book) {
      setRenderedSection(null);
      return;
    }

    const section = book.sections[currentSectionIndex];
    if (!section) {
      return;
    }

    let cancelled = false;
    setIsLoadingSection(true);

    renderSectionDocument(book, section.path)
      .then((document) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setRenderedSection(document);
        });
      })
      .catch((error) => {
        logger.error("渲染章节失败", error);
        setFeedback({
          tone: "error",
          message: resolveErrorMessage(error, t("book-reader.errors.renderFailed")),
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSection(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [book, currentSectionIndex, logger, t]);

  React.useEffect(() => {
    if (!feedback || feedback.tone === "error") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback((current) => (current === feedback ? null : current));
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  React.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousLang = document.documentElement.getAttribute("lang");
    const previousDir = document.documentElement.getAttribute("dir");
    const previousLocale = document.documentElement.getAttribute("data-chips-locale");
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", resolveLocaleDirection(locale));
    document.documentElement.setAttribute("data-chips-locale", locale);

    return () => {
      if (previousLang === null) {
        document.documentElement.removeAttribute("lang");
      } else {
        document.documentElement.setAttribute("lang", previousLang);
      }
      if (previousDir === null) {
        document.documentElement.removeAttribute("dir");
      } else {
        document.documentElement.setAttribute("dir", previousDir);
      }
      if (previousLocale === null) {
        document.documentElement.removeAttribute("data-chips-locale");
      } else {
        document.documentElement.setAttribute("data-chips-locale", previousLocale);
      }
    };
  }, [locale]);

  const activeSceneId = getSceneIdForReaderState({ book, feedback });
  const activeScene = getSceneDefinition(activeSceneId);
  const environment = React.useMemo<BookReaderRuntimeEnvironment>(() => ({
    appId: appConfig.appId,
    pluginId: launchContext.surfaceContext?.pluginId ?? launchContext.pluginId ?? appConfig.appId,
    hostSceneId: resolveHostSceneId(launchContext),
    activeSceneId,
    surfaceId: launchContext.surfaceContext?.surfaceId ?? launchContext.surfaceId ?? null,
    sessionId: launchContext.surfaceContext?.sessionId ?? launchContext.sessionId ?? null,
    surfaceKind: resolveSurfaceKind(launchContext),
    launchParams: resolveLaunchParams(launchContext),
  }), [activeSceneId, launchContext]);

  const readerThemePalette = React.useMemo(
    () => resolveReaderThemePalette(themePalette, preferences),
    [preferences, themePalette],
  );

  const renderReaderShell = React.useCallback(() => (
    <ReaderShell
      book={book}
      renderedSection={renderedSection}
      currentSectionIndex={currentSectionIndex}
      currentFragment={currentFragment}
      feedback={feedback}
      isResolving={isResolving}
      isLoadingSection={isLoadingSection}
      preferences={preferences}
      themePalette={readerThemePalette}
      configClient={client.config}
      onOpenFile={openFile}
      onOpenUrl={openUrl}
      onSelectSection={selectSection}
      onStepSection={stepSection}
      onUpdatePreferences={updatePreferences}
      onDropFiles={dropFiles}
      onOpenExternalLink={(url) => client.platform.openExternal(url)}
      commandClient={client}
      commandContext={{
        pluginId: environment.pluginId,
        sceneId: environment.hostSceneId,
        surfaceId: environment.surfaceId ?? undefined,
        documentId: book?.source.sourceId,
        componentId: "book-reader.reader-shell",
      }}
      t={t}
    />
  ), [
    book,
    client,
    currentFragment,
    currentSectionIndex,
    dropFiles,
    feedback,
    isLoadingSection,
    isResolving,
    openFile,
    openUrl,
    preferences,
    readerThemePalette,
    renderedSection,
    selectSection,
    stepSection,
    t,
    updatePreferences,
    environment.hostSceneId,
    environment.pluginId,
    environment.surfaceId,
  ]);

  const value = React.useMemo<BookReaderRuntimeValue>(() => ({
    client,
    traceId,
    launchContext,
    surface: launchContext.surfaceContext ?? null,
    environment,
    activeSceneId,
    activeScene,
    book,
    renderedSection,
    currentSectionIndex,
    currentFragment,
    feedback,
    isResolving,
    isLoadingSection,
    preferences,
    themePalette: readerThemePalette,
    locale,
    t,
    openBookTarget,
    openFile,
    openUrl,
    dropFiles,
    selectSection,
    stepSection,
    updatePreferences,
    renderReaderShell,
  }), [
    activeScene,
    activeSceneId,
    book,
    client,
    currentFragment,
    currentSectionIndex,
    dropFiles,
    environment,
    feedback,
    isLoadingSection,
    isResolving,
    launchContext,
    locale,
    openBookTarget,
    openFile,
    openUrl,
    preferences,
    readerThemePalette,
    renderedSection,
    renderReaderShell,
    selectSection,
    stepSection,
    t,
    traceId,
    updatePreferences,
  ]);

  return <AppRuntimeContext.Provider value={value}>{children}</AppRuntimeContext.Provider>;
}

export function useAppRuntime(): BookReaderRuntimeValue {
  const context = React.useContext(AppRuntimeContext);
  if (!context) {
    throw new Error("AppRuntimeContext is not available.");
  }

  return context;
}

import React, { startTransition, useEffect, useRef, useState } from "react";
import { ChipsThemeProvider } from "@chips/component-library";
import type { ThemeState } from "chips-sdk";
import { ReaderShell } from "./components/ReaderShell";
import { renderSectionDocument } from "./domain/epub/markup";
import { loadEpubBook } from "./domain/epub/package";
import type { EpubThemePalette, EpubBook, RenderedSectionDocument } from "./domain/epub/types";
import { formatMessage, resolveLocale } from "./i18n/messages";
import { useChipsBridge } from "./hooks/useChipsBridge";
import { useChipsClient } from "./hooks/useChipsClient";
import { normalizeBinaryContent } from "./utils/binary";
import {
  appConfig,
} from "../config/app-config";
import { createLogger } from "../config/logging";
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
} from "./utils/book-reader";
import { resolveLaunchBookTarget } from "./utils/launch-resource";

interface ThemeSnapshot {
  themeId: string;
  version: string;
}

const DEFAULT_THEME_STATE: ThemeSnapshot = {
  themeId: "chips-official.default-theme",
  version: "1.0.0",
};

function readDocumentThemeState(): ThemeSnapshot {
  if (typeof document === "undefined") {
    return DEFAULT_THEME_STATE;
  }

  const root = document.documentElement;
  const themeId = root.getAttribute("data-chips-theme-id");
  const version = root.getAttribute("data-chips-theme-version");

  return {
    themeId: typeof themeId === "string" && themeId.trim().length > 0 ? themeId : DEFAULT_THEME_STATE.themeId,
    version: typeof version === "string" && version.trim().length > 0 ? version : DEFAULT_THEME_STATE.version,
  };
}

function readRendererThemePalette(): EpubThemePalette {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return {
      surface: "#f5f2ea",
      text: "#1f1d19",
      mutedText: "color-mix(in srgb, #1f1d19 72%, #f5f2ea)",
      primary: "#2158d2",
      border: "color-mix(in srgb, #1f1d19 12%, transparent)",
      accentSurface: "color-mix(in srgb, #2158d2 8%, #f5f2ea)",
    };
  }

  const styles = window.getComputedStyle(document.documentElement);
  const surface = styles.getPropertyValue("--chips-sys-color-surface").trim() || "#f5f2ea";
  const text = styles.getPropertyValue("--chips-sys-color-on-surface").trim() || "#1f1d19";
  const primary = styles.getPropertyValue("--chips-sys-color-primary").trim() || "#2158d2";

  return {
    surface,
    text,
    mutedText: `color-mix(in srgb, ${text} 72%, ${surface})`,
    primary,
    border: `color-mix(in srgb, ${text} 12%, transparent)`,
    accentSurface: `color-mix(in srgb, ${primary} 8%, ${surface})`,
  };
}

function resolveReaderThemePalette(baseTheme: EpubThemePalette, preferences: ReaderPreferences): EpubThemePalette {
  switch (preferences.backgroundTone) {
    case "warm":
      return {
        surface: `color-mix(in srgb, ${baseTheme.surface} 72%, #f1e1c7 28%)`,
        text: baseTheme.text,
        mutedText: `color-mix(in srgb, ${baseTheme.text} 68%, #f1e1c7)`,
        primary: baseTheme.primary,
        border: `color-mix(in srgb, ${baseTheme.text} 14%, #f1e1c7)`,
        accentSurface: `color-mix(in srgb, ${baseTheme.surface} 58%, #edd7b1 42%)`,
      };
    case "mist":
      return {
        surface: `color-mix(in srgb, ${baseTheme.surface} 82%, ${baseTheme.primary} 18%)`,
        text: baseTheme.text,
        mutedText: `color-mix(in srgb, ${baseTheme.text} 72%, ${baseTheme.surface})`,
        primary: `color-mix(in srgb, ${baseTheme.primary} 84%, white 16%)`,
        border: `color-mix(in srgb, ${baseTheme.text} 12%, ${baseTheme.primary})`,
        accentSurface: `color-mix(in srgb, ${baseTheme.surface} 74%, ${baseTheme.primary} 26%)`,
      };
    case "night":
      return {
        surface: `color-mix(in srgb, ${baseTheme.text} 82%, #07070a 18%)`,
        text: "color-mix(in srgb, white 92%, #d7d7de 8%)",
        mutedText: "color-mix(in srgb, white 66%, #8b8b96 34%)",
        primary: `color-mix(in srgb, ${baseTheme.primary} 68%, white 32%)`,
        border: "color-mix(in srgb, white 12%, transparent)",
        accentSurface: `color-mix(in srgb, ${baseTheme.text} 68%, ${baseTheme.primary} 32%)`,
      };
    default:
      return baseTheme;
  }
}

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallbackMessage;
}

function resolveLanguagePayload(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object" && "locale" in payload) {
    const locale = (payload as { locale?: unknown }).locale;
    if (typeof locale === "string" && locale.trim().length > 0) {
      return locale;
    }
  }

  return null;
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

export function App(): React.ReactElement {
  const bridge = useChipsBridge();
  const { client, traceId } = useChipsClient();
  const [logger] = useState(() =>
    createLogger({
      scope: "app",
      traceId,
    }),
  );
  const [themeState, setThemeState] = useState<ThemeSnapshot>(() => readDocumentThemeState());
  const [themePalette, setThemePalette] = useState<EpubThemePalette>(() => readRendererThemePalette());
  const [locale, setLocale] = useState(() =>
    resolveLocale(typeof document !== "undefined" ? document.documentElement.lang : undefined),
  );
  const [book, setBook] = useState<EpubBook | null>(null);
  const [renderedSection, setRenderedSection] = useState<RenderedSectionDocument | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentFragment, setCurrentFragment] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<ReaderFeedback | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isLoadingSection, setIsLoadingSection] = useState(false);
  const [preferences, setPreferences] = useState<ReaderPreferences>(appConfig.defaultPreferences);
  const launchHandledRef = useRef(false);

  function t(key: string, params?: Record<string, string | number>): string {
    return formatMessage(locale, key, params);
  }

  async function readBookBytes(target: LaunchBookTarget): Promise<{ bytes: Uint8Array; mimeType?: string }> {
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
          Accept: "application/epub+zip, application/octet-stream;q=0.9, */*;q=0.8",
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
  }

  async function openBookTarget(target: LaunchBookTarget): Promise<void> {
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

      const nextBook = await loadEpubBook({
        bytes: payload.bytes,
        source: createBookSourceDescriptor(normalizedTarget),
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
  }

  async function handleOpenFile(): Promise<void> {
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
  }

  async function handleOpenUrl(sourceValue: string): Promise<void> {
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
  }

  async function handleDropFiles(files: File[]): Promise<void> {
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
  }

  function goToSection(sectionIndex: number, fragment?: string): void {
    if (!book) {
      return;
    }

    const boundedIndex = Math.max(0, Math.min(book.sections.length - 1, sectionIndex));
    setCurrentSectionIndex(boundedIndex);
    setCurrentFragment(fragment);
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([client.theme.getCurrent(), client.i18n.getCurrent()])
      .then(([currentTheme, currentLocale]) => {
        if (cancelled) {
          return;
        }

        const theme = currentTheme as ThemeState;
        setThemeState({
          themeId: theme.themeId,
          version: theme.version,
        });
        setLocale(resolveLocale(currentLocale));
        setThemePalette(readRendererThemePalette());
      })
      .catch((error) => {
        logger.warn("初始化主题或语言失败，继续使用文档快照", error);
      });

    return () => {
      cancelled = true;
    };
  }, [client, logger]);

  useEffect(() => {
    if (launchHandledRef.current) {
      return;
    }

    launchHandledRef.current = true;
    const launchTarget = resolveLaunchBookTarget(client.platform.getLaunchContext());
    if (!launchTarget) {
      return;
    }

    logger.info("检测到启动参数中的电子书目标", {
      sourceId: launchTarget.sourceId,
      filePath: launchTarget.filePath,
    });
    void openBookTarget(launchTarget);
  }, [client, logger]);

  useEffect(() => {
    if (typeof bridge.on !== "function") {
      return;
    }

    const unsubscribeLanguage = bridge.on("language.changed", (payload: unknown) => {
      const nextLocale = resolveLanguagePayload(payload);
      if (nextLocale) {
        setLocale(resolveLocale(nextLocale));
      }
    });

    const unsubscribeTheme = bridge.on("theme.changed", () => {
      window.setTimeout(() => {
        setThemeState(readDocumentThemeState());
        setThemePalette(readRendererThemePalette());
      }, 0);
    });

    return () => {
      if (typeof unsubscribeLanguage === "function") {
        unsubscribeLanguage();
      }
      if (typeof unsubscribeTheme === "function") {
        unsubscribeTheme();
      }
    };
  }, [bridge]);

  useEffect(() => {
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
  }, [book, currentSectionIndex, logger]);

  useEffect(() => {
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

  return (
    <ChipsThemeProvider
      themeId={themeState.themeId}
      version={themeState.version}
      eventSource={bridge}
      eventName="theme.changed"
    >
      <ReaderShell
        book={book}
        renderedSection={renderedSection}
        currentSectionIndex={currentSectionIndex}
        currentFragment={currentFragment}
        feedback={feedback}
        isResolving={isResolving}
        isLoadingSection={isLoadingSection}
        preferences={preferences}
        themePalette={resolveReaderThemePalette(themePalette, preferences)}
        configClient={client.config}
        onOpenFile={handleOpenFile}
        onOpenUrl={handleOpenUrl}
        onSelectSection={goToSection}
        onStepSection={(delta) => goToSection(currentSectionIndex + delta)}
        onUpdatePreferences={(next) => setPreferences(normalizeReaderPreferences(next))}
        onDropFiles={handleDropFiles}
        onOpenExternalLink={(url) => client.platform.openExternal(url)}
        t={t}
      />
    </ChipsThemeProvider>
  );
}

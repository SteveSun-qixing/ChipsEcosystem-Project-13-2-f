import React, { useEffect, useState } from "react";
import { ChipsThemeProvider } from "@chips/component-library";
import type { ThemeState } from "chips-sdk";
import { PhotoViewerStage } from "./components/PhotoViewerStage";
import { formatMessage, resolveLocale } from "./i18n/messages";
import { useChipsBridge } from "./hooks/useChipsBridge";
import { useChipsClient } from "./hooks/useChipsClient";
import { isSupportedImagePath, SUPPORTED_IMAGE_EXTENSION_LABEL, type ImageDimensions } from "./utils/image-viewer";
import { createLogger } from "../config/logging";

interface ThemeSnapshot {
  themeId: string;
  version: string;
}

interface ImageSource {
  filePath: string;
  fileName: string;
  resourceUri: string;
  revision: number;
}

interface ViewerFeedback {
  tone: "info" | "success" | "error";
  message: string;
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

function resolveFileName(filePath: string): string {
  const normalized = filePath.trim();
  if (!normalized) {
    return "";
  }

  const segments = normalized.split(/[\\/]/).filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? normalized;
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
  const [locale, setLocale] = useState(() =>
    resolveLocale(typeof document !== "undefined" ? document.documentElement.lang : undefined),
  );
  const [imageSource, setImageSource] = useState<ImageSource | null>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [feedback, setFeedback] = useState<ViewerFeedback | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  function t(key: string, params?: Record<string, string | number>): string {
    return formatMessage(locale, key, params);
  }

  async function openImageFile(filePath: string): Promise<void> {
    const normalizedPath = filePath.trim();
    if (!normalizedPath) {
      setFeedback({
        tone: "error",
        message: t("photo-viewer.errors.missingPath"),
      });
      return;
    }

    if (!isSupportedImagePath(normalizedPath)) {
      setFeedback({
        tone: "error",
        message: t("photo-viewer.errors.unsupportedFile", {
          extensions: SUPPORTED_IMAGE_EXTENSION_LABEL,
        }),
      });
      logger.warn("用户尝试打开不受支持的图片格式", {
        filePath: normalizedPath,
      });
      return;
    }

    setIsResolving(true);
    setIsImageLoaded(false);
    setImageDimensions(null);
    setFeedback(null);

    try {
      const resolved = await client.resource.resolve(normalizedPath);

      setImageSource({
        filePath: normalizedPath,
        fileName: resolveFileName(normalizedPath),
        resourceUri: resolved.uri,
        revision: Date.now(),
      });
      logger.info("图片资源已准备完成", {
        filePath: normalizedPath,
        resourceUri: resolved.uri,
      });
    } catch (error) {
      logger.error("打开图片失败", error);
      setIsResolving(false);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("photo-viewer.errors.openFailed")),
      });
    }
  }

  async function handleOpenFile(): Promise<void> {
    try {
      const selected = await client.platform.openFile({
        title: t("photo-viewer.dialogs.openFileTitle"),
        mode: "file",
        allowMultiple: false,
        mustExist: true,
      });
      const filePath = Array.isArray(selected) ? selected[0] : undefined;
      if (filePath) {
        await openImageFile(filePath);
      }
    } catch (error) {
      logger.error("调用系统文件选择器失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("photo-viewer.errors.openFailed")),
      });
    }
  }

  async function handleSaveImage(): Promise<void> {
    if (!imageSource) {
      setFeedback({
        tone: "error",
        message: t("photo-viewer.errors.missingPath"),
      });
      return;
    }

    try {
      const destinationPath = await client.platform.saveFile({
        title: t("photo-viewer.dialogs.saveFileTitle"),
        defaultPath: imageSource.filePath,
      });

      if (!destinationPath) {
        return;
      }

      if (destinationPath === imageSource.filePath) {
        setFeedback({
          tone: "info",
          message: t("photo-viewer.status.samePath"),
        });
        return;
      }

      setIsSaving(true);
      await client.file.copy(imageSource.filePath, destinationPath);
      logger.info("图片副本已保存", {
        sourcePath: imageSource.filePath,
        destinationPath,
      });
      setFeedback({
        tone: "success",
        message: t("photo-viewer.status.saveSuccess", {
          path: destinationPath,
        }),
      });
    } catch (error) {
      logger.error("保存图片失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("photo-viewer.errors.saveFailed")),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function resolveDroppedFilePath(file: File): string {
    const bridgePath = client.platform.getPathForFile(file);
    if (bridgePath) {
      return bridgePath;
    }

    return (file as File & { path?: string }).path ?? "";
  }

  async function handleDropFile(file: File | null): Promise<void> {
    if (!file) {
      return;
    }

    const filePath = resolveDroppedFilePath(file);
    if (!filePath) {
      setFeedback({
        tone: "error",
        message: t("photo-viewer.errors.openFailed"),
      });
      return;
    }

    await openImageFile(filePath);
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
      })
      .catch((error) => {
        logger.warn("初始化主题或语言失败，继续使用文档快照", error);
      });

    return () => {
      cancelled = true;
    };
  }, [client, logger]);

  useEffect(() => {
    const launchContext = client.platform.getLaunchContext();
    const targetPath =
      typeof launchContext.launchParams.targetPath === "string"
        ? launchContext.launchParams.targetPath
        : "";

    if (!targetPath) {
      return;
    }

    logger.info("检测到启动参数里的图片路径", {
      targetPath,
      trigger: launchContext.launchParams.trigger,
    });
    void openImageFile(targetPath);
  }, [client, logger]);

  useEffect(() => {
    if (typeof bridge.on !== "function") {
      return;
    }

    const unsubscribe = bridge.on("language.changed", (payload: unknown) => {
      const nextLocale = resolveLanguagePayload(payload);
      if (nextLocale) {
        setLocale(resolveLocale(nextLocale));
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [bridge]);

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
      <PhotoViewerStage
        imageSource={imageSource}
        imageDimensions={imageDimensions}
        isImageLoaded={isImageLoaded}
        isResolving={isResolving}
        isSaving={isSaving}
        feedback={feedback}
        onOpenFile={handleOpenFile}
        onSaveImage={handleSaveImage}
        onDropFile={handleDropFile}
        onImageLoad={(dimensions) => {
          setImageDimensions(dimensions);
          setIsImageLoaded(true);
          setIsResolving(false);
        }}
        onImageError={() => {
          setIsImageLoaded(false);
          setIsResolving(false);
          setFeedback({
            tone: "error",
            message: t("photo-viewer.errors.loadFailed"),
          });
        }}
        t={t}
      />
    </ChipsThemeProvider>
  );
}

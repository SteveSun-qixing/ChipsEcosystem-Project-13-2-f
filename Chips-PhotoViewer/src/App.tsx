import React, { useEffect, useState } from "react";
import { ChipsThemeProvider } from "@chips/component-library";
import type { ThemeState } from "chips-sdk";
import { PhotoViewerStage } from "./components/PhotoViewerStage";
import { formatMessage, resolveLocale } from "./i18n/messages";
import { useChipsBridge } from "./hooks/useChipsBridge";
import { useChipsClient } from "./hooks/useChipsClient";
import { isSupportedImagePath, SUPPORTED_IMAGE_EXTENSION_LABEL, type ImageDimensions } from "./utils/image-viewer";
import { resolveLaunchImageTarget, type LaunchImageResource, type LaunchImageTarget } from "./utils/launch-resource";
import { createLogger } from "../config/logging";

interface ThemeSnapshot {
  themeId: string;
  version: string;
}

interface ImageSource {
  sourceId: string;
  filePath?: string;
  fileName: string;
  resourceUri: string;
  revision: number;
}

interface ViewerFeedback {
  tone: "info" | "success" | "error";
  message: string;
}

type HostKind = "desktop" | "web" | "mobile" | "headless";

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

function resolveImageCandidateName(resource: LaunchImageResource): string {
  return (
    resource.fileName?.trim() ||
    (resource.relativePath ? resolveFileName(resource.relativePath) : "") ||
    (resource.filePath ? resolveFileName(resource.filePath) : "") ||
    resolveFileName(resource.sourceId) ||
    "image"
  );
}

function isSupportedImageResource(resource: LaunchImageResource): boolean {
  return [
    resource.fileName,
    resource.relativePath,
    resource.filePath,
    resource.sourceId,
  ].some((value) => typeof value === "string" && isSupportedImagePath(value));
}

function clampImageIndex(target: LaunchImageTarget, index: number): number {
  if (target.images.length === 0) {
    return 0;
  }

  if (!Number.isFinite(index)) {
    return 0;
  }

  return Math.max(0, Math.min(target.images.length - 1, Math.trunc(index)));
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
  const [imageTarget, setImageTarget] = useState<LaunchImageTarget | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageSource, setImageSource] = useState<ImageSource | null>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [feedback, setFeedback] = useState<ViewerFeedback | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hostKind, setHostKind] = useState<HostKind>("desktop");

  function t(key: string, params?: Record<string, string | number>): string {
    return formatMessage(locale, key, params);
  }

  function openImageTarget(target: LaunchImageTarget): void {
    if (target.images.length === 0) {
      setFeedback({
        tone: "error",
        message: t("photo-viewer.errors.missingPath"),
      });
      return;
    }

    const unsupported = target.images.find((image) => !isSupportedImageResource(image));
    if (unsupported) {
      setFeedback({
        tone: "error",
        message: t("photo-viewer.errors.unsupportedFile", {
          extensions: SUPPORTED_IMAGE_EXTENSION_LABEL,
        }),
      });
      logger.warn("用户尝试打开不受支持的图片格式", {
        sourceId: unsupported.sourceId,
        fileName: unsupported.fileName,
        relativePath: unsupported.relativePath,
      });
      return;
    }

    setImageTarget(target);
    setCurrentImageIndex(clampImageIndex(target, target.initialIndex));
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

    openImageTarget({
      images: [
        {
          sourceId: normalizedPath,
          filePath: normalizedPath,
          fileName: resolveFileName(normalizedPath),
        },
      ],
      initialIndex: 0,
    });
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

    if (hostKind === "web") {
      const link = document.createElement("a");
      link.href = imageSource.resourceUri;
      link.download = imageSource.fileName || "image";
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedback({
        tone: "success",
        message: t("photo-viewer.status.saveSuccess", {
          path: imageSource.fileName,
        }),
      });
      return;
    }

    try {
      const destinationPath = await client.platform.saveFile({
        title: t("photo-viewer.dialogs.saveFileTitle"),
        defaultPath: imageSource.filePath ?? imageSource.fileName,
      });

      if (!destinationPath) {
        return;
      }

      if (imageSource.filePath && destinationPath === imageSource.filePath) {
        setFeedback({
          tone: "info",
          message: t("photo-viewer.status.samePath"),
        });
        return;
      }

      setIsSaving(true);
      if (imageSource.filePath) {
        await client.file.copy(imageSource.filePath, destinationPath);
      } else {
        const bytes = new Uint8Array(await client.resource.readBinary(imageSource.sourceId));
        await client.file.write(destinationPath, bytes, { encoding: "binary" });
      }
      logger.info("图片副本已保存", {
        sourcePath: imageSource.filePath ?? imageSource.sourceId,
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

  function handlePreviousImage(): void {
    if (!imageTarget || imageTarget.images.length <= 1) {
      return;
    }

    setCurrentImageIndex((current) => Math.max(0, current - 1));
  }

  function handleNextImage(): void {
    if (!imageTarget || imageTarget.images.length <= 1) {
      return;
    }

    setCurrentImageIndex((current) => Math.min(imageTarget.images.length - 1, current + 1));
  }

  useEffect(() => {
    if (!imageTarget) {
      setImageSource(null);
      setImageDimensions(null);
      setIsImageLoaded(false);
      setIsResolving(false);
      return;
    }

    const boundedIndex = clampImageIndex(imageTarget, currentImageIndex);
    if (boundedIndex !== currentImageIndex) {
      setCurrentImageIndex(boundedIndex);
      return;
    }

    const resource = imageTarget.images[boundedIndex];
    if (!resource) {
      return;
    }

    let cancelled = false;
    const sourceId = resource.sourceId.trim();
    setIsResolving(true);
    setIsImageLoaded(false);
    setImageDimensions(null);
    setFeedback(null);

    void client.resource.resolve(sourceId)
      .then((resolved) => {
        if (cancelled) {
          return;
        }

        setImageSource({
          sourceId,
          filePath: resource.filePath,
          fileName: resolveImageCandidateName(resource),
          resourceUri: resolved.uri,
          revision: Date.now(),
        });
        logger.info("图片资源已准备完成", {
          sourceId,
          filePath: resource.filePath,
          resourceUri: resolved.uri,
          index: boundedIndex,
          total: imageTarget.images.length,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        logger.error("打开图片失败", error);
        setImageSource(null);
        setIsResolving(false);
        setFeedback({
          tone: "error",
          message: resolveErrorMessage(error, t("photo-viewer.errors.openFailed")),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [client, currentImageIndex, imageTarget, logger]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([client.theme.getCurrent(), client.i18n.getCurrent(), client.platform.getInfo()])
      .then(([currentTheme, currentLocale, platformInfo]) => {
        if (cancelled) {
          return;
        }

        const theme = currentTheme as ThemeState;
        setThemeState({
          themeId: theme.themeId,
          version: theme.version,
        });
        setLocale(resolveLocale(currentLocale));
        setHostKind(platformInfo.hostKind as HostKind);
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
    const target = resolveLaunchImageTarget(launchContext);

    if (!target) {
      return;
    }

    logger.info("检测到启动参数里的图片路径", {
      targetCount: target.images.length,
      initialIndex: target.initialIndex,
      trigger: launchContext.launchParams.trigger,
    });
    openImageTarget(target);
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
    if (!imageTarget || imageTarget.images.length <= 1) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePreviousImage();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNextImage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imageTarget]);

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
        onPreviousImage={handlePreviousImage}
        onNextImage={handleNextImage}
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
        sequenceCount={imageTarget?.images.length ?? 0}
        currentImageIndex={currentImageIndex}
        t={t}
      />
    </ChipsThemeProvider>
  );
}

import React from "react";
import type { Client, PlatformLaunchContext, SurfaceContext } from "chips-sdk";
import { appConfig } from "../../config/app-config";
import { createLogger, createTraceId } from "../../config/logging";
import {
  SUPPORTED_IMAGE_EXTENSION_LABEL,
  isSupportedImagePath,
  type ImageDimensions,
} from "../utils/image-viewer";
import {
  resolveLaunchImageTarget,
  type LaunchImageResource,
  type LaunchImageTarget,
} from "../utils/launch-resource";
import { formatMessage, resolveLocale, resolveLocaleDirection, type SupportedLocale } from "../i18n/messages";
import { chipsClient } from "../runtime/chips-client";
import { readLaunchContext } from "../runtime/launch-context";
import {
  getSceneDefinition,
  getSceneIdForImage,
  type PhotoViewerSceneDefinition,
  type PhotoViewerSceneId,
} from "./scene-registry";

export interface ImageSource {
  sourceId: string;
  filePath?: string;
  fileName: string;
  resourceUri: string;
  revision: number;
}

export interface ViewerFeedback {
  tone: "info" | "success" | "error";
  message: string;
}

export type HostKind = "desktop" | "web" | "mobile" | "headless";

export interface PhotoViewerRuntimeEnvironment {
  appId: string;
  pluginId: string;
  hostSceneId: string;
  activeSceneId: PhotoViewerSceneId;
  surfaceId: string | null;
  sessionId: string | null;
  surfaceKind: string;
  launchParams: Record<string, unknown>;
}

export interface PhotoViewerRuntimeValue {
  client: Client;
  traceId: string;
  launchContext: PlatformLaunchContext;
  surface: SurfaceContext | null;
  environment: PhotoViewerRuntimeEnvironment;
  activeSceneId: PhotoViewerSceneId;
  activeScene: PhotoViewerSceneDefinition;
  locale: SupportedLocale;
  hostKind: HostKind;
  imageTarget: LaunchImageTarget | null;
  currentImageIndex: number;
  imageSource: ImageSource | null;
  imageDimensions: ImageDimensions | null;
  feedback: ViewerFeedback | null;
  isResolving: boolean;
  isSaving: boolean;
  isImageLoaded: boolean;
  t(key: string, params?: Record<string, string | number>): string;
  openImageFile(filePath: string): Promise<void>;
  openFile(): Promise<void>;
  saveImage(): Promise<void>;
  previousImage(): void;
  nextImage(): void;
  dropFile(file: File | null): Promise<void>;
  handleImageLoad(dimensions: ImageDimensions): void;
  handleImageError(): void;
  setFeedback(feedback: ViewerFeedback | null): void;
}

const AppRuntimeContext = React.createContext<PhotoViewerRuntimeValue | null>(null);

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

function resolveHostSceneId(launchContext: PlatformLaunchContext): string {
  return launchContext.surfaceContext?.sceneId ?? launchContext.sceneId ?? appConfig.defaultSceneId;
}

function resolveSurfaceKind(launchContext: PlatformLaunchContext): string {
  return launchContext.surfaceContext?.kind ?? launchContext.kind ?? "window";
}

function resolveLaunchParams(launchContext: PlatformLaunchContext): Record<string, unknown> {
  return {
    ...launchContext.launchParams,
    ...launchContext.surfaceContext?.launchParams,
  };
}

export interface AppRuntimeProviderProps {
  children: React.ReactNode;
}

export function AppRuntimeProvider({ children }: AppRuntimeProviderProps): React.ReactElement {
  const client = chipsClient;
  const traceId = React.useMemo(() => createTraceId("photo-viewer"), []);
  const logger = React.useMemo(
    () =>
      createLogger({
        scope: "app-runtime",
        traceId,
      }),
    [traceId],
  );
  const [launchContext, setLaunchContext] = React.useState<PlatformLaunchContext>(() => readLaunchContext(client));
  const [locale, setLocale] = React.useState<SupportedLocale>(() =>
    resolveLocale(typeof document !== "undefined" ? document.documentElement.lang : undefined),
  );
  const [hostKind, setHostKind] = React.useState<HostKind>("desktop");
  const [imageTarget, setImageTarget] = React.useState<LaunchImageTarget | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [imageSource, setImageSource] = React.useState<ImageSource | null>(null);
  const [imageDimensions, setImageDimensions] = React.useState<ImageDimensions | null>(null);
  const [feedback, setFeedback] = React.useState<ViewerFeedback | null>(null);
  const [isResolving, setIsResolving] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isImageLoaded, setIsImageLoaded] = React.useState(false);
  const hasResolvedLaunchContextRef = React.useRef(false);

  const text = React.useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      return formatMessage(locale, key, params);
    },
    [locale],
  );

  const openImageTarget = React.useCallback(
    (target: LaunchImageTarget): void => {
      if (target.images.length === 0) {
        setFeedback({
          tone: "error",
          message: text("photo-viewer.errors.missingPath"),
        });
        return;
      }

      const unsupported = target.images.find((image) => !isSupportedImageResource(image));
      if (unsupported) {
        setFeedback({
          tone: "error",
          message: text("photo-viewer.errors.unsupportedFile", {
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
    },
    [logger, text],
  );

  const openImageFile = React.useCallback(
    async (filePath: string): Promise<void> => {
      const normalizedPath = filePath.trim();
      if (!normalizedPath) {
        setFeedback({
          tone: "error",
          message: text("photo-viewer.errors.missingPath"),
        });
        return;
      }

      if (!isSupportedImagePath(normalizedPath)) {
        setFeedback({
          tone: "error",
          message: text("photo-viewer.errors.unsupportedFile", {
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
    },
    [logger, openImageTarget, text],
  );

  const openFile = React.useCallback(async (): Promise<void> => {
    try {
      const selected = await client.platform.openFile({
        title: text("photo-viewer.dialogs.openFileTitle"),
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
        message: resolveErrorMessage(error, text("photo-viewer.errors.openFailed")),
      });
    }
  }, [client, logger, openImageFile, text]);

  const saveImage = React.useCallback(async (): Promise<void> => {
    if (!imageSource) {
      setFeedback({
        tone: "error",
        message: text("photo-viewer.errors.missingPath"),
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
        message: text("photo-viewer.status.saveSuccess", {
          path: imageSource.fileName,
        }),
      });
      return;
    }

    try {
      const destinationPath = await client.platform.saveFile({
        title: text("photo-viewer.dialogs.saveFileTitle"),
        defaultPath: imageSource.filePath ?? imageSource.fileName,
      });

      if (!destinationPath) {
        return;
      }

      if (imageSource.filePath && destinationPath === imageSource.filePath) {
        setFeedback({
          tone: "info",
          message: text("photo-viewer.status.samePath"),
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
        message: text("photo-viewer.status.saveSuccess", {
          path: destinationPath,
        }),
      });
    } catch (error) {
      logger.error("保存图片失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, text("photo-viewer.errors.saveFailed")),
      });
    } finally {
      setIsSaving(false);
    }
  }, [client, hostKind, imageSource, logger, text]);

  const previousImage = React.useCallback((): void => {
    if (!imageTarget || imageTarget.images.length <= 1) {
      return;
    }

    setCurrentImageIndex((current) => Math.max(0, current - 1));
  }, [imageTarget]);

  const nextImage = React.useCallback((): void => {
    if (!imageTarget || imageTarget.images.length <= 1) {
      return;
    }

    setCurrentImageIndex((current) => Math.min(imageTarget.images.length - 1, current + 1));
  }, [imageTarget]);

  const resolveDroppedFilePath = React.useCallback(
    (file: File): string => {
      const bridgePath = client.platform.getPathForFile(file);
      if (bridgePath) {
        return bridgePath;
      }

      return (file as File & { path?: string }).path ?? "";
    },
    [client],
  );

  const dropFile = React.useCallback(
    async (file: File | null): Promise<void> => {
      if (!file) {
        return;
      }

      const filePath = resolveDroppedFilePath(file);
      if (!filePath) {
        setFeedback({
          tone: "error",
          message: text("photo-viewer.errors.openFailed"),
        });
        return;
      }

      await openImageFile(filePath);
    },
    [openImageFile, resolveDroppedFilePath, text],
  );

  const handleImageLoad = React.useCallback((dimensions: ImageDimensions): void => {
    setImageDimensions(dimensions);
    setIsImageLoaded(true);
    setIsResolving(false);
  }, []);

  const handleImageError = React.useCallback((): void => {
    setIsImageLoaded(false);
    setIsResolving(false);
    setFeedback({
      tone: "error",
      message: text("photo-viewer.errors.loadFailed"),
    });
  }, [text]);

  React.useEffect(() => {
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
          message: resolveErrorMessage(error, text("photo-viewer.errors.openFailed")),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [client, currentImageIndex, imageTarget, logger, text]);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([client.i18n.getCurrent(), client.platform.getInfo()])
      .then(([currentLocale, platformInfo]) => {
        if (cancelled) {
          return;
        }

        setLocale(resolveLocale(currentLocale));
        setHostKind(platformInfo.hostKind as HostKind);
      })
      .catch((error) => {
        logger.warn("初始化语言或平台信息失败，继续使用文档快照", error);
      });

    return () => {
      cancelled = true;
    };
  }, [client, logger]);

  React.useEffect(() => {
    if (hasResolvedLaunchContextRef.current) {
      return;
    }

    hasResolvedLaunchContextRef.current = true;
    const nextLaunchContext = readLaunchContext(client);
    setLaunchContext(nextLaunchContext);
    const target = resolveLaunchImageTarget(nextLaunchContext);

    if (!target) {
      return;
    }

    logger.info("检测到启动参数里的图片路径", {
      targetCount: target.images.length,
      initialIndex: target.initialIndex,
      trigger: nextLaunchContext.launchParams.trigger,
    });
    openImageTarget(target);
  }, [client, logger, openImageTarget]);

  React.useEffect(() => {
    const unsubscribe = client.i18n.onChanged((payload) => {
      const nextLocale = resolveLanguagePayload(payload);
      if (nextLocale) {
        setLocale(resolveLocale(nextLocale));
      }
    });

    return unsubscribe;
  }, [client]);

  React.useEffect(() => {
    if (!imageTarget || imageTarget.images.length <= 1) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousImage();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextImage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imageTarget, nextImage, previousImage]);

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

  const activeSceneId = getSceneIdForImage(Boolean(imageTarget));
  const activeScene = getSceneDefinition(activeSceneId);
  const environment = React.useMemo<PhotoViewerRuntimeEnvironment>(() => ({
    appId: appConfig.appId,
    pluginId: launchContext.surfaceContext?.pluginId ?? launchContext.pluginId ?? appConfig.appId,
    hostSceneId: resolveHostSceneId(launchContext),
    activeSceneId,
    surfaceId: launchContext.surfaceContext?.surfaceId ?? launchContext.surfaceId ?? null,
    sessionId: launchContext.surfaceContext?.sessionId ?? launchContext.sessionId ?? null,
    surfaceKind: resolveSurfaceKind(launchContext),
    launchParams: resolveLaunchParams(launchContext),
  }), [activeSceneId, launchContext]);

  const value = React.useMemo<PhotoViewerRuntimeValue>(() => ({
    client,
    traceId,
    launchContext,
    surface: launchContext.surfaceContext ?? null,
    environment,
    activeSceneId,
    activeScene,
    locale,
    hostKind,
    imageTarget,
    currentImageIndex,
    imageSource,
    imageDimensions,
    feedback,
    isResolving,
    isSaving,
    isImageLoaded,
    t: text,
    openImageFile,
    openFile,
    saveImage,
    previousImage,
    nextImage,
    dropFile,
    handleImageLoad,
    handleImageError,
    setFeedback,
  }), [
    activeScene,
    activeSceneId,
    client,
    currentImageIndex,
    dropFile,
    environment,
    feedback,
    handleImageError,
    handleImageLoad,
    hostKind,
    imageDimensions,
    imageSource,
    imageTarget,
    isImageLoaded,
    isResolving,
    isSaving,
    launchContext,
    locale,
    nextImage,
    openFile,
    openImageFile,
    previousImage,
    saveImage,
    text,
    traceId,
  ]);

  return <AppRuntimeContext.Provider value={value}>{children}</AppRuntimeContext.Provider>;
}

export function useAppRuntime(): PhotoViewerRuntimeValue {
  const context = React.useContext(AppRuntimeContext);
  if (!context) {
    throw new Error("AppRuntimeContext is not available.");
  }

  return context;
}

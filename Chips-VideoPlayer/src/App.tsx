import React, { useEffect, useState } from "react";
import { ChipsThemeProvider } from "@chips/component-library";
import type { ThemeState } from "chips-sdk";
import { VideoPlayerStage } from "./components/VideoPlayerStage";
import { formatMessage, resolveLocale } from "./i18n/messages";
import { useChipsBridge } from "./hooks/useChipsBridge";
import { useChipsClient } from "./hooks/useChipsClient";
import { resolveLaunchVideoTarget } from "./utils/launch-resource";
import {
  SUPPORTED_VIDEO_EXTENSION_LABEL,
  isDirectPlayableUri,
  isSupportedVideoResource,
  resolveFileName,
  resolveVideoTitle,
  type VideoSource,
  type ViewerFeedback,
  type LaunchVideoTarget,
} from "./utils/video-player";
import { appConfig } from "../config/app-config";
import { createLogger } from "../config/logging";

interface ThemeSnapshot {
  themeId: string;
  version: string;
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
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null);
  const [feedback, setFeedback] = useState<ViewerFeedback | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hostKind, setHostKind] = useState<HostKind>("desktop");

  function t(key: string, params?: Record<string, string | number>): string {
    return formatMessage(locale, key, params);
  }

  async function resolvePlayableUri(target: LaunchVideoTarget): Promise<string> {
    const preferredSourceId = target.filePath ?? target.sourceId;
    if (isDirectPlayableUri(preferredSourceId)) {
      return preferredSourceId;
    }

    const resolved = await client.resource.resolve(preferredSourceId);
    return resolved.uri;
  }

  async function openVideoTarget(target: LaunchVideoTarget): Promise<void> {
    if (!target.sourceId.trim()) {
      setFeedback({
        tone: "error",
        message: t("video-player.errors.missingPath"),
      });
      return;
    }

    if (!isSupportedVideoResource(target)) {
      setFeedback({
        tone: "error",
        message: t("video-player.errors.unsupportedFile", {
          extensions: SUPPORTED_VIDEO_EXTENSION_LABEL,
        }),
      });
      logger.warn("用户尝试打开不受支持的视频格式", target);
      return;
    }

    setIsResolving(true);
    setFeedback(null);

    try {
      const resourceUri = await resolvePlayableUri(target);
      const resolvedTitle = resolveVideoTitle(target);
      const resolvedFilePath = target.filePath?.trim() || undefined;
      const resolvedSourceId = target.sourceId.trim();

      setVideoSource({
        sourceId: resolvedSourceId,
        filePath: resolvedFilePath,
        fileName: target.fileName?.trim() || resolveFileName(resolvedFilePath ?? resolvedSourceId),
        title: resolvedTitle,
        resourceUri,
        mimeType: target.mimeType?.trim() || undefined,
        extension: undefined,
        revision: Date.now(),
        isRemote: !resolvedFilePath,
      });
      logger.info("视频资源已准备完成", {
        sourceId: resolvedSourceId,
        filePath: resolvedFilePath,
        resourceUri,
      });
    } catch (error) {
      logger.error("打开视频失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("video-player.errors.openFailed")),
      });
    } finally {
      setIsResolving(false);
    }
  }

  async function handleOpenFile(): Promise<void> {
    try {
      const selected = await client.platform.openFile({
        title: t("video-player.dialogs.openFileTitle"),
        mode: "file",
        allowMultiple: false,
        mustExist: true,
      });
      const filePath = Array.isArray(selected) ? selected[0] : undefined;
      if (filePath) {
        await openVideoTarget({
          sourceId: filePath,
          filePath,
          fileName: resolveFileName(filePath),
        });
      }
    } catch (error) {
      logger.error("调用系统文件选择器失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("video-player.errors.openFailed")),
      });
    }
  }

  async function handleSaveVideo(): Promise<void> {
    if (!videoSource) {
      setFeedback({
        tone: "error",
        message: t("video-player.errors.missingPath"),
      });
      return;
    }

    const shouldDownloadDirectly = hostKind === "web" || !videoSource.filePath;

    if (shouldDownloadDirectly) {
      const link = document.createElement("a");
      link.href = videoSource.resourceUri;
      link.download = videoSource.fileName || "video";
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedback({
        tone: "info",
        message: t("video-player.status.downloadFallback"),
      });
      return;
    }

    try {
      const destinationPath = await client.platform.saveFile({
        title: t("video-player.dialogs.saveFileTitle"),
        defaultPath: videoSource.filePath,
      });

      if (!destinationPath) {
        return;
      }

      if (destinationPath === videoSource.filePath) {
        setFeedback({
          tone: "info",
          message: t("video-player.status.samePath"),
        });
        return;
      }

      setIsSaving(true);
      await client.file.copy(videoSource.filePath, destinationPath);
      logger.info("视频副本已保存", {
        sourcePath: videoSource.filePath,
        destinationPath,
      });
      setFeedback({
        tone: "success",
        message: t("video-player.status.saveSuccess", {
          path: destinationPath,
        }),
      });
    } catch (error) {
      logger.error("保存视频失败", error);
      setFeedback({
        tone: "error",
        message: resolveErrorMessage(error, t("video-player.errors.saveFailed")),
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
        message: t("video-player.errors.openFailed"),
      });
      return;
    }

    await openVideoTarget({
      sourceId: filePath,
      filePath,
      fileName: resolveFileName(filePath),
    });
  }

  useEffect(() => {
    if (appConfig.featureFlags.enableDiagnosticsLogging) {
      logger.info("视频播放器应用已初始化", {
        appId: appConfig.appId,
      });
    }
  }, [logger]);

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
    const launchTarget = resolveLaunchVideoTarget(launchContext);

    if (!launchTarget) {
      return;
    }

    logger.info("检测到启动参数里的视频资源", {
      launchTarget,
      trigger: launchContext.launchParams.trigger,
    });
    void openVideoTarget(launchTarget);
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
    }, 2600);

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
      <VideoPlayerStage
        videoSource={videoSource}
        isResolving={isResolving}
        isSaving={isSaving}
        feedback={feedback}
        onOpenFile={handleOpenFile}
        onSaveVideo={handleSaveVideo}
        onDropFile={handleDropFile}
        t={t}
      />
    </ChipsThemeProvider>
  );
}

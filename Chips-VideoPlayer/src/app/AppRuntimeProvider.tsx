import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  useChipsDiagnostics,
  useChipsI18n,
  useChipsI18nText,
  useChipsPermission,
  useChipsSurface,
  useChipsTheme,
  type ChipsRuntimeDiagnostic,
  type ChipsRuntimeStatus,
} from "@chips/component-library";
import type { Client, CommandInvocationContext, CommandSource, PlatformHostKind, PlatformLaunchContext, SurfaceContext } from "chips-sdk";
import { appConfig } from "../../config/app-config";
import { createLogger } from "../../config/logging";
import { VideoPlayerStage } from "../components/VideoPlayerStage";
import {
  VIDEO_PLAYER_COMMAND_HANDLER_IDS,
  VIDEO_PLAYER_COMMAND_IDS,
  type VideoPlayerCommandId,
  type VideoPlayerCommandRuntimeState,
} from "../commands/video-player-commands";
import { useVideoPlayerCommands, type UseVideoPlayerCommandsResult } from "../commands/useVideoPlayerCommands";
import { localeBundles, DEFAULT_LOCALE, FALLBACK_LOCALE } from "../i18n/locales";
import { useVideoPlayerController } from "../hooks/useVideoPlayerController";
import { chipsClient, videoPlayerTraceId } from "../runtime/chips-client";
import { readLaunchContext } from "../runtime/launch-context";
import { resolveLaunchVideoTarget } from "../utils/launch-resource";
import {
  SUPPORTED_VIDEO_EXTENSION_LABEL,
  isDirectPlayableUri,
  isSupportedVideoResource,
  resolveFileName,
  resolveVideoTitle,
  type LaunchVideoTarget,
  type VideoSource,
  type ViewerFeedback,
} from "../utils/video-player";
import { getSceneDefinition, type VideoPlayerSceneDefinition, type VideoPlayerSceneId } from "./scene-registry";

export type VideoPlayerRuntimePhase = "launching" | "active" | "error";

export interface VideoPlayerRuntimePermissions {
  values: string[];
  canReadResource: boolean;
  canWriteFile: boolean;
  canReadPlatform: boolean;
  canReadTheme: boolean;
  canReadI18n: boolean;
  canReadCommand: boolean;
  canWriteCommand: boolean;
  canInvokeCommand: boolean;
}

export interface VideoPlayerRuntimeStatus {
  phase: VideoPlayerRuntimePhase;
  theme: ChipsRuntimeStatus;
  i18n: ChipsRuntimeStatus;
  surface: ChipsRuntimeStatus;
  diagnostics: ChipsRuntimeStatus;
  ready: boolean;
}

export interface VideoPlayerRuntimeEnvironment {
  appId: string;
  pluginId: string;
  sceneId: VideoPlayerSceneId;
  hostSceneId: string;
  surfaceId: string | null;
  sessionId: string | null;
  surfaceKind: string;
  launchParams: Record<string, unknown>;
}

export interface VideoPlayerRuntimeValue {
  client: Client;
  traceId: string;
  launchContext: PlatformLaunchContext;
  surface: SurfaceContext | null;
  environment: VideoPlayerRuntimeEnvironment;
  activeSceneId: VideoPlayerSceneId;
  activeScene: VideoPlayerSceneDefinition;
  videoSource: VideoSource | null;
  feedback: ViewerFeedback | null;
  isResolving: boolean;
  isSaving: boolean;
  hostKind: PlatformHostKind;
  isMorePanelOpen: boolean;
  commands: UseVideoPlayerCommandsResult;
  permissions: VideoPlayerRuntimePermissions;
  diagnostics: ChipsRuntimeDiagnostic[];
  status: VideoPlayerRuntimeStatus;
  t: (key: string, params?: Record<string, string | number>) => string;
  openVideoTarget(target: LaunchVideoTarget): Promise<void>;
  openFile(): Promise<void>;
  saveVideo(): Promise<void>;
  dropFile(file: File | null): Promise<void>;
  setMorePanelOpen(open: boolean): void;
  invokeCommand(commandId: VideoPlayerCommandId, source: CommandSource): Promise<void>;
  renderPlayerStage(): React.ReactElement;
}

const AppRuntimeContext = React.createContext<VideoPlayerRuntimeValue | null>(null);

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallbackMessage;
}

function unwrapLaunchParams(
  launchContext: PlatformLaunchContext | null,
  surface: SurfaceContext | null,
): Record<string, unknown> {
  return {
    ...surface?.launchParams,
    ...launchContext?.launchParams,
  };
}

function resolveHostSceneId(
  launchContext: PlatformLaunchContext | null,
  surface: SurfaceContext | null,
): string {
  return surface?.sceneId ?? launchContext?.sceneId ?? appConfig.defaultSceneId;
}

function resolveSurfaceKind(
  launchContext: PlatformLaunchContext | null,
  surface: SurfaceContext | null,
): string {
  return surface?.kind ?? launchContext?.kind ?? "window";
}

function resolveDroppedFilePath(client: Client, file: File): string {
  const bridgePath = client.platform.getPathForFile(file);
  if (bridgePath) {
    return bridgePath;
  }

  return (file as File & { path?: string }).path ?? "";
}

function resolvePhase(
  themeStatus: ChipsRuntimeStatus,
  i18nStatus: ChipsRuntimeStatus,
  surfaceStatus: ChipsRuntimeStatus,
): VideoPlayerRuntimePhase {
  if (themeStatus === "error" || i18nStatus === "error" || surfaceStatus === "error") {
    return "error";
  }

  if (themeStatus === "loading" || i18nStatus === "loading" || surfaceStatus === "loading") {
    return "launching";
  }

  return "active";
}

export interface AppRuntimeProviderProps {
  children: React.ReactNode;
}

export function AppRuntimeProvider({ children }: AppRuntimeProviderProps): React.ReactElement {
  const client = chipsClient;
  const traceId = videoPlayerTraceId;
  const logger = useMemo(
    () =>
      createLogger({
        scope: "app-runtime",
        traceId,
      }),
    [traceId],
  );
  const theme = useChipsTheme();
  const i18n = useChipsI18n();
  const surfaceRuntime = useChipsSurface();
  const permission = useChipsPermission();
  const diagnostics = useChipsDiagnostics();
  const t = useChipsI18nText({
    bundles: localeBundles,
    defaultLocale: DEFAULT_LOCALE,
    fallbackLocale: FALLBACK_LOCALE,
  });
  const fallbackLaunchContext = useMemo(() => readLaunchContext(client), [client]);
  const launchContext = (surfaceRuntime.launchContext as PlatformLaunchContext | null) ?? fallbackLaunchContext;
  const surface = (surfaceRuntime.surface as SurfaceContext | null) ?? launchContext.surfaceContext ?? null;
  const hostSceneId = resolveHostSceneId(launchContext, surface);
  const activeScene = getSceneDefinition(hostSceneId);
  const activeSceneId = activeScene.id;
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null);
  const [feedback, setFeedback] = useState<ViewerFeedback | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hostKind, setHostKind] = useState<PlatformHostKind>("desktop");
  const [isMorePanelOpen, setMorePanelOpen] = useState(false);
  const launchHandledRef = React.useRef(false);
  const controller = useVideoPlayerController({
    sessionKey: videoSource ? `${videoSource.sourceId}:${videoSource.revision}` : null,
  });

  const permissions = useMemo<VideoPlayerRuntimePermissions>(() => ({
    values: permission.permissions,
    canReadResource: permission.hasPermission("resource.read"),
    canWriteFile: permission.hasPermission("file.write"),
    canReadPlatform: permission.hasPermission("platform.read"),
    canReadTheme: permission.hasPermission("theme.read"),
    canReadI18n: permission.hasPermission("i18n.read"),
    canReadCommand: permission.hasPermission("command.read"),
    canWriteCommand: permission.hasPermission("command.write"),
    canInvokeCommand: permission.hasPermission("command.invoke"),
  }), [permission]);

  const environment = useMemo<VideoPlayerRuntimeEnvironment>(() => ({
    appId: appConfig.appId,
    pluginId: surface?.pluginId ?? launchContext.pluginId ?? appConfig.appId,
    sceneId: activeSceneId,
    hostSceneId,
    surfaceId: surface?.surfaceId ?? launchContext.surfaceId ?? null,
    sessionId: surface?.sessionId ?? launchContext.sessionId ?? null,
    surfaceKind: resolveSurfaceKind(launchContext, surface),
    launchParams: unwrapLaunchParams(launchContext, surface),
  }), [activeSceneId, hostSceneId, launchContext, surface]);

  const commandInvocationContext = useMemo<CommandInvocationContext>(() => ({
    pluginId: environment.pluginId,
    sceneId: environment.hostSceneId,
    surfaceId: environment.surfaceId ?? undefined,
  }), [environment.hostSceneId, environment.pluginId, environment.surfaceId]);

  const commandRuntimeState = useMemo<VideoPlayerCommandRuntimeState>(() => ({
    hasVideo: Boolean(videoSource),
    isSaving,
    canUsePictureInPicture: controller.canUsePictureInPicture,
    isPlaying: controller.isPlaying,
    isMuted: controller.isMuted,
    isFullscreen: controller.isFullscreen,
    isPictureInPicture: controller.isPictureInPicture,
    isMorePanelOpen,
  }), [
    controller.canUsePictureInPicture,
    controller.isFullscreen,
    controller.isMuted,
    controller.isPictureInPicture,
    controller.isPlaying,
    isMorePanelOpen,
    isSaving,
    videoSource,
  ]);

  const commands = useVideoPlayerCommands({
    client,
    invocationContext: commandInvocationContext,
    runtimeState: commandRuntimeState,
  });

  const resolvePlayableUri = useCallback(async (target: LaunchVideoTarget): Promise<string> => {
    const preferredSourceId = target.filePath ?? target.sourceId;
    if (isDirectPlayableUri(preferredSourceId)) {
      return preferredSourceId;
    }

    const resolved = await client.resource.resolve(preferredSourceId);
    return resolved.uri;
  }, [client]);

  const openVideoTarget = useCallback(async (target: LaunchVideoTarget): Promise<void> => {
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
  }, [logger, resolvePlayableUri, t]);

  const openFile = useCallback(async (): Promise<void> => {
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
  }, [client, logger, openVideoTarget, t]);

  const saveVideo = useCallback(async (): Promise<void> => {
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

      const sourceFilePath = videoSource.filePath;
      if (!sourceFilePath) {
        return;
      }

      setIsSaving(true);
      await client.file.copy(sourceFilePath, destinationPath);
      logger.info("视频副本已保存", {
        sourcePath: sourceFilePath,
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
  }, [client, hostKind, logger, t, videoSource]);

  const dropFile = useCallback(async (file: File | null): Promise<void> => {
    if (!file) {
      return;
    }

    const filePath = resolveDroppedFilePath(client, file);
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
  }, [client, openVideoTarget, t]);

  const invokeCommand = useCallback(
    async (commandId: VideoPlayerCommandId, source: CommandSource): Promise<void> => {
      await commands.invokeCommand(commandId, source);
    },
    [commands],
  );

  useEffect(() => {
    if (appConfig.featureFlags.enableDiagnosticsLogging) {
      logger.info("视频播放器应用已初始化", {
        appId: appConfig.appId,
        sceneId: environment.sceneId,
      });
    }
  }, [environment.sceneId, logger]);

  useEffect(() => {
    let cancelled = false;

    client.platform.getInfo()
      .then((platformInfo) => {
        if (!cancelled) {
          setHostKind(platformInfo.hostKind);
        }
      })
      .catch((error) => {
        logger.warn("读取宿主平台信息失败，继续按 desktop 处理", error);
      });

    return () => {
      cancelled = true;
    };
  }, [client, logger]);

  useEffect(() => {
    if (launchHandledRef.current) {
      return;
    }

    const launchTarget = resolveLaunchVideoTarget({
      ...launchContext,
      launchParams: environment.launchParams,
    });

    if (!launchTarget) {
      return;
    }

    launchHandledRef.current = true;
    logger.info("检测到启动参数里的视频资源", {
      launchTarget,
      trigger: environment.launchParams.trigger,
    });
    void openVideoTarget(launchTarget);
  }, [environment.launchParams, launchContext, logger, openVideoTarget]);

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

  useEffect(() => {
    const handlers = [
      commands.registerHandler(VIDEO_PLAYER_COMMAND_HANDLER_IDS.openFile, () => openFile()),
      commands.registerHandler(VIDEO_PLAYER_COMMAND_HANDLER_IDS.saveCopy, () => saveVideo()),
      commands.registerHandler(VIDEO_PLAYER_COMMAND_HANDLER_IDS.togglePlayback, () => controller.togglePlayback()),
      commands.registerHandler(VIDEO_PLAYER_COMMAND_HANDLER_IDS.seekBackward, () => controller.seekBy(-5)),
      commands.registerHandler(VIDEO_PLAYER_COMMAND_HANDLER_IDS.seekForward, () => controller.seekBy(5)),
      commands.registerHandler(VIDEO_PLAYER_COMMAND_HANDLER_IDS.toggleMute, () => controller.toggleMute()),
      commands.registerHandler(VIDEO_PLAYER_COMMAND_HANDLER_IDS.toggleFullscreen, () => controller.toggleFullscreen()),
      commands.registerHandler(VIDEO_PLAYER_COMMAND_HANDLER_IDS.togglePictureInPicture, () => controller.togglePictureInPicture()),
      commands.registerHandler(VIDEO_PLAYER_COMMAND_HANDLER_IDS.toggleMorePanel, () => {
        setMorePanelOpen((current) => !current);
      }),
    ];

    return () => {
      handlers.forEach((dispose) => dispose());
    };
  }, [commands, controller, openFile, saveVideo]);

  const status = useMemo<VideoPlayerRuntimeStatus>(() => {
    const phase = resolvePhase(theme.status, i18n.status, surfaceRuntime.status);
    return {
      phase,
      theme: theme.status,
      i18n: i18n.status,
      surface: surfaceRuntime.status,
      diagnostics: diagnostics.status,
      ready: phase === "active",
    };
  }, [diagnostics.status, i18n.status, surfaceRuntime.status, theme.status]);

  const renderPlayerStage = useCallback(() => (
    <VideoPlayerStage
      videoSource={videoSource}
      controller={controller}
      isResolving={isResolving}
      isSaving={isSaving}
      feedback={feedback}
      isMorePanelOpen={isMorePanelOpen}
      onMorePanelOpenChange={setMorePanelOpen}
      onInvokeCommand={invokeCommand}
      onDropFile={dropFile}
      t={t}
    />
  ), [
    controller,
    dropFile,
    feedback,
    invokeCommand,
    isMorePanelOpen,
    isResolving,
    isSaving,
    t,
    videoSource,
  ]);

  const value = useMemo<VideoPlayerRuntimeValue>(() => ({
    client,
    traceId,
    launchContext,
    surface,
    environment,
    activeSceneId,
    activeScene,
    videoSource,
    feedback,
    isResolving,
    isSaving,
    hostKind,
    isMorePanelOpen,
    commands,
    permissions,
    diagnostics: diagnostics.diagnostics,
    status,
    t,
    openVideoTarget,
    openFile,
    saveVideo,
    dropFile,
    setMorePanelOpen,
    invokeCommand,
    renderPlayerStage,
  }), [
    activeScene,
    activeSceneId,
    client,
    commands,
    diagnostics.diagnostics,
    dropFile,
    environment,
    feedback,
    hostKind,
    invokeCommand,
    isMorePanelOpen,
    isResolving,
    isSaving,
    launchContext,
    openFile,
    openVideoTarget,
    permissions,
    renderPlayerStage,
    saveVideo,
    status,
    surface,
    t,
    traceId,
    videoSource,
  ]);

  return <AppRuntimeContext.Provider value={value}>{children}</AppRuntimeContext.Provider>;
}

export function useAppRuntime(): VideoPlayerRuntimeValue {
  const context = React.useContext(AppRuntimeContext);
  if (!context) {
    throw new Error("useAppRuntime must be used inside AppRuntimeProvider.");
  }

  return context;
}

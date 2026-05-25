import React from "react";
import type { Client, PlatformLaunchContext, SurfaceContext } from "chips-sdk";
import { appConfig } from "../../config/app-config";
import { createLogger, createTraceId } from "../../config/logging";
import { formatMessage, resolveLocale, type SupportedLocale } from "../i18n/messages";
import { chipsClient } from "../runtime/chips-client";
import { readLaunchContext } from "../runtime/launch-context";
import {
  getSceneDefinition,
  getSceneIdForTarget,
  type CardViewerSceneDefinition,
  type CardViewerSceneId,
} from "./scene-registry";

export type OpenedTarget =
  | {
      kind: "file";
      filePath: string;
    }
  | {
      kind: "document";
      documentUrl: string;
    };

export interface CardViewerRuntimeEnvironment {
  appId: string;
  pluginId: string;
  hostSceneId: string;
  activeSceneId: CardViewerSceneId;
  surfaceId: string | null;
  sessionId: string | null;
  surfaceKind: string;
  launchParams: Record<string, unknown>;
}

export interface CardViewerRuntimeValue {
  client: Client;
  traceId: string;
  launchContext: PlatformLaunchContext;
  surface: SurfaceContext | null;
  environment: CardViewerRuntimeEnvironment;
  activeSceneId: CardViewerSceneId;
  activeScene: CardViewerSceneDefinition;
  openedTarget: OpenedTarget | null;
  error: string | null;
  locale: SupportedLocale;
  surfaceMode: "immersive" | "document";
  t(key: string, params?: Record<string, string | number>): string;
  openFile(): Promise<void>;
  openFilePath(filePath: string): void;
}

const AppRuntimeContext = React.createContext<CardViewerRuntimeValue | null>(null);

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallbackMessage;
}

function resolveOpenedTarget(filePath: string): OpenedTarget | null {
  const normalized = filePath.trim();
  if (!normalized) {
    return null;
  }

  return {
    kind: "file",
    filePath: normalized,
  };
}

function resolveWebDocumentUrl(launchParams: Record<string, unknown>): string | null {
  const documentUrl = typeof launchParams.webDocumentUrl === "string" ? launchParams.webDocumentUrl.trim() : "";
  return documentUrl.length > 0 ? documentUrl : null;
}

function readInitialLocale(): SupportedLocale {
  return resolveLocale(typeof document !== "undefined" ? document.documentElement.lang : undefined);
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
  const traceId = React.useMemo(() => createTraceId("card-viewer"), []);
  const logger = React.useMemo(
    () =>
      createLogger({
        scope: "app-runtime",
        traceId,
      }),
    [traceId],
  );
  const [launchContext, setLaunchContext] = React.useState<PlatformLaunchContext>(() => readLaunchContext(client));
  const [openedTarget, setOpenedTarget] = React.useState<OpenedTarget | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<SupportedLocale>(() => readInitialLocale());
  const hasResolvedLaunchContextRef = React.useRef(false);

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>) => formatMessage(locale, key, params),
    [locale],
  );

  React.useEffect(() => {
    if (appConfig.featureFlags.enableDiagnosticsLogging) {
      logger.info("卡片查看器运行时已初始化", {
        appId: appConfig.appId,
        diagnosticsLogging: appConfig.featureFlags.enableDiagnosticsLogging,
      });
    }

    return () => {
      logger.info("卡片查看器运行时已卸载");
    };
  }, [logger]);

  React.useEffect(() => {
    logger.debug("当前查看目标状态已更新", {
      hasOpenedTarget: openedTarget !== null,
      targetKind: openedTarget?.kind ?? null,
      filePath: openedTarget?.kind === "file" ? openedTarget.filePath : null,
      documentUrl: openedTarget?.kind === "document" ? openedTarget.documentUrl : null,
    });
  }, [logger, openedTarget]);

  React.useEffect(() => {
    if (!error) {
      return;
    }

    logger.warn("界面当前存在错误提示", {
      error,
    });
  }, [error, logger]);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([client.theme.getCurrent({ appId: appConfig.appId }), client.i18n.getCurrent()])
      .then(([, currentLocale]) => {
        if (!cancelled) {
          setLocale(resolveLocale(currentLocale));
        }
      })
      .catch((runtimeError) => {
        logger.warn("读取运行时主题或语言失败，继续使用文档已注入的快照", runtimeError);
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

    const launchParams = resolveLaunchParams(nextLaunchContext);
    const webDocumentUrl = resolveWebDocumentUrl(launchParams);
    if (webDocumentUrl) {
      logger.info("从 Web 启动上下文恢复托管文档查看态", {
        documentUrl: webDocumentUrl,
        trigger: launchParams.trigger,
      });
      setOpenedTarget({
        kind: "document",
        documentUrl: webDocumentUrl,
      });
      setError(null);
      return;
    }

    const targetPath = typeof launchParams.targetPath === "string" ? launchParams.targetPath : "";
    if (!targetPath) {
      return;
    }

    const nextTarget = resolveOpenedTarget(targetPath);

    if (!nextTarget || client.document.detectType(nextTarget.filePath) === null) {
      setError(t("card-viewer.errors.unsupportedFile"));
      return;
    }

    logger.info("从启动上下文恢复目标文件", {
      targetPath,
      trigger: launchParams.trigger,
    });
    setOpenedTarget(nextTarget);
    setError(null);
  }, [client, logger, t]);

  React.useEffect(() => {
    return client.i18n.onChanged((payload) => {
      if (typeof payload?.locale === "string") {
        setLocale(resolveLocale(payload.locale));
      }
    });
  }, [client]);

  const surfaceMode = openedTarget?.kind === "document" ? "document" : "immersive";

  React.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-chips-surface-mode", surfaceMode);
    document.body.setAttribute("data-chips-surface-mode", surfaceMode);

    return () => {
      document.documentElement.removeAttribute("data-chips-surface-mode");
      document.body.removeAttribute("data-chips-surface-mode");
    };
  }, [surfaceMode]);

  const openFilePath = React.useCallback((filePath: string) => {
    const nextTarget = resolveOpenedTarget(filePath);
    if (!nextTarget || client.document.detectType(nextTarget.filePath) === null) {
      logger.warn("选择的文件类型当前不受支持", {
        filePath,
      });
      setError(t("card-viewer.errors.unsupportedFile"));
      return;
    }

    logger.info("用户已选定查看目标", {
      filePath,
    });
    setError(null);
    setOpenedTarget(nextTarget);
  }, [client, logger, t]);

  const openFile = React.useCallback(async () => {
    try {
      setError(null);
      logger.info("用户点击“打开文件”按钮，准备调用文件选择对话框");
      const selected = await client.platform.openFile({
        title: t("card-viewer.dialogs.openFileTitle"),
        mode: "file",
        allowMultiple: false,
        mustExist: true,
      });

      const filePath = Array.isArray(selected) ? selected[0] : undefined;
      logger.info("文件选择对话框已返回", {
        fileCount: Array.isArray(selected) ? selected.length : 0,
        selected: filePath,
      });
      if (filePath) {
        openFilePath(filePath);
      }
    } catch (runtimeError) {
      logger.error("通过按钮选择查看目标失败", runtimeError);
      setError(resolveErrorMessage(runtimeError, t("card-viewer.errors.hostActionFailed")));
    }
  }, [client, logger, openFilePath, t]);

  const activeSceneId = getSceneIdForTarget(openedTarget);
  const activeScene = getSceneDefinition(activeSceneId);
  const environment = React.useMemo<CardViewerRuntimeEnvironment>(() => ({
    appId: appConfig.appId,
    pluginId: launchContext.surfaceContext?.pluginId ?? launchContext.pluginId ?? appConfig.appId,
    hostSceneId: resolveHostSceneId(launchContext),
    activeSceneId,
    surfaceId: launchContext.surfaceContext?.surfaceId ?? launchContext.surfaceId ?? null,
    sessionId: launchContext.surfaceContext?.sessionId ?? launchContext.sessionId ?? null,
    surfaceKind: resolveSurfaceKind(launchContext),
    launchParams: resolveLaunchParams(launchContext),
  }), [activeSceneId, launchContext]);

  const value = React.useMemo<CardViewerRuntimeValue>(() => ({
    client,
    traceId,
    launchContext,
    surface: launchContext.surfaceContext ?? null,
    environment,
    activeSceneId,
    activeScene,
    openedTarget,
    error,
    locale,
    surfaceMode,
    t,
    openFile,
    openFilePath,
  }), [
    activeScene,
    activeSceneId,
    client,
    environment,
    error,
    launchContext,
    locale,
    openFile,
    openFilePath,
    openedTarget,
    surfaceMode,
    t,
    traceId,
  ]);

  return <AppRuntimeContext.Provider value={value}>{children}</AppRuntimeContext.Provider>;
}

export function useAppRuntime(): CardViewerRuntimeValue {
  const context = React.useContext(AppRuntimeContext);
  if (!context) {
    throw new Error("AppRuntimeContext is not available.");
  }

  return context;
}

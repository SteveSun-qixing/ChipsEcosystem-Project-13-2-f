import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChipsThemeProvider } from "@chips/component-library";
import { CardViewerShell } from "./components/CardViewerShell";
import { DropZone } from "./components/DropZone";
import { ViewerChrome, type ViewerChromeState } from "./components/ViewerChrome";
import { ViewerSource } from "./components/ViewerSourceProvider";
import { ViewerStage } from "./components/ViewerStage";
import { formatMessage, resolveLocale } from "./i18n/messages";
import { useChipsClient } from "./hooks/useChipsClient";
import { useChipsBridge } from "./hooks/useChipsBridge";
import { appConfig } from "../config/app-config";
import { createLogger, createTraceId } from "../config/logging";
import type { CardViewerSource } from "./types/viewer-source";
import { resolveCardViewerSource } from "./types/viewer-source";

interface AppThemeState {
  themeId: string;
  version: string;
}

const DEFAULT_THEME_STATE: AppThemeState = {
  themeId: "chips-official.default-theme",
  version: "1.0.0",
};

const VIEWER_CHROME_SAFE_BLOCK_START = 96;

function readDocumentThemeState(): AppThemeState {
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

function detectDocumentKindFromPath(filePath: string): "card" | "box" | null {
  const normalized = filePath.trim();
  if (!normalized) {
    return null;
  }
  const lowered = normalized.toLowerCase();
  if (lowered.endsWith(".card")) {
    return "card";
  }
  if (lowered.endsWith(".box")) {
    return "box";
  }
  return null;
}

function resolveLocalFileSource(filePath: string): CardViewerSource | null {
  const normalized = filePath.trim();
  const documentKind = detectDocumentKindFromPath(normalized);
  if (!documentKind) {
    return null;
  }
  return {
    kind: "local-file",
    documentKind,
    filePath: normalized,
  };
}

function formatDateLabel(value: string | undefined, locale: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function createChromeState(params: {
  title?: string;
  createdAt?: string;
  locale: string;
  backLabel: string;
  hasSource: boolean;
}): ViewerChromeState {
  const metaLine = formatDateLabel(params.createdAt, params.locale);
  return {
    title: params.title,
    metaLines: metaLine ? [metaLine] : [],
    back: {
      label: params.backLabel,
      enabled: params.hasSource,
    },
    actions: [],
    safeBlockStart: VIEWER_CHROME_SAFE_BLOCK_START,
  };
}

export function App() {
  const bridge = useChipsBridge();
  const themeEventSource = typeof window !== "undefined" ? (window as any).chips : undefined;
  const traceId = useMemo(() => createTraceId("card-viewer"), []);
  const logger = useMemo(
    () =>
      createLogger({
        scope: "app",
        traceId,
      }),
    [traceId],
  );
  const client = useChipsClient(traceId);
  const [viewerSource, setViewerSource] = useState<CardViewerSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeState, setThemeState] = useState<AppThemeState>(() => readDocumentThemeState());
  const [locale, setLocale] = useState(() => resolveLocale(typeof document !== "undefined" ? document.documentElement.lang : undefined));
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => formatMessage(locale, key, params),
    [locale],
  );
  const surfaceMode = viewerSource ? "document" : "immersive";
  const externalChrome = viewerSource?.kind === "community-card" || viewerSource?.kind === "community-box";

  useEffect(() => {
    if (appConfig.featureFlags.enableDiagnosticsLogging) {
      logger.info("卡片查看器应用已初始化", {
        appId: appConfig.appId,
        diagnosticsLogging: appConfig.featureFlags.enableDiagnosticsLogging,
      });
    }

    return () => {
      logger.info("卡片查看器应用已卸载");
    };
  }, [logger]);

  useEffect(() => {
    logger.debug("当前查看目标状态已更新", {
      hasViewerSource: viewerSource !== null,
      sourceKind: viewerSource?.kind ?? null,
      filePath: viewerSource?.kind === "local-file" ? viewerSource.filePath : null,
      documentUrl:
        viewerSource?.kind === "community-card" || viewerSource?.kind === "community-box"
          ? viewerSource.documentUrl
          : null,
    });
  }, [logger, viewerSource]);

  useEffect(() => {
    if (!error) {
      return;
    }

    logger.warn("界面当前存在错误提示", {
      error,
    });
  }, [error, logger]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([client.theme.getCurrent(), client.i18n.getCurrent()])
      .then(([currentTheme, currentLocale]) => {
        if (cancelled) {
          return;
        }

        setThemeState({
          themeId: currentTheme.themeId,
          version: currentTheme.version,
        });
        setLocale(resolveLocale(currentLocale));
      })
      .catch((runtimeError) => {
        logger.warn("读取当前主题失败，继续使用文档已注入的主题快照", runtimeError);
      });

    return () => {
      cancelled = true;
    };
  }, [client, logger]);

  useEffect(() => {
    const launchContext = client.platform.getLaunchContext();
    const source = resolveCardViewerSource(launchContext.launchParams);
    if (!source) {
      return;
    }

    logger.info("从启动上下文恢复查看来源", {
      sourceKind: source.kind,
      trigger: launchContext.launchParams.trigger,
    });
    setViewerSource(source);
    setError(null);
  }, [client.platform, logger]);

  useEffect(() => {
    const unsubscribe = bridge.on("language.changed", (payload: unknown) => {
      const nextLocale = typeof payload === "string"
        ? payload
        : payload && typeof payload === "object" && "locale" in payload && typeof (payload as { locale?: unknown }).locale === "string"
          ? (payload as { locale: string }).locale
          : null;
      if (nextLocale) {
        setLocale(resolveLocale(nextLocale));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bridge]);

  useEffect(() => {
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

  const handleResolvedFilePath = useCallback((filePath: string) => {
    const nextSource = resolveLocalFileSource(filePath);
    if (!nextSource) {
      logger.warn("选择的文件类型当前不受支持", {
        filePath,
      });
      setError(t("card-viewer.errors.unsupportedFile"));
      return;
    }
    logger.info("用户已选定查看目标", {
      filePath,
      documentKind: nextSource.documentKind,
    });
    setError(null);
    setViewerSource(nextSource);
  }, [logger, t]);

  const handleOpenFile = useCallback(async () => {
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
        handleResolvedFilePath(filePath);
      }
    } catch (runtimeError) {
      logger.error("通过按钮选择查看目标失败", runtimeError);
      setError(resolveErrorMessage(runtimeError, t("card-viewer.errors.hostActionFailed")));
    }
  }, [client, handleResolvedFilePath, logger, t]);

  const emptyContent = (
    <DropZone
      error={error}
      onOpenFile={handleOpenFile}
      traceId={traceId}
      ariaLabel={t("card-viewer.dropzone.ariaLabel")}
      title={t("card-viewer.dropzone.title")}
      description={t("card-viewer.dropzone.description")}
      openLabel={t("card-viewer.actions.open")}
      onFilePath={handleResolvedFilePath}
    />
  );

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    setViewerSource(null);
  }, []);

  return (
    <ChipsThemeProvider
      themeId={themeState.themeId}
      version={themeState.version}
      eventSource={themeEventSource}
      eventName="theme.changed"
    >
      <ViewerSource.Provider
        client={client}
        source={viewerSource}
        metadataErrorFallback={t("card-viewer.viewer.localMetadataError")}
      >
        <ViewerSource.Outlet>
          {({ source, error: sourceError }) => (
            <ViewerChrome.Provider
              externalChrome={externalChrome}
              onBack={handleBack}
              state={createChromeState({
                title: source?.title,
                createdAt: source?.createdAt,
                locale,
                backLabel: t("card-viewer.actions.back"),
                hasSource: Boolean(source),
              })}
            >
              <CardViewerShell surfaceMode={surfaceMode}>
                <ViewerChrome.Layer />
                <ViewerStage
                  source={source}
                  error={error ?? sourceError}
                  empty={emptyContent}
                  unsupportedRemoteLabel={t("card-viewer.viewer.remoteCardUnsupported")}
                  traceId={traceId}
                  locale={locale}
                  loadingLabel={t("card-viewer.viewer.documentLoading")}
                  containerErrorLabel={t("card-viewer.viewer.documentContainerError")}
                  fatalErrorFallback={t("card-viewer.viewer.documentFatalError")}
                  renderErrorFallback={t("card-viewer.viewer.documentRenderError")}
                  resourceOpenErrorTitle={t("card-viewer.errors.resourceOpenFailedTitle")}
                  resourceOpenErrorFallback={t("card-viewer.errors.resourceOpenFailed")}
                />
              </CardViewerShell>
            </ViewerChrome.Provider>
          )}
        </ViewerSource.Outlet>
      </ViewerSource.Provider>
    </ChipsThemeProvider>
  );
}

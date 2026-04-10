import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChipsThemeProvider } from "@chips/component-library";
import { CardViewerShell } from "./components/CardViewerShell";
import { DropZone } from "./components/DropZone";
import { CardWindow } from "./components/CardWindow";
import { formatMessage, resolveLocale } from "./i18n/messages";
import { useChipsClient } from "./hooks/useChipsClient";
import { useChipsBridge } from "./hooks/useChipsBridge";
import { appConfig } from "../config/app-config";
import { createLogger, createTraceId } from "../config/logging";

interface AppThemeState {
  themeId: string;
  version: string;
}

interface OpenedTarget {
  filePath: string;
}

const DEFAULT_THEME_STATE: AppThemeState = {
  themeId: "chips-official.default-theme",
  version: "1.0.0",
};

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

function resolveOpenedTarget(filePath: string): OpenedTarget | null {
  const normalized = filePath.trim();
  if (!normalized) {
    return null;
  }
  return {
    filePath: normalized,
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
  const [openedTarget, setOpenedTarget] = useState<OpenedTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeState, setThemeState] = useState<AppThemeState>(() => readDocumentThemeState());
  const [locale, setLocale] = useState(() => resolveLocale(typeof document !== "undefined" ? document.documentElement.lang : undefined));
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => formatMessage(locale, key, params),
    [locale],
  );

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
      hasOpenedTarget: openedTarget !== null,
      filePath: openedTarget?.filePath ?? null,
    });
  }, [logger, openedTarget]);

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
    const targetPath = typeof launchContext.launchParams.targetPath === "string"
      ? launchContext.launchParams.targetPath
      : "";

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
      trigger: launchContext.launchParams.trigger,
    });
    setOpenedTarget(nextTarget);
    setError(null);
  }, [client, logger, t]);

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

  const handleResolvedFilePath = useCallback((filePath: string) => {
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
  }, [client.document, logger, t]);

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

  const content =
    openedTarget === null ? (
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
    ) : (
      <CardWindow
        filePath={openedTarget.filePath}
        traceId={traceId}
        locale={locale}
        loadingLabel={t("card-viewer.viewer.documentLoading")}
        containerErrorLabel={t("card-viewer.viewer.documentContainerError")}
        fatalErrorFallback={t("card-viewer.viewer.documentFatalError")}
        renderErrorFallback={t("card-viewer.viewer.documentRenderError")}
        resourceOpenErrorTitle={t("card-viewer.errors.resourceOpenFailedTitle")}
        resourceOpenErrorFallback={t("card-viewer.errors.resourceOpenFailed")}
      />
    );

  return (
    <ChipsThemeProvider
      themeId={themeState.themeId}
      version={themeState.version}
      eventSource={themeEventSource}
      eventName="theme.changed"
    >
      <CardViewerShell
        content={content}
      />
    </ChipsThemeProvider>
  );
}

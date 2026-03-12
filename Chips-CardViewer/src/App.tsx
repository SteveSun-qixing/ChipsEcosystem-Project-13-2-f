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
  const [cardFile, setCardFile] = useState<string | null>(null);
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
    logger.debug("当前卡片文件状态已更新", {
      hasCardFile: cardFile !== null,
      cardFile,
    });
  }, [cardFile, logger]);

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
    if (targetPath) {
      logger.info("从启动上下文恢复目标卡片文件", {
        targetPath,
        trigger: launchContext.launchParams.trigger,
      });
      setCardFile(targetPath);
      setError(null);
    }
  }, [client, logger]);

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

  const handleOpenCard = useCallback(async () => {
    try {
      setError(null);
      logger.info("用户点击“选择导入卡片”按钮，准备调用文件选择对话框");
      const result = await client.invoke<
        {
          options: {
            title: string;
            mode: "file";
            allowMultiple: false;
            mustExist: true;
          };
        },
        { filePaths: string[] | null }
      >("platform.dialogOpenFile", {
        options: {
          title: t("card-viewer.dialogs.openCardTitle"),
          mode: "file",
          allowMultiple: false,
          mustExist: true,
        },
      });

      const selected = Array.isArray(result.filePaths) ? result.filePaths[0] : undefined;
      logger.info("文件选择对话框已返回", {
        fileCount: Array.isArray(result.filePaths) ? result.filePaths.length : 0,
        selected,
      });
      if (selected) {
        setCardFile(selected);
      }
    } catch (runtimeError) {
      logger.error("通过按钮导入卡片失败", runtimeError);
      setError(resolveErrorMessage(runtimeError, t("card-viewer.errors.hostActionFailed")));
    }
  }, [client, logger, t]);

  const content =
    cardFile === null ? (
      <DropZone
        error={error}
        onOpenCard={handleOpenCard}
        traceId={traceId}
        ariaLabel={t("card-viewer.dropzone.ariaLabel")}
        title={t("card-viewer.dropzone.title")}
        description={t("card-viewer.dropzone.description")}
        openLabel={t("card-viewer.actions.open")}
        onCardFile={(nextCardFile) => {
          logger.info("拖拽导入已选定卡片文件", {
            cardFile: nextCardFile,
          });
          setError(null);
          setCardFile(nextCardFile);
        }}
      />
    ) : (
      <CardWindow
        cardFile={cardFile}
        traceId={traceId}
        loadingLabel={t("card-viewer.viewer.loading")}
        containerErrorLabel={t("card-viewer.viewer.containerError")}
        fatalErrorFallback={t("card-viewer.viewer.fatalError")}
        renderErrorFallback={t("card-viewer.viewer.renderError")}
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

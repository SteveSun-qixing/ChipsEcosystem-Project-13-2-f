import React, { useEffect, useMemo, useState } from "react";
import { ChipsThemeProvider, ChipsButton } from "@chips/component-library";
import { CardViewerShell } from "./components/CardViewerShell";
import { DropZone } from "./components/DropZone";
import { CardWindow } from "./components/CardWindow";
import { useChipsClient } from "./hooks/useChipsClient";
import { appConfig } from "../config/app-config";
import { createLogger, createTraceId } from "../config/logging";

function resolveErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return "操作失败，请检查 Host 日志与桥接链路。";
}

export function App() {
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

  const toolbar = (
    <div style={{ display: "flex", gap: 8, WebkitAppRegion: "no-drag" }}>
      <ChipsButton
        variant="secondary"
        onClick={async () => {
          try {
            setError(null);
            logger.info("用户点击“打开卡片”按钮，准备调用文件选择对话框");
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
                title: "打开卡片文件",
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
            setError(resolveErrorMessage(runtimeError));
          }
        }}
      >
        打开卡片
      </ChipsButton>
    </div>
  );

  const content =
    cardFile === null ? (
      <DropZone
        traceId={traceId}
        onCardFile={(nextCardFile) => {
          logger.info("拖拽导入已选定卡片文件", {
            cardFile: nextCardFile,
          });
          setError(null);
          setCardFile(nextCardFile);
        }}
      />
    ) : (
      <CardWindow cardFile={cardFile} traceId={traceId} />
    );

  return (
    <ChipsThemeProvider
      themeId="chips-official.default-theme"
      version="1.0.0"
      eventSource={themeEventSource}
      eventName="theme.changed"
    >
      <CardViewerShell
        toolbar={toolbar}
        content={
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {error ? (
              <div
                role="alert"
                style={{
                  borderRadius: 8,
                  border:
                    "1px solid color-mix(in srgb, var(--chips-sys-color-error, #d92d20) 28%, transparent)",
                  background:
                    "color-mix(in srgb, var(--chips-sys-color-error, #d92d20) 10%, var(--chips-sys-color-surface, #ffffff))",
                  color: "var(--chips-sys-color-error, #d92d20)",
                  padding: "10px 12px",
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            ) : null}
            <div style={{ flex: 1, minHeight: 0 }}>{content}</div>
          </div>
        }
      />
    </ChipsThemeProvider>
  );
}

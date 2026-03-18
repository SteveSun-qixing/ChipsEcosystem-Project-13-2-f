import React, { useEffect, useMemo, useRef, useState } from "react";
import { useThemeRuntime } from "@chips/component-library";
import type { FrameRenderResult } from "chips-sdk";
import { useChipsClient } from "../hooks/useChipsClient";
import { createScopedLogger } from "../../config/logging";
import "./CardWindow.css";

interface CardWindowProps {
  cardFile: string;
  traceId?: string;
  loadingLabel: string;
  containerErrorLabel: string;
  fatalErrorFallback: string;
  renderErrorFallback: string;
}

export function CardWindow({
  cardFile,
  traceId,
  loadingLabel,
  containerErrorLabel,
  fatalErrorFallback,
  renderErrorFallback,
}: CardWindowProps) {
  const themeRuntime = useThemeRuntime();
  const logger = useMemo(
    () =>
      createScopedLogger({
        scope: "card-window",
        traceId,
      }),
    [traceId],
  );
  const client = useChipsClient(traceId ?? "card-window");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cleanupTasks: Array<() => void> = [];
    logger.info("准备渲染复合卡片窗口", {
      cardFile,
      themeCacheKey: themeRuntime.cacheKey,
    });
    const api = client.card.compositeWindow as {
      render: (options: { cardFile: string; mode?: "view" | "preview" }) => Promise<FrameRenderResult>;
      onReady?: (frame: HTMLIFrameElement, handler: () => void) => () => void;
      onNodeError?: (
        frame: HTMLIFrameElement,
        handler: (payload: { nodeId: string; code: string; message: string; stage?: string }) => void,
      ) => () => void;
      onFatalError?: (
        frame: HTMLIFrameElement,
        handler: (err: { code: string; message: string }) => void,
      ) => () => void;
    };

    const container = containerRef.current;
    if (!container) {
      logger.error("找不到卡片窗口容器");
      setError(containerErrorLabel);
      return;
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    setIsLoading(true);
    setError(null);
    logger.debug("卡片窗口容器已清空，开始调用 SDK 渲染接口");

    api
      .render({ cardFile, mode: "view" })
      .then((result) => {
        if (cancelled) {
          logger.warn("SDK 渲染结果返回时组件已取消，忽略本次结果", {
            cardFile,
          });
          return;
        }
        const frame = result.frame;
        logger.info("SDK 已返回复合卡片 iframe", {
          origin: result.origin,
          frameTitle: frame.title,
        });
        frameRef.current = frame;
        frame.style.width = "100%";
        frame.style.height = "100%";
        frame.style.border = "none";
        const handleFrameLoad = () => {
          logger.info("iframe 触发原生 load 事件", {
            src: frame.getAttribute("src"),
            srcdocLength: frame.srcdoc?.length ?? 0,
          });
          if (!cancelled) {
            setIsLoading(false);
          }
        };
        const handleFrameError = () => {
          logger.error("iframe 触发原生 error 事件", {
            src: frame.getAttribute("src"),
          });
        };
        frame.addEventListener("load", handleFrameLoad);
        frame.addEventListener("error", handleFrameError);
        cleanupTasks.push(() => {
          frame.removeEventListener("load", handleFrameLoad);
          frame.removeEventListener("error", handleFrameError);
        });
        container.appendChild(frame);
        logger.debug("iframe 已挂载到卡片窗口容器");

        if (api.onReady) {
          cleanupTasks.push(
            api.onReady(frame, () => {
              if (!cancelled) {
                logger.info("收到复合卡片 ready 事件", {
                  cardFile,
                });
                setIsLoading(false);
              }
            }),
          );
        } else {
          logger.warn("SDK 未提供 onReady 事件订阅接口，直接结束 loading 状态");
          setIsLoading(false);
        }

        if (api.onFatalError) {
          cleanupTasks.push(
            api.onFatalError(frame, (fatal) => {
              if (!cancelled) {
                logger.error("收到复合卡片 fatal-error 事件", fatal);
                setIsLoading(false);
                setError(fatal.message || fatalErrorFallback);
              }
            }),
          );
        } else {
          logger.warn("SDK 未提供 onFatalError 事件订阅接口");
        }

        if (api.onNodeError) {
          cleanupTasks.push(
            api.onNodeError(frame, (payload) => {
              logger.warn("收到复合卡片 node-error 事件", payload);
            }),
          );
        } else {
          logger.warn("SDK 未提供 onNodeError 事件订阅接口");
        }
      })
      .catch((err: { code?: string; message?: string }) => {
        if (!cancelled) {
          logger.error("SDK 复合卡片渲染失败", err);
          setIsLoading(false);
          setError(err?.message || renderErrorFallback);
        }
      });

    return () => {
      cancelled = true;
      logger.info("开始清理卡片窗口渲染上下文", {
        cardFile,
        cleanupCount: cleanupTasks.length,
      });
      for (const task of cleanupTasks) {
        task();
      }
      const frame = frameRef.current;
      if (frame && frame.parentElement) {
        frame.parentElement.removeChild(frame);
        logger.debug("已从容器中移除 iframe");
      }
      frameRef.current = null;
    };
  }, [cardFile, client, logger, themeRuntime.cacheKey]);

  return (
    <div
      data-chips-app="card-viewer.window"
      className="card-viewer-window"
    >
      <div
        data-chips-app="card-viewer.viewport"
        className="card-viewer-window__viewport"
      >
        <div
          ref={containerRef}
          className="card-viewer-window__frame-host"
        />
        {isLoading && (
          <div
            data-scope="composite-card-window"
            data-part="overlay"
            data-state="loading"
            className="card-viewer-window__overlay"
          >
            {loadingLabel}
          </div>
        )}
        {error && (
          <div
            data-scope="composite-card-window"
            data-part="overlay"
            data-state="error"
            className="card-viewer-window__overlay card-viewer-window__overlay--error"
          >
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

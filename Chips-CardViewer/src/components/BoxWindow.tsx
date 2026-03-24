import React, { useEffect, useMemo, useRef, useState } from "react";
import { createScopedLogger } from "../../config/logging";
import { createBoxLayoutRuntime, loadLayoutDefinition } from "../box-runtime/layout-loader";
import { useChipsClient } from "../hooks/useChipsClient";
import "./CardWindow.css";

interface BoxWindowProps {
  boxFile: string;
  traceId?: string;
  locale?: string;
  loadingLabel: string;
  containerErrorLabel: string;
  renderErrorFallback: string;
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

export function BoxWindow({
  boxFile,
  traceId,
  locale,
  loadingLabel,
  containerErrorLabel,
  renderErrorFallback,
}: BoxWindowProps) {
  const logger = useMemo(
    () =>
      createScopedLogger({
        scope: "box-window",
        traceId,
      }),
    [traceId],
  );
  const client = useChipsClient(traceId ?? "box-window");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const mountBox = async () => {
      const container = containerRef.current;
      if (!container) {
        logger.error("找不到箱子布局容器");
        setError(containerErrorLabel);
        return;
      }

      cleanupRef.current?.();
      cleanupRef.current = null;
      sessionIdRef.current = null;
      container.replaceChildren();
      setIsLoading(true);
      setError(null);

      try {
        logger.info("准备打开箱子查看会话", {
          boxFile,
        });
        const inspection = await client.box.inspect(boxFile);
        const layoutType = inspection.content.activeLayoutType || inspection.metadata.activeLayoutType;
        const layoutDefinition = await loadLayoutDefinition(client, layoutType);
        const rawConfig = inspection.content.layoutConfigs[layoutType] ?? layoutDefinition.createDefaultConfig();
        const config = layoutDefinition.normalizeConfig(rawConfig);
        const opened = await client.box.openView(boxFile, {
          layoutType,
          initialQuery: layoutDefinition.getInitialQuery?.(config),
        });

        if (cancelled) {
          await client.box.closeView(opened.sessionId).catch(() => undefined);
          return;
        }

        const runtime = createBoxLayoutRuntime(client, opened.sessionId);
        const cleanup = layoutDefinition.renderView({
          container,
          sessionId: opened.sessionId,
          box: opened.box,
          initialView: opened.initialView,
          config,
          runtime,
          locale,
        });

        sessionIdRef.current = opened.sessionId;
        cleanupRef.current = typeof cleanup === "function" ? cleanup : null;
        setIsLoading(false);
        logger.info("箱子布局已挂载完成", {
          boxFile,
          sessionId: opened.sessionId,
          layoutType,
        });
      } catch (runtimeError) {
        logger.error("箱子查看态渲染失败", runtimeError);
        if (!cancelled) {
          setIsLoading(false);
          setError(resolveErrorMessage(runtimeError, renderErrorFallback));
        }
      }
    };

    void mountBox();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
      containerRef.current?.replaceChildren();
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (sessionId) {
        void client.box.closeView(sessionId).catch(() => undefined);
      }
    };
  }, [boxFile, client, containerErrorLabel, locale, logger, renderErrorFallback]);

  return (
    <div
      data-chips-app="box-viewer.window"
      className="card-viewer-window"
    >
      <div
        data-chips-app="box-viewer.viewport"
        className="card-viewer-window__viewport"
      >
        <div
          ref={containerRef}
          className="card-viewer-window__frame-host"
        />
        {isLoading && (
          <div
            data-scope="box-layout-window"
            data-part="overlay"
            data-state="loading"
            className="card-viewer-window__overlay"
          >
            {loadingLabel}
          </div>
        )}
        {error && (
          <div
            data-scope="box-layout-window"
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

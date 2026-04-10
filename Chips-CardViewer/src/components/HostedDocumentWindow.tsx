import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useChipsBridge } from "../hooks/useChipsBridge";
import { useChipsClient } from "../hooks/useChipsClient";
import { createScopedLogger } from "../../config/logging";
import "./CardWindow.css";

interface HostedDocumentWindowProps {
  documentUrl: string;
  traceId?: string;
  loadingLabel: string;
  containerErrorLabel: string;
  resourceOpenErrorTitle: string;
  resourceOpenErrorFallback: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function HostedDocumentWindow({
  documentUrl,
  traceId,
  loadingLabel,
  containerErrorLabel,
  resourceOpenErrorTitle,
  resourceOpenErrorFallback,
}: HostedDocumentWindowProps) {
  const bridge = useChipsBridge();
  const logger = useMemo(
    () =>
      createScopedLogger({
        scope: "hosted-document-window",
        traceId,
      }),
    [traceId],
  );
  const client = useChipsClient(traceId ?? "hosted-document-window");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentHeight, setDocumentHeight] = useState(() => (typeof window !== "undefined" ? Math.max(window.innerHeight, 960) : 960));

  const publishDocumentHeight = (nextHeight: number) => {
    const normalizedHeight = Math.max(320, Math.ceil(nextHeight));
    setDocumentHeight(normalizedHeight);
    if (typeof bridge.emit === "function") {
      void bridge.emit("plugin.surface.resize", {
        height: normalizedHeight,
      }).catch(() => undefined);
    }
  };

  useLayoutEffect(() => {
    const frame = iframeRef.current;
    if (!frame) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const handleFrameLoad = () => {
      logger.info("托管文档 iframe 已完成原生加载", {
        documentUrl,
      });
      setIsLoading(false);
      setError(null);
    };

    const handleFrameError = () => {
      logger.error("托管文档 iframe 原生加载失败", {
        documentUrl,
      });
      setIsLoading(false);
      setError(containerErrorLabel);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) {
        return;
      }

      const payload = event.data;
      if (!isRecord(payload) || typeof payload.type !== "string") {
        return;
      }

      if (payload.type === "chips.composite:ready") {
        logger.info("托管文档已通过正式复合卡片运行时发出 ready 事件", {
          documentUrl,
          payload: payload.payload,
        });
        setError(null);
        setIsLoading(false);
        return;
      }

      if (payload.type === "chips.composite:resize") {
        const height =
          isRecord(payload.payload) && Number.isFinite(Number(payload.payload.height))
            ? Number(payload.payload.height)
            : null;
        if (height) {
          publishDocumentHeight(height);
        }
        setIsLoading(false);
        return;
      }

      if (payload.type === "chips.composite:fatal-error") {
        logger.error("托管文档复合卡片运行时报告致命错误", payload.payload);
        setIsLoading(false);
        setError(containerErrorLabel);
        return;
      }

      if (payload.type !== "chips.composite:resource-open" || !isRecord(payload.payload)) {
        return;
      }

      void client.resource
        .open({
          intent: typeof payload.payload.intent === "string" ? payload.payload.intent : undefined,
          resource: {
            resourceId: typeof payload.payload.resourceId === "string" ? payload.payload.resourceId : "",
            mimeType: typeof payload.payload.mimeType === "string" ? payload.payload.mimeType : undefined,
            title: typeof payload.payload.title === "string" ? payload.payload.title : undefined,
            fileName: typeof payload.payload.fileName === "string" ? payload.payload.fileName : undefined,
          },
        })
        .catch((resourceError) => {
          logger.error("通过正式资源路由打开文档内资源失败", resourceError);
          void client.platform.showMessage({
            title: resourceOpenErrorTitle,
            message:
              resourceError && typeof resourceError === "object" && "message" in resourceError && typeof resourceError.message === "string"
                ? resourceError.message
                : resourceOpenErrorFallback,
          }).catch(() => undefined);
        });
    };

    window.addEventListener("message", handleMessage);
    frame.addEventListener("load", handleFrameLoad);
    frame.addEventListener("error", handleFrameError);

    frame.removeAttribute("src");
    frame.src = documentUrl;

    return () => {
      window.removeEventListener("message", handleMessage);
      frame.removeEventListener("load", handleFrameLoad);
      frame.removeEventListener("error", handleFrameError);
      frame.removeAttribute("src");
    };
  }, [client, containerErrorLabel, documentUrl, logger, resourceOpenErrorFallback, resourceOpenErrorTitle]);

  return (
    <div
      data-chips-app="card-viewer.window"
      className="card-viewer-window card-viewer-window--document-flow"
    >
      <div
        data-chips-app="card-viewer.viewport"
        className="card-viewer-window__viewport card-viewer-window__viewport--document-flow"
      >
        <div className="card-viewer-window__frame-host card-viewer-window__frame-host--document-flow">
          <iframe
            ref={iframeRef}
            className="card-viewer-window__iframe card-viewer-window__iframe--document-flow"
            title="Hosted Card Document"
            sandbox="allow-scripts allow-same-origin allow-popups"
            style={{ height: `${documentHeight}px` }}
          />
        </div>
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

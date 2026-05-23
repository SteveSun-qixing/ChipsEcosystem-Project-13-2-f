import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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

type DocumentSurfaceResizeReason =
  | "initial"
  | "content-resize"
  | "asset-load"
  | "font-load"
  | "viewport-resize";

interface DocumentSurfaceResizePayload {
  height: number;
  contentHeight: number;
  safeBlockEnd: number;
  viewportHeight: number;
  reason: DocumentSurfaceResizeReason;
  stable: boolean;
}

const DOCUMENT_FLOW_MIN_CONTENT_HEIGHT = 320;
const DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT = 960;
const DOCUMENT_FLOW_SAFE_BLOCK_END_FALLBACK = 72;
const DOCUMENT_FLOW_STABLE_DELAY_MS = 160;
const DOCUMENT_FLOW_HEIGHT_EPSILON = 1;

function readElementBlockSize(element: HTMLElement | null, fallback: number): number {
  if (!element || typeof window === "undefined") {
    return fallback;
  }

  const rectHeight = element.getBoundingClientRect().height;
  if (Number.isFinite(rectHeight) && rectHeight > 0) {
    return Math.ceil(rectHeight);
  }

  const computedBlockSize = Number.parseFloat(window.getComputedStyle(element).blockSize);
  if (Number.isFinite(computedBlockSize) && computedBlockSize > 0) {
    return Math.ceil(computedBlockSize);
  }

  return fallback;
}

function normalizeDocumentSurfaceReason(reason: unknown): DocumentSurfaceResizeReason {
  if (
    reason === "initial"
    || reason === "asset-load"
    || reason === "font-load"
    || reason === "viewport-resize"
  ) {
    return reason;
  }

  return "content-resize";
}

function getViewportHeight(): number {
  if (typeof window === "undefined" || !Number.isFinite(window.innerHeight)) {
    return 0;
  }

  return Math.ceil(window.innerHeight);
}

function clearScheduledFrame(frameId: number): void {
  if (typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(frameId);
  } else {
    window.clearTimeout(frameId);
  }
}

function shouldPublishSurfaceResize(
  previous: DocumentSurfaceResizePayload | null,
  next: DocumentSurfaceResizePayload,
): boolean {
  if (!previous) {
    return true;
  }

  return (
    Math.abs(previous.height - next.height) >= DOCUMENT_FLOW_HEIGHT_EPSILON
    || Math.abs(previous.contentHeight - next.contentHeight) >= DOCUMENT_FLOW_HEIGHT_EPSILON
    || Math.abs(previous.safeBlockEnd - next.safeBlockEnd) >= DOCUMENT_FLOW_HEIGHT_EPSILON
    || previous.viewportHeight !== next.viewportHeight
    || previous.reason !== next.reason
    || previous.stable !== next.stable
  );
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const safeAreaRef = useRef<HTMLDivElement | null>(null);
  const lastPublishedPayloadRef = useRef<DocumentSurfaceResizePayload | null>(null);
  const pendingReasonRef = useRef<DocumentSurfaceResizeReason>("initial");
  const innerDocumentHeightRef = useRef(DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT);
  const currentDocumentHeightRef = useRef(DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT);
  const pendingDocumentHeightRef = useRef(DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT);
  const renderedDocumentHeightRef = useRef(DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT);
  const pendingMeasureModeRef = useRef<"layout" | "target">("layout");
  const scheduledHeightFrameRef = useRef<number | null>(null);
  const stableHeightTimerRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentHeight, setDocumentHeight] = useState(() =>
    DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT,
  );

  const readSafeBlockEnd = useCallback(
    () => readElementBlockSize(safeAreaRef.current, DOCUMENT_FLOW_SAFE_BLOCK_END_FALLBACK),
    [],
  );

  const measureHostedDocumentHeight = useCallback((mode: "layout" | "target" = "layout"): number => {
    const frame = iframeRef.current;
    const content = contentRef.current;
    const root = rootRef.current;
    const contentTop = content?.getBoundingClientRect().top ?? root?.getBoundingClientRect().top ?? 0;
    const frameTop = frame
      ? Math.max(0, frame.getBoundingClientRect().top - contentTop)
      : 0;
    const measuredContentHeight = mode === "layout" && content
      ? Math.max(
          content.scrollHeight,
          content.offsetHeight,
          content.getBoundingClientRect().height,
        )
      : 0;

    return Math.max(
      DOCUMENT_FLOW_MIN_CONTENT_HEIGHT,
      Math.ceil(measuredContentHeight),
      Math.ceil(innerDocumentHeightRef.current + frameTop),
    );
  }, []);

  const publishDocumentHeight = useCallback((
    nextHeight: number,
    reason: DocumentSurfaceResizeReason,
    stable: boolean,
  ) => {
    const contentHeight = Math.max(DOCUMENT_FLOW_MIN_CONTENT_HEIGHT, Math.ceil(nextHeight));
    const safeBlockEnd = readSafeBlockEnd();
    const payload: DocumentSurfaceResizePayload = {
      height: Math.ceil(contentHeight + safeBlockEnd),
      contentHeight,
      safeBlockEnd,
      viewportHeight: getViewportHeight(),
      reason,
      stable,
    };

    if (!shouldPublishSurfaceResize(lastPublishedPayloadRef.current, payload)) {
      return;
    }

    currentDocumentHeightRef.current = contentHeight;
    lastPublishedPayloadRef.current = payload;
    if (typeof bridge.emit === "function") {
      void bridge.emit("plugin.surface.resize", payload).catch(() => undefined);
    }
  }, [bridge, readSafeBlockEnd]);

  const scheduleStableHeightPublish = useCallback((reason: DocumentSurfaceResizeReason) => {
    if (stableHeightTimerRef.current !== null) {
      window.clearTimeout(stableHeightTimerRef.current);
    }

    stableHeightTimerRef.current = window.setTimeout(() => {
      stableHeightTimerRef.current = null;
      const stableContentHeight = Math.max(
        DOCUMENT_FLOW_MIN_CONTENT_HEIGHT,
        Math.ceil(pendingDocumentHeightRef.current),
      );
      renderedDocumentHeightRef.current = stableContentHeight;
      setDocumentHeight((currentHeight) =>
        Math.abs(currentHeight - stableContentHeight) >= DOCUMENT_FLOW_HEIGHT_EPSILON
          ? stableContentHeight
          : currentHeight,
      );
      publishDocumentHeight(stableContentHeight, pendingReasonRef.current || reason, true);
    }, DOCUMENT_FLOW_STABLE_DELAY_MS);
  }, [publishDocumentHeight]);

  const scheduleDocumentHeightPublish = useCallback((
    reason: DocumentSurfaceResizeReason,
    nextInnerDocumentHeight?: number,
  ) => {
    const hasExplicitInnerHeight = Number.isFinite(nextInnerDocumentHeight);

    if (Number.isFinite(nextInnerDocumentHeight)) {
      const normalizedHeight = Math.max(
        DOCUMENT_FLOW_MIN_CONTENT_HEIGHT,
        Math.ceil(Number(nextInnerDocumentHeight)),
      );
      innerDocumentHeightRef.current = normalizedHeight;
      pendingMeasureModeRef.current = "target";
      if (reason === "initial" || normalizedHeight >= renderedDocumentHeightRef.current) {
        renderedDocumentHeightRef.current = normalizedHeight;
        setDocumentHeight((currentHeight) =>
          Math.abs(currentHeight - normalizedHeight) >= DOCUMENT_FLOW_HEIGHT_EPSILON
            ? normalizedHeight
            : currentHeight,
        );
      }
    } else {
      pendingMeasureModeRef.current = "layout";
    }

    pendingReasonRef.current = reason;
    if (scheduledHeightFrameRef.current !== null) {
      return;
    }

    const scheduledMeasureMode = hasExplicitInnerHeight ? "target" : pendingMeasureModeRef.current;
    const schedule = typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : (callback: FrameRequestCallback) => window.setTimeout(callback, 0);

    scheduledHeightFrameRef.current = schedule(() => {
      scheduledHeightFrameRef.current = null;
      const measuredHeight = measureHostedDocumentHeight(scheduledMeasureMode);
      pendingDocumentHeightRef.current = measuredHeight;
      const previousContentHeight = lastPublishedPayloadRef.current?.contentHeight ?? currentDocumentHeightRef.current;
      if (measuredHeight + DOCUMENT_FLOW_HEIGHT_EPSILON >= previousContentHeight) {
        currentDocumentHeightRef.current = measuredHeight;
        publishDocumentHeight(measuredHeight, pendingReasonRef.current, false);
      }
      scheduleStableHeightPublish(pendingReasonRef.current);
    });
  }, [measureHostedDocumentHeight, publishDocumentHeight, scheduleStableHeightPublish]);

  useLayoutEffect(() => {
    const frame = iframeRef.current;
    if (!frame) {
      return;
    }

    setIsLoading(true);
    setError(null);
    innerDocumentHeightRef.current = DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT;
    currentDocumentHeightRef.current = DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT;
    pendingDocumentHeightRef.current = DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT;
    renderedDocumentHeightRef.current = DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT;
    pendingMeasureModeRef.current = "target";
    lastPublishedPayloadRef.current = null;
    pendingReasonRef.current = "initial";
    setDocumentHeight(DOCUMENT_FLOW_INITIAL_CONTENT_HEIGHT);

    const handleFrameLoad = () => {
      logger.info("托管文档 iframe 已完成原生加载", {
        documentUrl,
      });
      setIsLoading(false);
      setError(null);
      scheduleDocumentHeightPublish("asset-load");
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
          scheduleDocumentHeightPublish(
            normalizeDocumentSurfaceReason(isRecord(payload.payload) ? payload.payload.reason : undefined),
            height,
          );
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
            payload: isRecord(payload.payload.payload) ? payload.payload.payload : undefined,
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

    const handleViewportResize = () => {
      scheduleDocumentHeightPublish("viewport-resize", innerDocumentHeightRef.current);
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("resize", handleViewportResize);
    window.visualViewport?.addEventListener("resize", handleViewportResize);
    frame.addEventListener("load", handleFrameLoad);
    frame.addEventListener("error", handleFrameError);

    frame.removeAttribute("src");
    frame.src = documentUrl;
    scheduleDocumentHeightPublish("initial", innerDocumentHeightRef.current);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("resize", handleViewportResize);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
      frame.removeEventListener("load", handleFrameLoad);
      frame.removeEventListener("error", handleFrameError);
      frame.removeAttribute("src");
      if (scheduledHeightFrameRef.current !== null) {
        clearScheduledFrame(scheduledHeightFrameRef.current);
        scheduledHeightFrameRef.current = null;
      }
      if (stableHeightTimerRef.current !== null) {
        window.clearTimeout(stableHeightTimerRef.current);
        stableHeightTimerRef.current = null;
      }
    };
  }, [client, containerErrorLabel, documentUrl, logger, resourceOpenErrorFallback, resourceOpenErrorTitle, scheduleDocumentHeightPublish]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const safeArea = safeAreaRef.current;
    if ((!content && !safeArea) || typeof ResizeObserver !== "function") {
      return;
    }

    const observer = new ResizeObserver(() => {
      scheduleDocumentHeightPublish("content-resize");
    });
    if (content) {
      observer.observe(content);
    }
    if (safeArea) {
      observer.observe(safeArea);
    }
    return () => {
      observer.disconnect();
    };
  }, [scheduleDocumentHeightPublish]);

  useLayoutEffect(() => {
    if (typeof document === "undefined" || !document.fonts?.ready) {
      return;
    }

    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) {
        scheduleDocumentHeightPublish("font-load");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [scheduleDocumentHeightPublish]);

  return (
    <div
      ref={rootRef}
      data-chips-app="card-viewer.window"
      className="card-viewer-window card-viewer-window--document-flow"
    >
      <div ref={contentRef} className="card-viewer-window__content card-viewer-window__content--document-flow">
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
      <div ref={safeAreaRef} className="card-viewer-window__safe-area" aria-hidden="true" />
    </div>
  );
}

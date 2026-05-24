import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { EmbeddedDocumentFrame } from "@chips/component-library";
import { useChipsBridge } from "../hooks/useChipsBridge";
import type { ViewerCoverSource } from "../types/viewer-source";
import "./ViewerCoverSurface.css";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface ViewerCoverSurfaceProps {
  cover: ViewerCoverSource;
  title: string;
  closeLabel: string;
  unavailableLabel: string;
  onClose: () => void;
}

function resolveAspectRatioStyle(ratio: string): React.CSSProperties | undefined {
  const match = ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) {
    return undefined;
  }
  const ratioWidth = Number(match[1]);
  const ratioHeight = Number(match[2]);
  if (!Number.isFinite(ratioWidth) || !Number.isFinite(ratioHeight) || ratioWidth <= 0 || ratioHeight <= 0) {
    return undefined;
  }
  const ratioScale = Number(Math.sqrt(ratioWidth / ratioHeight).toFixed(4));
  return {
    "--viewer-cover-ratio-width": String(ratioWidth),
    "--viewer-cover-ratio-height": String(ratioHeight),
    "--viewer-cover-ratio-scale": String(ratioScale),
    "--viewer-cover-aspect-ratio": `${ratioWidth} / ${ratioHeight}`,
  } as React.CSSProperties;
}

function getViewportHeight(): number {
  if (typeof window === "undefined" || !Number.isFinite(window.innerHeight)) {
    return 0;
  }

  return Math.ceil(window.innerHeight);
}

export function ViewerCoverSurface({
  cover,
  title,
  closeLabel,
  unavailableLabel,
  onClose,
}: ViewerCoverSurfaceProps) {
  const bridge = useChipsBridge();
  const rootRef = useRef<HTMLElement | null>(null);
  const ratio = cover.ratio ?? "4:3";
  const aspectRatioStyle = resolveAspectRatioStyle(ratio);
  const publishCoverSurfaceHeight = useCallback((stable: boolean) => {
    const root = rootRef.current;
    if (!root || typeof bridge.emit !== "function") {
      return;
    }

    const height = Math.max(
      320,
      Math.ceil(root.getBoundingClientRect().height),
      Math.ceil(root.scrollHeight),
    );

    void bridge.emit("plugin.surface.resize", {
      height,
      contentHeight: height,
      safeBlockEnd: 0,
      safeBlockStart: 0,
      viewportHeight: getViewportHeight(),
      reason: "content-resize",
      stable,
    }).catch(() => undefined);
  }, [bridge]);

  useIsomorphicLayoutEffect(() => {
    publishCoverSurfaceHeight(false);
    const stableTimer = window.setTimeout(() => {
      publishCoverSurfaceHeight(true);
    }, 180);

    const handleResize = () => {
      publishCoverSurfaceHeight(false);
      window.setTimeout(() => publishCoverSurfaceHeight(true), 180);
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    const root = rootRef.current;
    const observer = root && typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          publishCoverSurfaceHeight(false);
        })
      : null;
    if (root && observer) {
      observer.observe(root);
    }

    return () => {
      window.clearTimeout(stableTimer);
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [publishCoverSurfaceHeight]);

  if (!cover.coverUrl) {
    return (
      <section className="viewer-cover-surface viewer-cover-surface--state" aria-live="polite">
        <div className="viewer-cover-surface__state-panel">
          <h2>{unavailableLabel}</h2>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={rootRef}
      className="viewer-cover-surface"
      data-chips-app="card-viewer.cover"
      aria-label={title}
    >
      <div className="viewer-cover-surface__layout" style={aspectRatioStyle}>
        <div className="viewer-cover-surface__stage">
          <EmbeddedDocumentFrame
            surfaceId="viewer-cover"
            title={cover.title ?? title}
            src={cover.coverUrl}
            ratio={ratio}
            scope="viewer-cover-frame"
            onActivate={onClose}
            onFrameReady={() => publishCoverSurfaceHeight(true)}
            onFrameError={() => publishCoverSurfaceHeight(true)}
            sandbox="allow-scripts"
          />
          <button
            type="button"
            className="viewer-cover-surface__hit-target"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
          />
        </div>
        <h2 className="viewer-cover-surface__title">{title}</h2>
      </div>
    </section>
  );
}

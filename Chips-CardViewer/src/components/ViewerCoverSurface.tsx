import React from "react";
import { EmbeddedDocumentFrame } from "@chips/component-library";
import type { ViewerCoverSource } from "../types/viewer-source";
import "./ViewerCoverSurface.css";

interface ViewerCoverSurfaceProps {
  cover: ViewerCoverSource;
  title: string;
  closeLabel: string;
  unavailableLabel: string;
  onClose: () => void;
}

export function resolveCoverAspectRatioStyle(ratio: string): React.CSSProperties | undefined {
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

export function ViewerCoverSurface({
  cover,
  title,
  closeLabel,
  unavailableLabel,
  onClose,
}: ViewerCoverSurfaceProps): React.ReactElement {
  const ratio = cover.ratio ?? "4:3";
  const aspectRatioStyle = resolveCoverAspectRatioStyle(ratio);

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
            onFrameReady={() => undefined}
            onFrameError={() => undefined}
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

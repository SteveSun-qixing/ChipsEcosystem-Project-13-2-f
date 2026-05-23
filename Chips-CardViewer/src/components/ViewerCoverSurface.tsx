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

function resolveAspectRatioStyle(ratio: string): React.CSSProperties | undefined {
  const match = ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) {
    return undefined;
  }
  return {
    "--viewer-cover-aspect-ratio": `${match[1]} / ${match[2]}`,
  } as React.CSSProperties;
}

export function ViewerCoverSurface({
  cover,
  title,
  closeLabel,
  unavailableLabel,
  onClose,
}: ViewerCoverSurfaceProps) {
  const ratio = cover.ratio ?? "4:3";
  const aspectRatioStyle = resolveAspectRatioStyle(ratio);

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
      <div className="viewer-cover-surface__stage" style={aspectRatioStyle}>
        <EmbeddedDocumentFrame
          surfaceId="viewer-cover"
          title={cover.title ?? title}
          src={cover.coverUrl}
          ratio={ratio}
          scope="viewer-cover-frame"
          onActivate={onClose}
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
    </section>
  );
}

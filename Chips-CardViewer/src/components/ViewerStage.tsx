import React from "react";
import type { ResolvedViewerSource } from "../types/viewer-source";
import { CardWindow } from "./CardWindow";
import { HostedDocumentWindow } from "./HostedDocumentWindow";

interface ViewerStageProps {
  source: ResolvedViewerSource | null;
  error: string | null;
  empty: React.ReactNode;
  unsupportedRemoteLabel: string;
  traceId?: string;
  locale?: string;
  loadingLabel: string;
  containerErrorLabel: string;
  fatalErrorFallback: string;
  renderErrorFallback: string;
  resourceOpenErrorTitle: string;
  resourceOpenErrorFallback: string;
}

export function ViewerStage({
  source,
  error,
  empty,
  unsupportedRemoteLabel,
  traceId,
  locale,
  loadingLabel,
  containerErrorLabel,
  fatalErrorFallback,
  renderErrorFallback,
  resourceOpenErrorTitle,
  resourceOpenErrorFallback,
}: ViewerStageProps) {
  if (error) {
    return (
      <section className="card-viewer-shell__state" aria-live="polite">
        <div className="card-viewer-shell__state-panel">
          <h2>{error}</h2>
        </div>
      </section>
    );
  }

  if (!source) {
    return <>{empty}</>;
  }

  if (source.renderKind === "hosted-document") {
    return (
      <HostedDocumentWindow
        documentUrl={source.documentUrl}
        traceId={traceId}
        loadingLabel={loadingLabel}
        containerErrorLabel={containerErrorLabel}
        resourceOpenErrorTitle={resourceOpenErrorTitle}
        resourceOpenErrorFallback={resourceOpenErrorFallback}
      />
    );
  }

  if (source.renderKind === "local-file") {
    return (
      <CardWindow
        filePath={source.source.filePath}
        documentType={source.source.documentKind}
        traceId={traceId}
        locale={locale}
        loadingLabel={loadingLabel}
        containerErrorLabel={containerErrorLabel}
        fatalErrorFallback={fatalErrorFallback}
        renderErrorFallback={renderErrorFallback}
        resourceOpenErrorTitle={resourceOpenErrorTitle}
        resourceOpenErrorFallback={resourceOpenErrorFallback}
      />
    );
  }

  return (
    <section className="card-viewer-shell__state" aria-live="polite">
      <div className="card-viewer-shell__state-panel">
        <h2>{unsupportedRemoteLabel}</h2>
      </div>
    </section>
  );
}

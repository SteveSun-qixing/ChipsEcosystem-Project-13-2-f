import React from "react";
import type { Client } from "chips-sdk";
import type { ResolvedViewerSource } from "../types/viewer-source";
import { CardWindow } from "./CardWindow";
import { HostedDocumentWindow } from "./HostedDocumentWindow";
import { ViewerCoverSurface } from "./ViewerCoverSurface";

type ViewerMode = "content" | "cover";

interface ViewerStageProps {
  client: Client;
  source: ResolvedViewerSource | null;
  viewerMode: ViewerMode;
  error: string | null;
  empty: React.ReactNode;
  unsupportedRemoteLabel: string;
  coverCloseLabel: string;
  coverUnavailableLabel: string;
  onCloseCover: () => void;
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
  client,
  source,
  viewerMode,
  error,
  empty,
  unsupportedRemoteLabel,
  coverCloseLabel,
  coverUnavailableLabel,
  onCloseCover,
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

  if (viewerMode === "cover") {
    if (source.renderKind === "local-file" || source.renderKind === "hosted-document") {
      if (source.cover) {
        return (
          <ViewerCoverSurface
            client={client}
            cover={source.cover}
            title={source.title ?? source.cover.title ?? coverCloseLabel}
            closeLabel={coverCloseLabel}
            unavailableLabel={coverUnavailableLabel}
            onClose={onCloseCover}
          />
        );
      }
    }

    return (
      <section className="card-viewer-shell__state" aria-live="polite">
        <div className="card-viewer-shell__state-panel">
          <h2>{coverUnavailableLabel}</h2>
        </div>
      </section>
    );
  }

  if (source.renderKind === "hosted-document") {
    return (
      <HostedDocumentWindow
        client={client}
        documentUrl={source.documentUrl}
        traceId={traceId}
        iframeTitle={loadingLabel}
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
        client={client}
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

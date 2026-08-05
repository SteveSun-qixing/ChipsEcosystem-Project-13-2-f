import { HostedDocumentWindow } from "../components/HostedDocumentWindow";
import { ViewerCoverSurface } from "../components/ViewerCoverSurface";
import { useAppRuntime, type OpenedTarget } from "../app/AppRuntimeProvider";

interface HostedDocumentSceneProps {
  target: Extract<OpenedTarget, { kind: "document" }>;
}

export function HostedDocumentScene({ target }: HostedDocumentSceneProps): React.ReactElement {
  const runtime = useAppRuntime();

  if (runtime.viewerMode === "cover" && runtime.activeCover) {
    return (
      <ViewerCoverSurface
        client={runtime.client}
        cover={runtime.activeCover}
        title={runtime.activeTitle ?? runtime.activeCover.title ?? runtime.t("card-viewer.viewer.hostedDocumentTitle")}
        closeLabel={runtime.t("card-viewer.actions.viewContent")}
        unavailableLabel={runtime.t("card-viewer.viewer.coverUnavailable")}
        onClose={runtime.showContent}
      />
    );
  }

  return (
    <HostedDocumentWindow
      client={runtime.client}
      documentUrl={target.documentUrl}
      traceId={runtime.traceId}
      iframeTitle={runtime.t("card-viewer.viewer.hostedDocumentFrameTitle")}
      loadingLabel={runtime.t("card-viewer.viewer.documentLoading")}
      containerErrorLabel={runtime.t("card-viewer.viewer.documentContainerError")}
      resourceOpenErrorTitle={runtime.t("card-viewer.errors.resourceOpenFailedTitle")}
      resourceOpenErrorFallback={runtime.t("card-viewer.errors.resourceOpenFailed")}
    />
  );
}

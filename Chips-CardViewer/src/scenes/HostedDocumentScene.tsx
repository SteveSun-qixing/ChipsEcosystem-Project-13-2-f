import { HostedDocumentWindow } from "../components/HostedDocumentWindow";
import { useAppRuntime, type OpenedTarget } from "../app/AppRuntimeProvider";

interface HostedDocumentSceneProps {
  target: Extract<OpenedTarget, { kind: "document" }>;
}

export function HostedDocumentScene({ target }: HostedDocumentSceneProps): React.ReactElement {
  const runtime = useAppRuntime();

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

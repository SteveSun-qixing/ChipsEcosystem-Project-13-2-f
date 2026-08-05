import { CardWindow } from "../components/CardWindow";
import { ViewerCoverSurface } from "../components/ViewerCoverSurface";
import { useAppRuntime, type OpenedTarget } from "../app/AppRuntimeProvider";

interface DocumentFileSceneProps {
  target: Extract<OpenedTarget, { kind: "file" }>;
}

export function DocumentFileScene({ target }: DocumentFileSceneProps): React.ReactElement {
  const runtime = useAppRuntime();

  if (runtime.viewerMode === "cover" && runtime.activeCover) {
    return (
      <ViewerCoverSurface
        client={runtime.client}
        cover={runtime.activeCover}
        title={runtime.activeTitle ?? runtime.activeCover.title ?? runtime.t("card-viewer.viewer.documentTitle")}
        closeLabel={runtime.t("card-viewer.actions.viewContent")}
        unavailableLabel={runtime.t("card-viewer.viewer.coverUnavailable")}
        onClose={runtime.showContent}
      />
    );
  }

  return (
    <CardWindow
      client={runtime.client}
      filePath={target.filePath}
      traceId={runtime.traceId}
      locale={runtime.locale}
      loadingLabel={runtime.t("card-viewer.viewer.documentLoading")}
      containerErrorLabel={runtime.t("card-viewer.viewer.documentContainerError")}
      fatalErrorFallback={runtime.t("card-viewer.viewer.documentFatalError")}
      renderErrorFallback={runtime.t("card-viewer.viewer.documentRenderError")}
      resourceOpenErrorTitle={runtime.t("card-viewer.errors.resourceOpenFailedTitle")}
      resourceOpenErrorFallback={runtime.t("card-viewer.errors.resourceOpenFailed")}
    />
  );
}

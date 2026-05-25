import { DropZone } from "../components/DropZone";
import { useAppRuntime } from "../app/AppRuntimeProvider";

export function EmptyScene(): React.ReactElement {
  const runtime = useAppRuntime();

  return (
    <DropZone
      error={runtime.error}
      onOpenFile={runtime.openFile}
      traceId={runtime.traceId}
      ariaLabel={runtime.t("card-viewer.dropzone.ariaLabel")}
      title={runtime.t("card-viewer.dropzone.title")}
      description={runtime.t("card-viewer.dropzone.description")}
      openLabel={runtime.t("card-viewer.actions.open")}
      onFilePath={runtime.openFilePath}
    />
  );
}

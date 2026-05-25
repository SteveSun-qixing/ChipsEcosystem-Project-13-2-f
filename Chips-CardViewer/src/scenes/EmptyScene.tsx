import { DropZone } from "../components/DropZone";
import { useAppRuntime } from "../app/AppRuntimeProvider";

interface EmptySceneProps {
  onOpenFile?: () => void;
}

export function EmptyScene({ onOpenFile }: EmptySceneProps): React.ReactElement {
  const runtime = useAppRuntime();

  return (
    <DropZone
      error={runtime.error}
      onOpenFile={onOpenFile ?? runtime.openFile}
      traceId={runtime.traceId}
      ariaLabel={runtime.t("card-viewer.dropzone.ariaLabel")}
      title={runtime.t("card-viewer.dropzone.title")}
      description={runtime.t("card-viewer.dropzone.description")}
      openLabel={runtime.t("card-viewer.actions.open")}
      onFilePath={runtime.openFilePath}
    />
  );
}

import { CardViewerShell } from "../components/CardViewerShell";
import { DocumentFileScene } from "../scenes/DocumentFileScene";
import { EmptyScene } from "../scenes/EmptyScene";
import { HostedDocumentScene } from "../scenes/HostedDocumentScene";
import { useAppRuntime } from "./AppRuntimeProvider";

export function AppShell(): React.ReactElement {
  const runtime = useAppRuntime();

  const content =
    runtime.openedTarget === null ? (
      <EmptyScene />
    ) : runtime.openedTarget.kind === "document" ? (
      <HostedDocumentScene target={runtime.openedTarget} />
    ) : (
      <DocumentFileScene target={runtime.openedTarget} />
    );

  return (
    <CardViewerShell
      surfaceMode={runtime.surfaceMode}
      content={content}
    />
  );
}

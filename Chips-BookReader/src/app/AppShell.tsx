import React from "react";
import { useAppRuntime } from "./AppRuntimeProvider";

export function AppShell(): React.ReactElement {
  const runtime = useAppRuntime();

  return (
    <div
      data-chips-app={runtime.environment.appId}
      data-chips-scene={runtime.activeSceneId}
      data-chips-surface-kind={runtime.environment.surfaceKind}
    >
      {runtime.renderReaderShell()}
    </div>
  );
}

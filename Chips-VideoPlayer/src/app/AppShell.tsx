import React from "react";
import { ChipsCommandProvider } from "@chips/component-library";
import { useAppRuntime } from "./AppRuntimeProvider";

export function AppShell(): React.ReactElement {
  const runtime = useAppRuntime();

  return (
    <ChipsCommandProvider
      adapter={runtime.commands.adapter ?? undefined}
      commands={runtime.commands.commandViews}
      i18n={runtime.t}
      query={{ source: "toolbar", includeDisabled: true }}
    >
      <div
        data-chips-app={runtime.environment.appId}
        data-chips-scene={runtime.activeSceneId}
        data-chips-surface-kind={runtime.environment.surfaceKind}
      >
        {runtime.renderPlayerStage()}
      </div>
    </ChipsCommandProvider>
  );
}


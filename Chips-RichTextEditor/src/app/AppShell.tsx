import React from "react";
import { ChipsCommandProvider } from "@chips/component-library";
import { useRichTextEditorCommands } from "../commands/useRichTextEditorCommands";
import { RichTextEditorScene } from "./RichTextEditorScene";
import { useAppRuntime } from "./AppRuntimeProvider";

export function AppShell(): React.ReactElement {
  const runtime = useAppRuntime();
  const invocationContext = React.useMemo(
    () => ({
      pluginId: runtime.environment.pluginId,
      sceneId: runtime.environment.hostSceneId,
      ...(runtime.environment.surfaceId ? { surfaceId: runtime.environment.surfaceId } : {}),
    }),
    [runtime.environment.hostSceneId, runtime.environment.pluginId, runtime.environment.surfaceId],
  );
  const [commandRuntimeState, setCommandRuntimeState] = React.useState({
    isBusy: false,
    hasFilePath: false,
    canPreview: false,
  });
  const commands = useRichTextEditorCommands({
    client: runtime.client,
    invocationContext,
    runtimeState: commandRuntimeState,
  });

  return (
    <ChipsCommandProvider
      adapter={commands.adapter}
      commands={commands.commandViews}
      i18n={runtime.t}
      query={{ includeDisabled: true }}
    >
      <div
        data-chips-app={runtime.environment.appId}
        data-chips-scene={runtime.environment.activeSceneId}
        data-chips-surface-kind={runtime.environment.surfaceKind}
      >
        <RichTextEditorScene
          commands={commands}
          commandRegistrationErrorCode={commands.errorCode}
          commandRegistrationPhase={commands.phase}
          onCommandRuntimeStateChange={setCommandRuntimeState}
        />
      </div>
    </ChipsCommandProvider>
  );
}


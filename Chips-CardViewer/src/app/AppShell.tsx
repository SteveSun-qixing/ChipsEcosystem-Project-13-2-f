import React from "react";
import { ChipsCommandProvider } from "@chips/component-library";
import {
  CARD_VIEWER_COMMAND_HANDLER_IDS,
  CARD_VIEWER_COMMAND_IDS,
  cardViewerCommandViews,
} from "../commands/card-viewer-commands";
import { useCardViewerCommands } from "../commands/useCardViewerCommands";
import { CardViewerShell } from "../components/CardViewerShell";
import { DocumentFileScene } from "../scenes/DocumentFileScene";
import { EmptyScene } from "../scenes/EmptyScene";
import { HostedDocumentScene } from "../scenes/HostedDocumentScene";
import { useAppRuntime } from "./AppRuntimeProvider";

export function AppShell(): React.ReactElement {
  const runtime = useAppRuntime();
  const commands = useCardViewerCommands();
  const handledInvocationRef = React.useRef<string | null>(null);

  const commandMenuDescriptors = React.useMemo(
    () => [{ menuId: "file", label: runtime.t("card-viewer.commands.menu.file") }],
    [runtime],
  );

  React.useEffect(() => {
    if (!commands.lastInvoked) {
      return;
    }

    const invocationKey =
      commands.lastInvoked.invocationId ??
      `${commands.lastInvoked.commandId}:${commands.lastInvoked.source}`;
    if (handledInvocationRef.current === invocationKey) {
      return;
    }
    handledInvocationRef.current = invocationKey;

    if (commands.lastInvoked.handlerId === CARD_VIEWER_COMMAND_HANDLER_IDS.openFile) {
      void runtime.openFile();
    }
  }, [commands.lastInvoked, runtime]);

  const content =
    runtime.openedTarget === null ? (
      <EmptyScene onOpenFile={() => commands.invokeCommand(CARD_VIEWER_COMMAND_IDS.openFile, "api")} />
    ) : runtime.openedTarget.kind === "document" ? (
      <HostedDocumentScene target={runtime.openedTarget} />
    ) : (
      <DocumentFileScene target={runtime.openedTarget} />
    );

  return (
    <ChipsCommandProvider
      adapter={commands.adapter}
      commands={cardViewerCommandViews}
      i18n={runtime.t}
      query={{ includeDisabled: true }}
    >
      <CardViewerShell
        surfaceMode={runtime.surfaceMode}
        content={content}
        commandAdapter={commands.adapter}
        commandViews={cardViewerCommandViews}
        commandI18n={runtime.t}
        commandInvocationContext={commands.invocationContext}
        commandMenuDescriptors={commandMenuDescriptors}
        commandRegistrationPhase={commands.phase}
        commandRegistrationErrorCode={commands.errorCode}
        showCommandChrome={runtime.openedTarget !== null}
        toolbarAriaLabel={runtime.t("card-viewer.commands.toolbar.ariaLabel")}
        menuAriaLabel={runtime.t("card-viewer.commands.menu.ariaLabel")}
      />
    </ChipsCommandProvider>
  );
}

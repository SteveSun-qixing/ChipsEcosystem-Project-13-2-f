import React from "react";
import { ChipsCommandProvider, ChipsIcon } from "@chips/component-library";
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

  const action = runtime.openedTarget && runtime.canViewCover ? (
    <button
      type="button"
      className="card-viewer-shell__floating-action"
      onClick={runtime.viewerMode === "cover" ? runtime.showContent : runtime.showCover}
      aria-label={
        runtime.viewerMode === "cover"
          ? runtime.t("card-viewer.actions.viewContent")
          : runtime.t("card-viewer.actions.viewCover")
      }
      title={
        runtime.viewerMode === "cover"
          ? runtime.t("card-viewer.actions.viewContent")
          : runtime.t("card-viewer.actions.viewCover")
      }
    >
      <ChipsIcon
        descriptor={{
          name: runtime.viewerMode === "cover" ? "article" : "image",
          decorative: true,
        }}
        size={22}
      />
    </button>
  ) : null;

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
        action={action}
      />
    </ChipsCommandProvider>
  );
}

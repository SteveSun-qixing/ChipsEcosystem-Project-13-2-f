import React from "react";
import { ChipsCommandProvider, ChipsIcon } from "@chips/component-library";
import {
  CARD_VIEWER_COMMAND_HANDLER_IDS,
  CARD_VIEWER_COMMAND_IDS,
  cardViewerCommandViews,
} from "../commands/card-viewer-commands";
import { useCardViewerCommands } from "../commands/useCardViewerCommands";
import { CardViewerShell } from "../components/CardViewerShell";
import { ViewerChrome, type ViewerChromeState } from "../components/ViewerChrome";
import { DocumentFileScene } from "../scenes/DocumentFileScene";
import { EmptyScene } from "../scenes/EmptyScene";
import { HostedDocumentScene } from "../scenes/HostedDocumentScene";
import { useAppRuntime } from "./AppRuntimeProvider";

const CARD_VIEWER_TOGGLE_COVER_ACTION_ID = "toggle-cover";
const CARD_VIEWER_DOWNLOAD_ACTION_ID = "download-card";
const DOCUMENT_SURFACE_CHROME_SAFE_BLOCK_START = 96;

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

  const returnHomeLabel = runtime.t("card-viewer.actions.returnHome");
  const coverActionLabel =
    runtime.viewerMode === "cover"
      ? runtime.t("card-viewer.actions.viewContent")
      : runtime.t("card-viewer.actions.viewCover");
  const coverActionIcon = runtime.viewerMode === "cover" ? "document" : "cover";
  const usesExternalChrome = runtime.openedTarget?.kind === "document";
  const backAction = runtime.openedTarget ? (
    <button
      type="button"
      className="card-viewer-shell__floating-action card-viewer-shell__floating-action--back"
      onClick={runtime.returnHome}
      aria-label={returnHomeLabel}
      title={returnHomeLabel}
    >
      <ChipsIcon
        descriptor={{
          name: "chevron_left",
          style: "rounded",
          decorative: true,
        }}
        size={24}
      />
    </button>
  ) : null;

  const coverAction = runtime.openedTarget && runtime.canViewCover ? (
    <button
      type="button"
      className="card-viewer-shell__floating-action card-viewer-shell__floating-action--cover"
      onClick={runtime.viewerMode === "cover" ? runtime.showContent : runtime.showCover}
      aria-label={coverActionLabel}
      title={coverActionLabel}
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
  const downloadActionLabel = runtime.t("card-viewer.actions.downloadCard");
  const downloadAction = runtime.canDownloadActiveCard ? (
    <button
      type="button"
      className="card-viewer-shell__floating-action card-viewer-shell__floating-action--download"
      onClick={() => void runtime.downloadActiveCard()}
      aria-label={downloadActionLabel}
      title={downloadActionLabel}
    >
      <ChipsIcon
        descriptor={{
          name: "download",
          decorative: true,
        }}
        size={22}
      />
    </button>
  ) : null;
  const action = backAction || coverAction || downloadAction ? (
    <>
      {backAction}
      {coverAction}
      {downloadAction}
    </>
  ) : null;
  const chromeState = React.useMemo<ViewerChromeState>(
    () => ({
      title: runtime.openedTarget ? runtime.activeTitle ?? undefined : undefined,
      metaLines: [],
      back: {
        label: returnHomeLabel,
        enabled: Boolean(runtime.openedTarget),
        handledByPlugin: true,
      },
      actions: [
        ...(runtime.openedTarget && runtime.canViewCover
          ? [
              {
                id: CARD_VIEWER_TOGGLE_COVER_ACTION_ID,
                label: coverActionLabel,
                icon: coverActionIcon,
              },
            ]
          : []),
        ...(runtime.canDownloadActiveCard
          ? [
              {
                id: CARD_VIEWER_DOWNLOAD_ACTION_ID,
                label: runtime.t("card-viewer.actions.downloadCard"),
                icon: "download",
              },
            ]
          : []),
      ],
      safeBlockStart: DOCUMENT_SURFACE_CHROME_SAFE_BLOCK_START,
    }),
    [
      coverActionIcon,
      coverActionLabel,
      returnHomeLabel,
      runtime.activeTitle,
      runtime.canDownloadActiveCard,
      runtime.canViewCover,
      runtime.openedTarget,
      runtime.t,
    ],
  );
  const handleChromeAction = React.useCallback(
    (actionId: string) => {
      if (actionId === CARD_VIEWER_DOWNLOAD_ACTION_ID) {
        void runtime.downloadActiveCard();
        return;
      }
      if (actionId !== CARD_VIEWER_TOGGLE_COVER_ACTION_ID) {
        return;
      }
      if (runtime.viewerMode === "cover") {
        runtime.showContent();
        return;
      }
      runtime.showCover();
    },
    [runtime],
  );

  const content =
    runtime.openedTarget === null ? (
      <EmptyScene onOpenFile={() => commands.invokeCommand(CARD_VIEWER_COMMAND_IDS.openFile, "api")} />
    ) : runtime.openedTarget.kind === "document" ? (
      <HostedDocumentScene target={runtime.openedTarget} />
    ) : (
      <DocumentFileScene target={runtime.openedTarget} />
    );
  const shell = (
    <CardViewerShell
      surfaceMode={runtime.surfaceMode}
      content={content}
      action={usesExternalChrome ? null : action}
    />
  );

  return (
    <ChipsCommandProvider
      adapter={commands.adapter}
      commands={cardViewerCommandViews}
      i18n={runtime.t}
      query={{ includeDisabled: true }}
    >
      {usesExternalChrome ? (
        <ViewerChrome.Provider
          client={runtime.client}
          state={chromeState}
          externalChrome
          onBack={runtime.returnHome}
          onAction={handleChromeAction}
        >
          {shell}
        </ViewerChrome.Provider>
      ) : shell}
    </ChipsCommandProvider>
  );
}

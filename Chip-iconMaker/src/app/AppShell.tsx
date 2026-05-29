import { useEffect, useRef } from "react";
import {
  ChipsCommandProvider,
  ChipsErrorBoundary,
  ChipsLoadingBoundary,
} from "@chips/component-library";
import { appConfig } from "../../config/app-config";
import { APP_COMMAND_HANDLER_IDS, appCommandViews } from "../commands/app-commands";
import { useAppCommands } from "../commands/useAppCommands";
import { useAppText } from "../i18n/useAppText";
import { IconMakerScene } from "../icon-workbench/IconMakerScene";
import { runIconMakerCliCommand } from "../icon-workbench/cli-runner";
import { useAppRuntime } from "./AppRuntimeProvider";

export function AppShell() {
  const runtime = useAppRuntime();
  const handledInvocationRef = useRef<string | null>(null);
  const { text } = useAppText();
  const commands = useAppCommands();

  useEffect(() => {
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

    if (commands.lastInvoked.handlerId === APP_COMMAND_HANDLER_IDS.focusImporter) {
      document.getElementById("icon-maker-file-input-trigger")?.focus();
    }
    if (commands.lastInvoked.handlerId === APP_COMMAND_HANDLER_IDS.generateIcons) {
      if (commands.lastInvoked.source === "cli") {
        void runIconMakerCliCommand({
          client: commands.client,
          payload: commands.lastInvoked.payload,
          context: commands.lastInvoked.context,
          launchParams: runtime.environment.launchParams,
        }).catch((error: unknown) => {
          runtime.pushDiagnostic({
            code: error && typeof error === "object" && "message" in error
              ? String((error as { message?: unknown }).message)
              : "ICONMAKER_CLI_FAILED",
            message: "IconMaker CLI command failed.",
            source: "cli",
          });
        });
        return;
      }
      document.getElementById("icon-maker-generate-action")?.focus();
    }
    if (commands.lastInvoked.handlerId === APP_COMMAND_HANDLER_IDS.refreshTheme) {
      void runtime.refreshTheme();
    }
  }, [commands.lastInvoked, runtime]);

  return (
    <ChipsCommandProvider
      adapter={commands.adapter}
      commands={appCommandViews}
      i18n={text}
      query={{ source: "palette", includeDisabled: true }}
    >
      <ChipsErrorBoundary
        title={text("app.errors.boundaryTitle")}
        description={text("app.errors.boundaryDescription")}
        retryLabel={text("app.errors.retry")}
        showErrorMessage
      >
        <ChipsLoadingBoundary
          loading={commands.phase === "registering" || !runtime.status.ready}
          loadingText={text("app.shell.loading")}
        >
          <div className="app-shell" data-app-id={appConfig.appId}>
            <main className="app-shell__workspace" aria-label={text("app.shell.contentLabel")}>
              <IconMakerScene text={text} />
            </main>
          </div>
        </ChipsLoadingBoundary>
      </ChipsErrorBoundary>
    </ChipsCommandProvider>
  );
}

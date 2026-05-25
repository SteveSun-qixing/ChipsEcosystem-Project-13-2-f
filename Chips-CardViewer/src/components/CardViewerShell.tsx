import React from "react";
import {
  ChipsMenuBar,
  ChipsToolbar,
  type ChipsCommandAdapter,
  type ChipsCommandProviderProps,
  type ChipsCommandView,
} from "@chips/component-library";
import type { CommandInvocationContext } from "chips-sdk";
import "./CardViewerShell.css";

interface CardViewerShellProps {
  surfaceMode: "immersive" | "document";
  content: React.ReactNode;
  commandAdapter?: ChipsCommandAdapter;
  commandViews?: ChipsCommandView[];
  commandI18n?: ChipsCommandProviderProps["i18n"];
  commandInvocationContext?: CommandInvocationContext;
  commandMenuDescriptors?: Array<{ menuId: string; label: string }>;
  commandRegistrationPhase?: "idle" | "registering" | "ready" | "error";
  commandRegistrationErrorCode?: string | null;
  showCommandChrome?: boolean;
  toolbarAriaLabel?: string;
  menuAriaLabel?: string;
}

export function CardViewerShell({
  surfaceMode,
  content,
  commandAdapter,
  commandViews = [],
  commandI18n,
  commandInvocationContext,
  commandMenuDescriptors = [],
  commandRegistrationPhase = "idle",
  commandRegistrationErrorCode = null,
  showCommandChrome = false,
  toolbarAriaLabel,
  menuAriaLabel,
}: CardViewerShellProps) {
  const shouldShowCommandChrome = showCommandChrome || commandRegistrationPhase === "error";

  return (
    <div
      data-chips-app="card-viewer.shell"
      data-chips-surface-mode={surfaceMode}
      className={[
        "card-viewer-shell",
        surfaceMode === "document" ? "card-viewer-shell--document" : "card-viewer-shell--immersive",
      ].join(" ")}
    >
      {shouldShowCommandChrome ? (
        <div
          data-chips-app="card-viewer.command-row"
          data-command-phase={commandRegistrationPhase}
          className="card-viewer-shell__command-row"
        >
          <ChipsMenuBar
            adapter={commandAdapter}
            commands={commandViews}
            menus={commandMenuDescriptors}
            i18n={commandI18n}
            ariaLabel={menuAriaLabel}
            invocationContext={commandInvocationContext}
            disabled={commandRegistrationPhase === "error"}
          />
          <ChipsToolbar
            adapter={commandAdapter}
            commands={commandViews}
            toolbarId="main"
            i18n={commandI18n}
            ariaLabel={toolbarAriaLabel}
            invocationContext={commandInvocationContext}
            disabled={commandRegistrationPhase === "error"}
          />
          {commandRegistrationErrorCode ? (
            <span
              role="status"
              className="card-viewer-shell__command-status"
            >
              {commandRegistrationErrorCode}
            </span>
          ) : null}
        </div>
      ) : null}
      <main
        data-chips-app="card-viewer.main"
        className={[
          "card-viewer-shell__main",
          surfaceMode === "document"
            ? "card-viewer-shell__main--document"
            : "card-viewer-shell__main--immersive",
        ].join(" ")}
      >
        {children}
      </main>
    </div>
  );
}

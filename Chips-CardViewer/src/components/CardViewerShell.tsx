import React from "react";
import "./CardViewerShell.css";

interface CardViewerShellProps {
  surfaceMode: "immersive" | "document";
  content: React.ReactNode;
  action?: React.ReactNode;
}

export function CardViewerShell({
  surfaceMode,
  content,
  action,
}: CardViewerShellProps) {
  return (
    <div
      data-chips-app="card-viewer.shell"
      data-chips-surface-mode={surfaceMode}
      className={[
        "card-viewer-shell",
        surfaceMode === "document" ? "card-viewer-shell--document" : "card-viewer-shell--immersive",
      ].join(" ")}
    >
      <main
        data-chips-app="card-viewer.main"
        className={[
          "card-viewer-shell__main",
          surfaceMode === "document"
            ? "card-viewer-shell__main--document"
            : "card-viewer-shell__main--immersive",
        ].join(" ")}
      >
        {content}
      </main>
      {action}
    </div>
  );
}

import React from "react";

interface CardViewerShellProps {
  content: React.ReactNode;
}

export function CardViewerShell({ content }: CardViewerShellProps) {
  return (
    <div
      data-chips-app="card-viewer.shell"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--chips-sys-color-surface, #ffffff)",
        color: "var(--chips-sys-color-on-surface, #111111)",
        overflow: "hidden",
      }}
    >
      <main
        data-chips-app="card-viewer.main"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {content}
      </main>
    </div>
  );
}

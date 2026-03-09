import React from "react";

interface CardViewerShellProps {
  toolbar: React.ReactNode;
  content: React.ReactNode;
}

export function CardViewerShell({ toolbar, content }: CardViewerShellProps) {
  return (
    <div
      data-chips-app="card-viewer.shell"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--chips-sys-color-surface, #ffffff)",
        color: "var(--chips-sys-color-on-surface, #111111)",
      }}
    >
      <header
        data-chips-app="card-viewer.header"
        style={{
          padding: "44px 16px 12px",
          borderBottom:
            "1px solid color-mix(in srgb, var(--chips-sys-color-on-surface, #111111) 12%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          WebkitAppRegion: "drag",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 16 }}>卡片查看器</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.75 }}>
            拖入卡片文件或通过内核打开，即可查看复合卡片内容。
          </p>
        </div>
        {toolbar}
      </header>
      <main
        data-chips-app="card-viewer.main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 16,
          overflow: "hidden",
        }}
      >
        {content}
      </main>
    </div>
  );
}

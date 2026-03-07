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
        background: "var(--chips-sys-color-surface, #101014)",
        color: "var(--chips-sys-color-on-surface, #f5f5f5)",
      }}
    >
      <header
        data-chips-app="card-viewer.header"
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--chips-border-subtle, rgba(255,255,255,0.12))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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


import React, { useCallback, useState } from "react";

interface DropZoneProps {
  onCardFile: (filePath: string) => void;
}

export function DropZone({ onCardFile }: DropZoneProps) {
  const [isActive, setIsActive] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsActive(false);

      const items = event.dataTransfer.items;
      if (!items || items.length === 0) {
        return;
      }

      const fileItem = Array.from(items).find((item) => item.kind === "file");
      if (!fileItem) {
        return;
      }

      const file = fileItem.getAsFile();
      if (!file) {
        return;
      }

      // Host 在拖拽场景下应通过 `file.path` 提供真实路径
      const anyFile = file as any;
      const filePath: string | undefined = anyFile.path;
      if (filePath) {
        onCardFile(filePath);
      }
    },
    [onCardFile],
  );

  return (
    <div
      data-chips-app="card-viewer.dropzone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1,
        borderRadius: 8,
        border: isActive
          ? "1px solid var(--chips-sys-color-primary, #4e8cff)"
          : "1px dashed var(--chips-border-subtle, rgba(255,255,255,0.24))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        cursor: "default",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <p style={{ margin: 0 }}>将 *.card 文件拖动到此处，或通过内核在“用卡片查看器打开”入口打开。</p>
      </div>
    </div>
  );
}


import React, { useCallback, useMemo } from "react";
import { createScopedLogger } from "../../config/logging";

interface DropZoneProps {
  onCardFile: (filePath: string) => void;
  traceId?: string;
}

function resolveNativeFilePath(file: File): string {
  const bridge = (window as {
    chips?: {
      platform?: {
        getPathForFile?: (value: File) => string;
      };
    };
  }).chips;

  if (typeof bridge?.platform?.getPathForFile === "function") {
    return bridge.platform.getPathForFile(file);
  }

  return (file as File & { path?: string }).path ?? "";
}

export function DropZone({ onCardFile, traceId }: DropZoneProps) {
  const logger = useMemo(
    () =>
      createScopedLogger({
        scope: "dropzone",
        traceId,
      }),
    [traceId],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      logger.info("收到拖拽投放事件", {
        itemCount: event.dataTransfer.items?.length ?? 0,
        fileCount: event.dataTransfer.files?.length ?? 0,
      });

      const items = event.dataTransfer.items;
      const file =
        items && items.length > 0
          ? Array.from(items)
              .find((item) => item.kind === "file")
              ?.getAsFile() ?? null
          : event.dataTransfer.files?.[0] ?? null;
      if (!file) {
        logger.warn("拖拽事件中未解析到文件对象");
        return;
      }

      const filePath = resolveNativeFilePath(file);
      if (filePath) {
        logger.info("拖拽文件路径解析成功", {
          fileName: file.name,
          filePath,
          fileType: file.type,
          source: typeof (window as any).chips?.platform?.getPathForFile === "function" ? "webUtils" : "file.path",
        });
        onCardFile(filePath);
        return;
      }

      logger.warn("拖拽文件未携带可用的本地路径", {
        fileName: file.name,
        fileType: file.type,
        hasBridgeResolver: typeof (window as any).chips?.platform?.getPathForFile === "function",
      });
    },
    [logger, onCardFile],
  );

  return (
    <div
      data-chips-app="card-viewer.dropzone"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        flex: 1,
        borderRadius: 8,
        border: "1px dashed var(--chips-border-subtle, rgba(255,255,255,0.24))",
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

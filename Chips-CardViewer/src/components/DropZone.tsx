import React, { useCallback, useMemo, useRef, useState } from "react";
import { ChipsButton } from "@chips/component-library";
import { createScopedLogger } from "../../config/logging";
import "./DropZone.css";

interface DropZoneProps {
  onFilePath: (filePath: string) => void;
  onOpenFile: () => void;
  error?: string | null;
  traceId?: string;
  ariaLabel: string;
  fileMarkLabel: string;
  title: string;
  description: string;
  openLabel: string;
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

export function DropZone({
  onFilePath,
  onOpenFile,
  error = null,
  traceId,
  ariaLabel,
  fileMarkLabel,
  title,
  description,
  openLabel,
}: DropZoneProps) {
  const logger = useMemo(
    () =>
      createScopedLogger({
        scope: "dropzone",
        traceId,
      }),
    [traceId],
  );
  const dragDepthRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const resetDragState = useCallback(() => {
    dragDepthRef.current = 0;
    setIsDragActive(false);
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      resetDragState();
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
        onFilePath(filePath);
        return;
      }

      logger.warn("拖拽文件未携带可用的本地路径", {
        fileName: file.name,
        fileType: file.type,
        hasBridgeResolver: typeof (window as any).chips?.platform?.getPathForFile === "function",
      });
    },
    [logger, onFilePath, resetDragState],
  );
  const titleId = "card-viewer-dropzone-title";
  const descriptionId = "card-viewer-dropzone-description";
  const errorId = error ? "card-viewer-dropzone-error" : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div
      data-chips-app="card-viewer.dropzone"
      data-state={isDragActive ? "drag-active" : "idle"}
      className="card-viewer-dropzone"
      role="region"
      aria-label={ariaLabel}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <section
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        className="card-viewer-dropzone__panel"
      >
        <div
          aria-hidden="true"
          className="card-viewer-dropzone__file-mark"
        >
          {fileMarkLabel}
        </div>
        <div className="card-viewer-dropzone__copy">
          <h1 id={titleId} className="card-viewer-dropzone__title">{title}</h1>
          <p
            id={descriptionId}
            className="card-viewer-dropzone__description"
          >
            {description}
          </p>
        </div>
        <div className="card-viewer-dropzone__actions">
          <ChipsButton variant="secondary" onPress={onOpenFile}>
            {openLabel}
          </ChipsButton>
        </div>
        {error ? (
          <div
            id={errorId}
            role="alert"
            className="card-viewer-dropzone__error"
          >
            {error}
          </div>
        ) : null}
      </section>
    </div>
  );
}

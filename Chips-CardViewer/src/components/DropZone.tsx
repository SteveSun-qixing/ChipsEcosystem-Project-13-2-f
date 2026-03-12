import React, { useCallback, useMemo, useRef, useState } from "react";
import { ChipsButton } from "@chips/component-library";
import { createScopedLogger } from "../../config/logging";

interface DropZoneProps {
  onCardFile: (filePath: string) => void;
  onOpenCard: () => void;
  error?: string | null;
  traceId?: string;
  ariaLabel: string;
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
  onCardFile,
  onOpenCard,
  error = null,
  traceId,
  ariaLabel,
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
        onCardFile(filePath);
        return;
      }

      logger.warn("拖拽文件未携带可用的本地路径", {
        fileName: file.name,
        fileType: file.type,
        hasBridgeResolver: typeof (window as any).chips?.platform?.getPathForFile === "function",
      });
    },
    [logger, onCardFile, resetDragState],
  );

  return (
    <div
      data-chips-app="card-viewer.dropzone"
      data-state={isDragActive ? "drag-active" : "idle"}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: isDragActive
          ? "color-mix(in srgb, var(--chips-sys-color-primary, #246bff) 6%, var(--chips-sys-color-surface, #ffffff))"
          : "var(--chips-sys-color-surface, #ffffff)",
      }}
    >
      <section
        aria-label={ariaLabel}
        style={{
          width: "min(560px, 100%)",
          borderRadius: 24,
          border: isDragActive
            ? "1px solid color-mix(in srgb, var(--chips-sys-color-primary, #246bff) 48%, transparent)"
            : "1px dashed color-mix(in srgb, var(--chips-sys-color-on-surface, #111111) 18%, transparent)",
          background: "color-mix(in srgb, var(--chips-sys-color-surface, #ffffff) 92%, transparent)",
          boxShadow: isDragActive
            ? "0 24px 60px color-mix(in srgb, var(--chips-sys-color-primary, #246bff) 20%, transparent)"
            : "0 18px 44px color-mix(in srgb, var(--chips-sys-color-on-surface, #111111) 8%, transparent)",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            display: "grid",
            placeItems: "center",
            fontSize: 28,
            background:
              "color-mix(in srgb, var(--chips-sys-color-primary, #246bff) 14%, var(--chips-sys-color-surface, #ffffff))",
            color: "var(--chips-sys-color-primary, #246bff)",
          }}
        >
          .card
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>{title}</h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: "color-mix(in srgb, var(--chips-sys-color-on-surface, #111111) 70%, transparent)",
            }}
          >
            {description}
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "center", WebkitAppRegion: "no-drag" }}>
          <ChipsButton variant="secondary" onClick={onOpenCard}>
            {openLabel}
          </ChipsButton>
        </div>
        {error ? (
          <div
            role="alert"
            style={{
              width: "100%",
              borderRadius: 14,
              padding: "12px 14px",
              fontSize: 12,
              lineHeight: 1.6,
              background:
                "color-mix(in srgb, var(--chips-sys-color-error, #d92d20) 10%, var(--chips-sys-color-surface, #ffffff))",
              color: "var(--chips-sys-color-error, #d92d20)",
            }}
          >
            {error}
          </div>
        ) : null}
      </section>
    </div>
  );
}

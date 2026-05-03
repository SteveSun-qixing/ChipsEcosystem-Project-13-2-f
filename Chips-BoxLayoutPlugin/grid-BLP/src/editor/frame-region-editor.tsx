import React from "react";
import { FrameRegionSurface } from "../shared/frame-region";
import { hasFrameRegionContent, type FrameRegionConfig } from "../schema/layout-config";
import type { ResolvedRuntimeResource } from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";

export interface FrameRegionEditorProps {
  region: FrameRegionConfig;
  locale?: string;
  title: string;
  description: string;
  previewRatio: string;
  previewMinHeight?: string;
  preferredAssetPrefix: string;
  readBoxAsset?: (assetPath: string) => Promise<ResolvedRuntimeResource>;
  importBoxAsset?: (input: { file: File; preferredPath?: string }) => Promise<{ assetPath: string }>;
  deleteBoxAsset?: (assetPath: string) => Promise<void>;
  onChange(next: FrameRegionConfig): void;
}

const shellStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  width: "100%",
  minWidth: 0,
};

const modeRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const modeButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.82)",
  padding: "8px 14px",
  fontSize: "13px",
  cursor: "pointer",
};

const activeModeButtonStyle: React.CSSProperties = {
  ...modeButtonStyle,
  background: "#0f172a",
  color: "#ffffff",
  borderColor: "#0f172a",
};

const actionButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: "12px",
  background: "#ffffff",
  padding: "10px 14px",
  fontSize: "13px",
  cursor: "pointer",
};

const MODE_MESSAGE_KEY = {
  none: "editor.frame_mode_none",
  image: "editor.frame_mode_image",
  html: "editor.frame_mode_html",
} as const;

async function safeDeleteAsset(
  assetPath: string | undefined,
  deleteBoxAsset?: (assetPath: string) => Promise<void>,
): Promise<void> {
  if (!assetPath || !deleteBoxAsset) {
    return;
  }
  await deleteBoxAsset(assetPath).catch(() => undefined);
}

export function FrameRegionEditor({
  region,
  locale,
  title,
  description,
  previewRatio,
  previewMinHeight,
  preferredAssetPrefix,
  readBoxAsset,
  importBoxAsset,
  deleteBoxAsset,
  onChange,
}: FrameRegionEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const hasContent = hasFrameRegionContent(region);

  const applyMode = async (nextMode: FrameRegionConfig["mode"]) => {
    if (nextMode === region.mode) {
      return;
    }

    if (region.mode === "image" && nextMode !== "image") {
      await safeDeleteAsset(region.assetPath, deleteBoxAsset);
    }

    if (nextMode === "image") {
      onChange({
        mode: "image",
        assetPath: region.mode === "image" ? region.assetPath : undefined,
      });
      return;
    }

    if (nextMode === "html") {
      onChange({
        mode: "html",
        html: region.mode === "html" ? region.html : "",
      });
      return;
    }

    onChange({
      mode: "none",
    });
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file || !importBoxAsset) {
      event.currentTarget.value = "";
      return;
    }

    const imported = await importBoxAsset({
      file,
      preferredPath: `${preferredAssetPrefix}/${file.name}`,
    });
    const previousAssetPath = region.mode === "image" ? region.assetPath : undefined;
    onChange({
      mode: "image",
      assetPath: imported.assetPath,
    });

    if (previousAssetPath && previousAssetPath !== imported.assetPath) {
      await safeDeleteAsset(previousAssetPath, deleteBoxAsset);
    }

    event.currentTarget.value = "";
  };

  const handleClear = async () => {
    if (region.mode === "image") {
      await safeDeleteAsset(region.assetPath, deleteBoxAsset);
    }
    onChange({
      mode: "none",
    });
  };

  return (
    <section style={shellStyle}>
      <div style={{ display: "grid", gap: "6px" }}>
        <strong style={{ fontSize: "15px", color: "#0f172a" }}>{title}</strong>
        <span style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.6 }}>{description}</span>
      </div>

      <div style={modeRowStyle}>
        {(["none", "image", "html"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            style={region.mode === mode ? activeModeButtonStyle : modeButtonStyle}
            onClick={() => { void applyMode(mode); }}
          >
            {getLayoutMessage(locale, MODE_MESSAGE_KEY[mode])}
          </button>
        ))}
      </div>

      {region.mode === "image" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" style={actionButtonStyle} onClick={() => fileInputRef.current?.click()}>
              {getLayoutMessage(locale, "editor.upload_image")}
            </button>
            <button type="button" style={actionButtonStyle} onClick={() => { void handleClear(); }}>
              {getLayoutMessage(locale, "editor.clear_frame")}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(event) => { void handleUpload(event); }}
          />
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            {region.assetPath ?? getLayoutMessage(locale, "editor.frame_empty")}
          </span>
        </div>
      ) : null}

      {region.mode === "html" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          <textarea
            rows={12}
            value={region.html ?? ""}
            placeholder={getLayoutMessage(locale, "editor.html_placeholder")}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: "220px",
              maxWidth: "100%",
              resize: "vertical",
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.24)",
              background: "#ffffff",
              padding: "14px 16px",
              font: "13px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              color: "#0f172a",
            }}
            onChange={(event) => {
              onChange({
                mode: "html",
                html: event.currentTarget.value,
              });
            }}
          />
          <div>
            <button type="button" style={actionButtonStyle} onClick={() => { void handleClear(); }}>
              {getLayoutMessage(locale, "editor.clear_frame")}
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "10px" }}>
        <span style={{ fontSize: "12px", color: "#64748b" }}>{getLayoutMessage(locale, "editor.preview")}</span>
        <div
          style={{
            borderRadius: "18px",
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,0.24)",
            background: "linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(241,245,249,0.92) 100%)",
            minHeight: previewMinHeight ?? "180px",
          }}
        >
          <FrameRegionSurface
            region={region}
            title={title}
            ratio={previewRatio}
            readBoxAsset={readBoxAsset}
          />
          {!hasContent ? (
            <div
              style={{
                minHeight: previewMinHeight ?? "180px",
                display: "grid",
                placeItems: "center",
                padding: "24px",
                fontSize: "13px",
                color: "#64748b",
                textAlign: "center",
              }}
            >
              {getLayoutMessage(locale, "editor.frame_empty")}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

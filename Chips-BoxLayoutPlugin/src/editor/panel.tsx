import React from "react";
import { FrameRegionEditor } from "./frame-region-editor";
import type { LayoutConfig, SortMode } from "../schema/layout-config";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";

export interface LayoutEditorPanelProps {
  entries: BoxEntrySnapshot[];
  config: LayoutConfig;
  locale?: string;
  readBoxAsset?: (assetPath: string) => Promise<ResolvedRuntimeResource>;
  importBoxAsset?: (input: { file: File; preferredPath?: string }) => Promise<{ assetPath: string }>;
  deleteBoxAsset?: (assetPath: string) => Promise<void>;
  onChange(next: LayoutConfig): void;
}

function updateConfig(config: LayoutConfig, patch: Partial<LayoutConfig["props"]>): LayoutConfig {
  return {
    ...config,
    props: {
      ...config.props,
      ...patch,
    },
  };
}

const shellStyle: React.CSSProperties = {
  display: "grid",
  gap: "24px",
  width: "100%",
  minWidth: 0,
};

export function LayoutEditorPanel({
  entries,
  config,
  locale,
  readBoxAsset,
  importBoxAsset,
  deleteBoxAsset,
  onChange,
}: LayoutEditorPanelProps) {
  return (
    <div style={shellStyle}>
      <section style={{ display: "grid", gap: "14px" }}>
        <div style={{ display: "grid", gap: "6px" }}>
          <strong style={{ fontSize: "15px", color: "#0f172a" }}>
            {getLayoutMessage(locale, "editor.section.layout")}
          </strong>
          <span style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>
            {getLayoutMessage(locale, "editor.auto_grid_hint")}
          </span>
        </div>

        <label style={{ display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "#334155" }}>
            {getLayoutMessage(locale, "editor.sort_mode")}
          </span>
          <select
            value={config.props.sortMode}
            style={{
              borderRadius: "12px",
              border: "1px solid rgba(148,163,184,0.24)",
              background: "#ffffff",
              padding: "10px 12px",
              fontSize: "13px",
              color: "#0f172a",
            }}
            onChange={(event) => {
              onChange(updateConfig(config, {
                sortMode: event.currentTarget.value as SortMode,
              }));
            }}
          >
            <option value="manual">{getLayoutMessage(locale, "editor.sort_manual")}</option>
            <option value="name-asc">{getLayoutMessage(locale, "editor.sort_name_asc")}</option>
            <option value="name-desc">{getLayoutMessage(locale, "editor.sort_name_desc")}</option>
          </select>
        </label>

        <span style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
          {config.props.sortMode === "manual"
            ? getLayoutMessage(locale, "editor.sort_manual_hint")
            : getLayoutMessage(locale, "editor.sort_runtime_hint")}
        </span>
        <span style={{ fontSize: "12px", color: "#64748b" }}>
          {getLayoutMessage(locale, "editor.entry_count").replace("{count}", String(entries.length))}
        </span>
      </section>

      <FrameRegionEditor
        region={config.props.background}
        locale={locale}
        title={getLayoutMessage(locale, "editor.background_title")}
        description={getLayoutMessage(locale, "editor.background_desc")}
        previewRatio="16:9"
        previewMinHeight="180px"
        preferredAssetPrefix="assets/layouts/grid/background"
        readBoxAsset={readBoxAsset}
        importBoxAsset={importBoxAsset}
        deleteBoxAsset={deleteBoxAsset}
        onChange={(nextRegion) => {
          onChange(updateConfig(config, {
            background: nextRegion,
          }));
        }}
      />

      <FrameRegionEditor
        region={config.props.topRegion}
        locale={locale}
        title={getLayoutMessage(locale, "editor.top_region_title")}
        description={getLayoutMessage(locale, "editor.top_region_desc")}
        previewRatio="16:5"
        previewMinHeight="160px"
        preferredAssetPrefix="assets/layouts/grid/top-region"
        readBoxAsset={readBoxAsset}
        importBoxAsset={importBoxAsset}
        deleteBoxAsset={deleteBoxAsset}
        onChange={(nextRegion) => {
          onChange(updateConfig(config, {
            topRegion: nextRegion,
          }));
        }}
      />
    </div>
  );
}

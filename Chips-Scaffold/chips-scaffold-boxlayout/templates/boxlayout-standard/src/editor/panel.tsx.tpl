import React from "react";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import type { LayoutConfig, SortMode } from "../schema/layout-config";
import { getLayoutMessage } from "../shared/i18n";

export interface LayoutEditorPanelProps {
  entries: BoxEntrySnapshot[];
  config: LayoutConfig;
  locale?: string;
  readBoxAsset?(assetPath: string): Promise<ResolvedRuntimeResource>;
  importBoxAsset?(input: { file: File; preferredPath?: string }): Promise<{ assetPath: string }>;
  deleteBoxAsset?(assetPath: string): Promise<void>;
  onChange(next: LayoutConfig): void;
}

function updateProps(
  config: LayoutConfig,
  patch: Partial<LayoutConfig["props"]>
): LayoutConfig {
  return {
    ...config,
    props: {
      ...config.props,
      ...patch,
    },
  };
}

export function LayoutEditorPanel({
  entries,
  config,
  locale,
  onChange,
}: LayoutEditorPanelProps) {
  return (
    <div style={{ display: "grid", gap: "16px", padding: "16px" }}>
      <section style={{ display: "grid", gap: "12px" }}>
        <strong>{getLayoutMessage(locale, "editor.section.display")}</strong>
        <label style={{ display: "grid", gap: "6px" }}>
          <span>{getLayoutMessage(locale, "editor.sort_mode")}</span>
          <select
            value={config.props.sortMode}
            onChange={(event) => {
              onChange(
                updateProps(config, {
                  sortMode: event.currentTarget.value as SortMode,
                })
              );
            }}
          >
            <option value="manual">{getLayoutMessage(locale, "editor.sort_manual")}</option>
            <option value="name-asc">{getLayoutMessage(locale, "editor.sort_name_asc")}</option>
            <option value="name-desc">{getLayoutMessage(locale, "editor.sort_name_desc")}</option>
          </select>
        </label>
      </section>
      <section style={{ display: "grid", gap: "8px" }}>
        <strong>Preview</strong>
        <div>{entries.length} entries</div>
      </section>
    </div>
  );
}

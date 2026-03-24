import React from "react";
import type { BoxEntrySnapshot } from "../shared/types";
import type { LayoutConfig, InformationDensity } from "../schema/layout-config";
import { getLayoutMessage } from "../shared/i18n";

export interface LayoutEditorPanelProps {
  entries: BoxEntrySnapshot[];
  config: LayoutConfig;
  locale?: string;
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
          <span>{getLayoutMessage(locale, "editor.column_count")}</span>
          <input
            type="number"
            min={1}
            max={12}
            value={config.props.columnCount}
            onChange={(event) => {
              onChange(updateProps(config, { columnCount: Number(event.currentTarget.value) }));
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "6px" }}>
          <span>{getLayoutMessage(locale, "editor.gap")}</span>
          <input
            type="number"
            min={0}
            max={64}
            value={config.props.gap}
            onChange={(event) => {
              onChange(updateProps(config, { gap: Number(event.currentTarget.value) }));
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "6px" }}>
          <span>{getLayoutMessage(locale, "editor.cover_ratio")}</span>
          <input
            type="number"
            min={0.5}
            max={3}
            step={0.1}
            value={config.props.coverRatio}
            onChange={(event) => {
              onChange(updateProps(config, { coverRatio: Number(event.currentTarget.value) }));
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "6px" }}>
          <span>{getLayoutMessage(locale, "editor.information_density")}</span>
          <select
            value={config.props.informationDensity}
            onChange={(event) => {
              onChange(
                updateProps(config, {
                  informationDensity: event.currentTarget.value as InformationDensity,
                })
              );
            }}
          >
            <option value="compact">compact</option>
            <option value="comfortable">comfortable</option>
            <option value="expanded">expanded</option>
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

import React from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  ChipsCheckbox,
  ChipsForm,
  ChipsNumberInput,
  ChipsSegmentedControl,
  ChipsSelect,
} from "@chips/component-library";
import { FrameRegionEditor } from "./frame-region-editor";
import {
  normalizeLayoutConfig,
  visibleFieldKeys,
  type CoverSize,
  type GroupMode,
  type LayoutConfig,
  type RowDensity,
  type SortMode,
  type VisibleFieldKey,
} from "../schema/layout-config";
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

export type LayoutEditorRoot = HTMLElement & {
  __chipsDispose?: () => void;
};

const StableSelect = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof ChipsSelect>>((props, ref) => (
  <ChipsSelect
    {...props}
    ref={ref}
    iconContent={<span aria-hidden="true">{"\u25be"}</span>}
  />
));
StableSelect.displayName = "StableSelect";

const StableNumberInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof ChipsNumberInput>>((props, ref) => (
  <ChipsNumberInput
    {...props}
    ref={ref}
    decrementContent={<span aria-hidden="true">-</span>}
    incrementContent={<span aria-hidden="true">+</span>}
  />
));
StableNumberInput.displayName = "StableNumberInput";

function updateConfig(config: LayoutConfig, patch: Partial<LayoutConfig["props"]>): LayoutConfig {
  return normalizeLayoutConfig({
    ...config,
    props: {
      ...config.props,
      ...patch,
    },
  });
}

function toggleVisibleField(config: LayoutConfig, field: VisibleFieldKey, checked: boolean): VisibleFieldKey[] {
  const current = new Set(config.props.visibleFields);
  if (checked) {
    current.add(field);
  } else {
    current.delete(field);
  }

  if (current.size === 0) {
    current.add("createdAt");
  }

  return visibleFieldKeys.filter((item) => current.has(item));
}

const visibleFieldMessageKeys: Record<VisibleFieldKey, Parameters<typeof getLayoutMessage>[1]> = {
  createdAt: "editor.field_created_at",
  summary: "editor.field_summary",
  tags: "editor.field_tags",
  type: "editor.field_type",
};

const shellStyle: React.CSSProperties = {
  position: "relative",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
  overflow: "hidden",
  color: "var(--chips-sys-color-on-surface, #0f172a)",
  background: "var(--chips-sys-color-surface, #ffffff)",
  font: "var(--chips-comp-text-root-font, 14px/1.55 var(--chips-font-family-sans, sans-serif))",
};

const bodyStyle: React.CSSProperties = {
  boxSizing: "border-box",
  display: "grid",
  alignContent: "start",
  gap: "24px",
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  overflowX: "hidden",
  overflowY: "auto",
  padding: "14px 16px 42px",
};

const fieldListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px 14px",
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
  const t = (key: Parameters<typeof getLayoutMessage>[1]) => getLayoutMessage(locale, key);

  return (
    <div data-scope="chips-list-layout-editor" style={shellStyle}>
      <div data-part="body" style={bodyStyle}>
        <ChipsForm.Root aria-label={t("editor.section.layout")}>
          <ChipsForm.Section
            title={t("editor.section.layout")}
            description={t("editor.auto_list_hint")}
          >
            <ChipsForm.Field name="sortMode">
              <ChipsForm.Label>{t("editor.sort_mode")}</ChipsForm.Label>
              <ChipsForm.Control>
                <StableSelect
                  value={config.props.sortMode}
                  options={[
                    { value: "manual", label: t("editor.sort_manual") },
                    { value: "name-asc", label: t("editor.sort_name_asc") },
                    { value: "name-desc", label: t("editor.sort_name_desc") },
                  ]}
                  onValueChange={(value: string) => {
                    onChange(updateConfig(config, {
                      sortMode: value as SortMode,
                    }));
                  }}
                />
              </ChipsForm.Control>
              <ChipsForm.Hint>
                {config.props.sortMode === "manual"
                  ? t("editor.sort_manual_hint")
                  : t("editor.sort_runtime_hint")}
              </ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsForm.Field name="rowDensity">
              <ChipsForm.Label>{t("editor.row_density")}</ChipsForm.Label>
              <ChipsForm.Control>
                <ChipsSegmentedControl
                  value={config.props.rowDensity}
                  ariaLabel={t("editor.row_density")}
                  options={[
                    { value: "compact", label: t("editor.row_density_compact") },
                    { value: "comfortable", label: t("editor.row_density_comfortable") },
                    { value: "spacious", label: t("editor.row_density_spacious") },
                  ]}
                  onValueChange={(value) => {
                    onChange(updateConfig(config, {
                      rowDensity: value as RowDensity,
                    }));
                  }}
                />
              </ChipsForm.Control>
            </ChipsForm.Field>

            <ChipsForm.Field name="coverSize">
              <ChipsForm.Label>{t("editor.cover_size")}</ChipsForm.Label>
              <ChipsForm.Control>
                <ChipsSegmentedControl
                  value={config.props.coverSize}
                  ariaLabel={t("editor.cover_size")}
                  options={[
                    { value: "compact", label: t("editor.cover_size_compact") },
                    { value: "regular", label: t("editor.cover_size_regular") },
                    { value: "large", label: t("editor.cover_size_large") },
                  ]}
                  onValueChange={(value) => {
                    onChange(updateConfig(config, {
                      coverSize: value as CoverSize,
                    }));
                  }}
                />
              </ChipsForm.Control>
            </ChipsForm.Field>

            <ChipsForm.Field name="groupMode">
              <ChipsForm.Label>{t("editor.group_mode")}</ChipsForm.Label>
              <ChipsForm.Control>
                <StableSelect
                  value={config.props.groupMode}
                  options={[
                    { value: "none", label: t("editor.group_none") },
                    { value: "type", label: t("editor.group_type") },
                    { value: "tag", label: t("editor.group_tag") },
                  ]}
                  onValueChange={(value: string) => {
                    onChange(updateConfig(config, {
                      groupMode: value as GroupMode,
                    }));
                  }}
                />
              </ChipsForm.Control>
            </ChipsForm.Field>

            <ChipsForm.Field name="visibleFields">
              <ChipsForm.Label>{t("editor.visible_fields")}</ChipsForm.Label>
              <ChipsForm.Control>
                <div style={fieldListStyle}>
                  {visibleFieldKeys.map((field) => (
                    <ChipsCheckbox
                      key={field}
                      checked={config.props.visibleFields.includes(field)}
                      label={t(visibleFieldMessageKeys[field])}
                      onCheckedChange={(checked) => {
                        onChange(updateConfig(config, {
                          visibleFields: toggleVisibleField(config, field, checked),
                        }));
                      }}
                    />
                  ))}
                </div>
              </ChipsForm.Control>
            </ChipsForm.Field>

            <ChipsForm.Field name="pageSize">
              <ChipsForm.Label>{t("editor.page_size")}</ChipsForm.Label>
              <ChipsForm.Control>
                <StableNumberInput
                  value={config.props.pageSize}
                  min={20}
                  max={240}
                  step={20}
                  largeStep={40}
                  ariaLabel={t("editor.page_size")}
                  onValueChange={(value: number | null) => {
                    onChange(updateConfig(config, {
                      pageSize: typeof value === "number" ? value : 120,
                    }));
                  }}
                />
              </ChipsForm.Control>
              <ChipsForm.Hint>
                {t("editor.entry_count").replace("{count}", String(entries.length))}
              </ChipsForm.Hint>
            </ChipsForm.Field>
          </ChipsForm.Section>
        </ChipsForm.Root>

        <FrameRegionEditor
          region={config.props.background}
          locale={locale}
          title={t("editor.background_title")}
          description={t("editor.background_desc")}
          previewRatio="16:9"
          previewMinHeight="180px"
          preferredAssetPrefix="assets/layouts/list/background"
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
          title={t("editor.top_region_title")}
          description={t("editor.top_region_desc")}
          previewRatio="16:5"
          previewMinHeight="160px"
          preferredAssetPrefix="assets/layouts/list/top-region"
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
    </div>
  );
}

export function createLayoutEditorRoot(props: LayoutEditorPanelProps): LayoutEditorRoot {
  const rootElement = document.createElement("div") as LayoutEditorRoot;
  rootElement.setAttribute("data-chips-list-layout-editor-root", "true");
  rootElement.style.width = "100%";
  rootElement.style.height = "100%";
  rootElement.style.minHeight = "0";

  const reactRoot: Root = createRoot(rootElement);

  flushSync(() => {
    reactRoot.render(
      <LayoutEditorPanel {...props} />,
    );
  });

  rootElement.__chipsDispose = () => {
    reactRoot.unmount();
  };

  return rootElement;
}

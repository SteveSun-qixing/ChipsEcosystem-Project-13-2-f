import React from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  ChipsForm,
  ChipsSelect,
  ChipsStack,
  ChipsText,
} from "@chips/component-library";
import { FrameRegionEditor } from "./frame-region-editor";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import {
  normalizeLayoutConfig,
  type FrameRegionConfig,
  type LayoutConfig,
  type SortMode,
} from "../schema/layout-config";
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

type LayoutMessageKey = Parameters<typeof getLayoutMessage>[1];

const EDITOR_STYLE_TEXT = `
.chips-grid-layout-editor {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  color: var(--chips-sys-color-on-surface, #0f172a);
  background-color: var(--chips-sys-color-surface, #ffffff);
  font: var(--chips-comp-text-root-font, 14px/1.55 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif));
}

.chips-grid-layout-editor,
.chips-grid-layout-editor * {
  box-sizing: border-box;
}

.chips-grid-layout-editor__form {
  width: 100%;
  min-width: 0;
  padding: var(--chips-layout-gap-lg, 16px);
}

.chips-grid-layout-editor__field,
.chips-grid-layout-editor__region {
  min-width: 0;
}

.chips-grid-layout-editor__region {
  display: grid;
  gap: var(--chips-layout-gap-md, 12px);
}

.chips-grid-layout-editor [data-scope="form"][data-part="section"] {
  display: grid;
  gap: var(--chips-layout-gap-md, 12px);
  min-width: 0;
}

.chips-grid-layout-editor [data-scope="form"][data-part="field"] {
  display: grid;
  gap: var(--chips-layout-gap-sm, 8px);
  min-width: 0;
}

.chips-grid-layout-editor [data-scope="select"][data-part="root"],
.chips-grid-layout-editor [data-scope="segmented-control"][data-part="root"],
.chips-grid-layout-editor [data-scope="text-area"][data-part="root"],
.chips-grid-layout-editor [data-scope="toolbar"][data-part="root"] {
  min-width: 0;
  max-width: 100%;
}

.chips-grid-layout-editor [data-scope="toolbar"][data-part="root"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-sm, 8px);
}

.chips-grid-layout-editor [data-scope="toolbar"][data-part="group"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-sm, 8px);
}

.chips-grid-layout-editor [data-frame-region-asset-path] {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface, #334155));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

.chips-grid-layout-editor [data-frame-region-preview-shell] {
  display: grid;
  gap: var(--chips-layout-gap-xs, 4px);
  min-width: 0;
}

.chips-grid-layout-editor [data-frame-region-preview] {
  width: 100%;
  min-height: 160px;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.28));
  border-radius: var(--chips-comp-box-root-radius, 12px);
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface, #ffffff));
}

.chips-grid-layout-editor [data-frame-region-preview] [data-scope="embedded-document-frame"],
.chips-grid-layout-editor [data-frame-region-preview] [data-part="root"],
.chips-grid-layout-editor [data-frame-region-preview] [data-part="frame-container"],
.chips-grid-layout-editor [data-frame-region-preview] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

.chips-grid-layout-editor [data-frame-region-preview-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-grid-layout-editor [data-frame-region-preview-status] {
  display: grid;
  place-items: center;
  padding: var(--chips-layout-gap-lg, 16px);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface, #334155));
  text-align: center;
}

.chips-grid-layout-editor [data-frame-region-preview-label] {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface, #334155));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}
`;

function formatMessage(locale: string | undefined, key: LayoutMessageKey, params?: Record<string, string | number>): string {
  const message = getLayoutMessage(locale, key);
  if (!params) {
    return message;
  }
  return Object.entries(params).reduce(
    (current, [name, value]) => current.replace(`{${name}}`, String(value)),
    message,
  );
}

function createI18nAdapter(locale: string | undefined) {
  return {
    translate(
      input: string | { key: string; params?: Record<string, string | number> },
      params?: Record<string, string | number>,
    ) {
      const key = typeof input === "string" ? input : input.key;
      return formatMessage(
        locale,
        key as LayoutMessageKey,
        typeof input === "string" ? params : input.params,
      );
    },
  };
}

function updateProps(
  config: LayoutConfig,
  patch: Partial<LayoutConfig["props"]>
): LayoutConfig {
  return normalizeLayoutConfig({
    ...config,
    props: {
      ...config.props,
      ...patch,
    },
  });
}

function updateFrameRegion(
  config: LayoutConfig,
  key: "background" | "topRegion",
  region: FrameRegionConfig
): LayoutConfig {
  return updateProps(config, {
    [key]: region,
  });
}

export function LayoutEditorPanel({
  entries,
  config: initialConfig,
  locale,
  readBoxAsset,
  importBoxAsset,
  deleteBoxAsset,
  onChange,
}: LayoutEditorPanelProps) {
  const [config, setConfig] = React.useState(() => normalizeLayoutConfig(initialConfig));
  const i18n = React.useMemo(() => createI18nAdapter(locale), [locale]);

  React.useEffect(() => {
    setConfig(normalizeLayoutConfig(initialConfig));
  }, [initialConfig]);

  function commit(next: LayoutConfig): void {
    const normalized = normalizeLayoutConfig(next);
    setConfig(normalized);
    onChange(normalized);
  }

  return (
    <section
      className="chips-grid-layout-editor"
      data-scope="chips-grid-layout-editor"
      aria-label={getLayoutMessage(locale, "editor.aria_label")}
    >
      <style>{EDITOR_STYLE_TEXT}</style>
      <ChipsForm.Root
        className="chips-grid-layout-editor__form"
        aria-label={getLayoutMessage(locale, "editor.aria_label")}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <ChipsStack gap="var(--chips-layout-gap-lg, 16px)">
          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.layout")}
            description={getLayoutMessage(locale, "editor.auto_grid_hint")}
          >
            <ChipsForm.Field
              className="chips-grid-layout-editor__field"
              name="sortMode"
            >
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.sort_mode")}</ChipsForm.Label>
              <ChipsSelect
                value={config.props.sortMode}
                placeholder={getLayoutMessage(locale, "editor.sort_mode")}
                i18n={i18n}
                options={[
                  {
                    value: "manual",
                    label: getLayoutMessage(locale, "editor.sort_manual"),
                  },
                  {
                    value: "name-asc",
                    label: getLayoutMessage(locale, "editor.sort_name_asc"),
                  },
                  {
                    value: "name-desc",
                    label: getLayoutMessage(locale, "editor.sort_name_desc"),
                  },
                ]}
                onValueChange={(value) => {
                  commit(updateProps(config, {
                    sortMode: value as SortMode,
                  }));
                }}
              />
              <ChipsForm.Hint>
                {config.props.sortMode === "manual"
                  ? getLayoutMessage(locale, "editor.sort_manual_hint")
                  : getLayoutMessage(locale, "editor.sort_runtime_hint")}
              </ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsText
              as="p"
              tone="muted"
              text={formatMessage(locale, "editor.entry_count", { count: entries.length })}
            />
          </ChipsForm.Section>

          <FrameRegionEditor
            id="background"
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
              commit(updateFrameRegion(config, "background", nextRegion));
            }}
          />

          <FrameRegionEditor
            id="topRegion"
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
              commit(updateFrameRegion(config, "topRegion", nextRegion));
            }}
          />
        </ChipsStack>
      </ChipsForm.Root>
    </section>
  );
}

export function createLayoutEditorRoot(props: LayoutEditorPanelProps): LayoutEditorRoot {
  const rootElement = document.createElement("div") as LayoutEditorRoot;
  rootElement.setAttribute("data-chips-grid-layout-editor-root", "true");
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

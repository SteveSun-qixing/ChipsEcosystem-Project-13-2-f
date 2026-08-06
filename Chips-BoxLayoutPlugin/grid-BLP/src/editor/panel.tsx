import React from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  ChipsForm,
  ChipsIcon,
  ChipsSelect,
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

const StableSelect = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof ChipsSelect>>((props, ref) => (
  <ChipsSelect
    {...props}
    ref={ref}
    iconContent={<ChipsIcon descriptor={{ name: "expand_more", decorative: true }} size={16} />}
  />
));
StableSelect.displayName = "StableSelect";

const EDITOR_STYLE_TEXT = `
.chips-grid-layout-editor {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  color: var(--chips-sys-color-on-surface, #111111);
  background: var(--chips-sys-color-surface, #ffffff);
  font: var(--chips-comp-text-root-font, 14px/1.5 var(--chips-font-family-sans, -apple-system, "PingFang SC", sans-serif));
  -webkit-font-smoothing: antialiased;
}

.chips-grid-layout-editor,
.chips-grid-layout-editor * {
  box-sizing: border-box;
}

.chips-grid-layout-editor__form {
  width: 100%;
  min-width: 0;
  padding: 8px 12px 28px;
}

.chips-grid-layout-editor [data-scope="form"][data-part="root"] {
  display: block;
}

.chips-grid-layout-editor [data-scope="form"][data-part="field"] {
  display: block;
  min-width: 0;
}

/* ---------- 面板头 ---------- */

.chips-grid-layout-editor__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px 14px;
}

.chips-grid-layout-editor__head-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--chips-sys-color-primary-container, #eef2ff);
  color: var(--chips-sys-color-primary, #2563eb);
}

.chips-grid-layout-editor__head-text {
  min-width: 0;
}

.chips-grid-layout-editor__head-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--chips-sys-color-on-surface, #111111);
}

.chips-grid-layout-editor__head-desc {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--chips-sys-color-on-surface-muted, #6b7280);
}

.chips-grid-layout-editor__head-count {
  margin-left: auto;
  flex-shrink: 0;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--chips-sys-color-on-surface-muted, #6b7280);
  background: var(--chips-sys-color-surface-container, #f3f4f6);
  border: 1px solid var(--chips-sys-color-border-subtle, #e5e5ea);
  border-radius: 999px;
}

/* ---------- 分组（iOS inset grouped 风格） ---------- */

.chips-grid-layout-editor__group {
  background: var(--chips-sys-color-surface, #ffffff);
  border: 1px solid var(--chips-sys-color-border-subtle, #e5e5ea);
  border-radius: var(--chips-comp-box-root-radius, 12px);
  overflow: hidden;
}

.chips-grid-layout-editor__group + .chips-grid-layout-editor__group {
  margin-top: 16px;
}

.chips-grid-layout-editor__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
}

.chips-grid-layout-editor__row + .chips-grid-layout-editor__row::before,
.chips-grid-layout-editor__row + .chips-grid-layout-editor__code-area::before,
.chips-grid-layout-editor__row + .chips-grid-layout-editor__image-area::before,
.chips-grid-layout-editor__code-area + .chips-grid-layout-editor__row::before,
.chips-grid-layout-editor__image-area + .chips-grid-layout-editor__row::before {
  content: "";
  position: absolute;
  top: 0;
  left: 14px;
  right: 0;
  height: var(--chips-layout-divider-thickness, 1px);
  background: var(--chips-sys-color-border-subtle, #e5e5ea);
}

.chips-grid-layout-editor__row-label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 400;
  color: var(--chips-sys-color-on-surface, #111111);
}

.chips-grid-layout-editor__group-footer {
  margin: 10px 6px 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--chips-sys-color-on-surface-muted, #6b7280);
}

/* ---------- 排序行 Select ---------- */

.chips-grid-layout-editor [data-scope="select"][data-part="root"] {
  min-width: 0;
  flex-shrink: 1;
}

.chips-grid-layout-editor [data-scope="select"][data-part="trigger"] {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 0;
  padding: 0;
  border: none;
  background: none;
  color: var(--chips-sys-color-on-surface-muted, #6b7280);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.chips-grid-layout-editor [data-scope="select"][data-part="trigger"]:hover,
.chips-grid-layout-editor [data-scope="select"][data-part="trigger"][data-state="open"] {
  color: var(--chips-sys-color-on-surface, #111111);
}

.chips-grid-layout-editor [data-scope="select"][data-part="value"] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chips-grid-layout-editor [data-scope="select"][data-part="icon"] {
  display: inline-flex;
  color: var(--chips-sys-color-on-surface-muted, #9ca3af);
}

/* ---------- 行内分段控件 ---------- */

.chips-grid-layout-editor [data-scope="segmented-control"][data-part="root"] {
  flex-shrink: 0;
}

/* ---------- 图片拖放框 ---------- */

.chips-grid-layout-editor__image-area {
  position: relative;
  padding: 10px 14px 12px;
}

.chips-grid-layout-editor__drop-zone {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 96px;
  border: 1.5px dashed var(--chips-sys-color-border, #c7c7cc);
  border-radius: var(--chips-comp-box-root-radius, 10px);
  color: var(--chips-sys-color-on-surface-muted, #6b7280);
  font-size: 13px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.chips-grid-layout-editor__drop-zone:hover:not(.chips-grid-layout-editor__drop-zone--disabled) {
  border-color: var(--chips-sys-color-primary, #2563eb);
  background: var(--chips-sys-color-primary-container, #f5f7ff);
  color: var(--chips-sys-color-primary, #2563eb);
}

.chips-grid-layout-editor__drop-zone--dragging {
  border-color: var(--chips-sys-color-primary, #2563eb);
  border-style: solid;
  background: var(--chips-sys-color-primary-container, #eef2ff);
  color: var(--chips-sys-color-primary, #2563eb);
}

.chips-grid-layout-editor__drop-zone--disabled {
  cursor: default;
  opacity: 0.6;
}

.chips-grid-layout-editor__drop-zone-empty {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.chips-grid-layout-editor__drop-zone--filled {
  position: relative;
  border-style: solid;
  border-color: var(--chips-sys-color-border-subtle, #e5e5ea);
  padding: 0;
  overflow: hidden;
  min-height: 0;
  aspect-ratio: 16 / 5;
}

.chips-grid-layout-editor__drop-zone-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-grid-layout-editor__drop-zone-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(17, 24, 39, 0.45);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.chips-grid-layout-editor__drop-zone--filled:hover .chips-grid-layout-editor__drop-zone-overlay {
  opacity: 1;
}

.chips-grid-layout-editor__drop-zone-status {
  padding: 16px;
  color: var(--chips-sys-color-on-surface-muted, #6b7280);
  font-size: 12px;
}

.chips-grid-layout-editor__row-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 6px;
}

.chips-grid-layout-editor__remove-button {
  border: none;
  background: none;
  color: var(--chips-sys-color-danger, #dc2626);
  font-size: 13px;
  min-height: 0;
  padding: 4px 6px;
}

.chips-grid-layout-editor__remove-button[data-state="hover"] {
  background: none;
  color: var(--chips-sys-color-danger, #dc2626);
}

/* ---------- 代码模式 ---------- */

.chips-grid-layout-editor__code-area {
  position: relative;
  padding: 10px 14px 12px;
}

.chips-grid-layout-editor__code-area [data-scope="text-area"][data-part="root"] {
  min-width: 0;
}

/* ---------- 错误 ---------- */

.chips-grid-layout-editor__error {
  margin: 8px 6px 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--chips-sys-color-danger, #dc2626);
}

.chips-grid-layout-editor [data-scope="segmented-control"][data-part="root"]:focus-visible,
.chips-grid-layout-editor [data-scope="select"][data-part="trigger"]:focus-visible,
.chips-grid-layout-editor__drop-zone:focus-visible,
.chips-grid-layout-editor__remove-button:focus-visible {
  outline: var(--chips-layout-focus-outline-width, 2px) solid var(--chips-sys-color-focus-ring, #2563eb);
  outline-offset: var(--chips-layout-focus-outline-offset, 2px);
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
        <div className="chips-grid-layout-editor__head">
          <span className="chips-grid-layout-editor__head-icon">
            <ChipsIcon descriptor={{ name: "grid_view", decorative: true }} size={18} />
          </span>
          <div className="chips-grid-layout-editor__head-text">
            <p className="chips-grid-layout-editor__head-title">
              {getLayoutMessage(locale, "editor.head_title")}
            </p>
            <p className="chips-grid-layout-editor__head-desc">
              {getLayoutMessage(locale, "editor.head_desc")}
            </p>
          </div>
          <span className="chips-grid-layout-editor__head-count">
            {formatMessage(locale, "editor.entry_count", { count: entries.length })}
          </span>
        </div>

        <ChipsForm.Field
          className="chips-grid-layout-editor__group"
          name="sortMode"
        >
          <div className="chips-grid-layout-editor__row">
            <span className="chips-grid-layout-editor__row-label">
              {getLayoutMessage(locale, "editor.sort_mode")}
            </span>
            <StableSelect
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
              onValueChange={(value: string) => {
                commit(updateProps(config, {
                  sortMode: value as SortMode,
                }));
              }}
            />
          </div>
          {config.props.sortMode === "manual" ? (
            <p className="chips-grid-layout-editor__group-footer">
              {getLayoutMessage(locale, "editor.sort_manual_hint")}
            </p>
          ) : null}
        </ChipsForm.Field>

        <FrameRegionEditor
          id="topRegion"
          region={config.props.topRegion}
          locale={locale}
          title={getLayoutMessage(locale, "editor.top_region_title")}
          preferredAssetPrefix="assets/layouts/grid/top-region"
          readBoxAsset={readBoxAsset}
          importBoxAsset={importBoxAsset}
          deleteBoxAsset={deleteBoxAsset}
          onChange={(nextRegion) => {
            commit(updateFrameRegion(config, "topRegion", nextRegion));
          }}
        />

        <FrameRegionEditor
          id="background"
          region={config.props.background}
          locale={locale}
          title={getLayoutMessage(locale, "editor.background_title")}
          preferredAssetPrefix="assets/layouts/grid/background"
          readBoxAsset={readBoxAsset}
          importBoxAsset={importBoxAsset}
          deleteBoxAsset={deleteBoxAsset}
          onChange={(nextRegion) => {
            commit(updateFrameRegion(config, "background", nextRegion));
          }}
        />
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

import React from "react";
import {
  ChipsCheckbox,
  ChipsForm,
  ChipsNumberInput,
  ChipsSegmentedControl,
  ChipsSelect,
  ChipsText,
} from "@chips/component-library";
import { FrameRegionEditor } from "./frame-region-editor";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import {
  CENTER_SCALE_MAX,
  CENTER_SCALE_MIN,
  SIDE_ANGLE_MAX,
  SIDE_ANGLE_MIN,
  normalizeLayoutConfig,
  type CoverFlowSpacing,
  type CoverSize,
  type FrameRegionConfig,
  type LayoutConfig,
  type SortMode,
  type WheelSensitivity,
} from "../schema/layout-config";
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

type LayoutMessageKey = Parameters<typeof getLayoutMessage>[1];

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

const EDITOR_STYLE_TEXT = `
.chips-coverflow-layout-editor {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  color: var(--chips-sys-color-on-surface);
  background-color: var(--chips-sys-color-surface);
  font: var(--chips-comp-text-root-font, inherit);
}

.chips-coverflow-layout-editor,
.chips-coverflow-layout-editor * {
  box-sizing: border-box;
}

.chips-coverflow-layout-editor__form {
  width: 100%;
  min-width: 0;
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
}

.chips-coverflow-layout-editor__field,
.chips-coverflow-layout-editor__region {
  min-width: 0;
}

.chips-coverflow-layout-editor__region {
  display: grid;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
}

.chips-coverflow-layout-editor [data-scope="form"][data-part="section"] {
  display: grid;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  min-width: 0;
}

.chips-coverflow-layout-editor [data-scope="form"][data-part="field"] {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

.chips-coverflow-layout-editor [data-scope="select"][data-part="root"],
.chips-coverflow-layout-editor [data-scope="segmented-control"][data-part="root"],
.chips-coverflow-layout-editor [data-scope="number-input"][data-part="root"],
.chips-coverflow-layout-editor [data-scope="checkbox"][data-part="root"],
.chips-coverflow-layout-editor [data-scope="text-area"][data-part="root"],
.chips-coverflow-layout-editor [data-scope="toolbar"][data-part="root"] {
  min-width: 0;
  max-width: 100%;
}

.chips-coverflow-layout-editor [data-scope="toolbar"][data-part="root"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
}

.chips-coverflow-layout-editor [data-scope="toolbar"][data-part="group"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
}

.chips-coverflow-layout-editor [data-frame-region-asset-path] {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

.chips-coverflow-layout-editor [data-frame-region-preview-shell] {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

.chips-coverflow-layout-editor [data-frame-region-preview] {
  width: 100%;
  min-height: 160px;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

.chips-coverflow-layout-editor [data-frame-region-preview] [data-scope="embedded-document-frame"],
.chips-coverflow-layout-editor [data-frame-region-preview] [data-part="root"],
.chips-coverflow-layout-editor [data-frame-region-preview] [data-part="frame-container"],
.chips-coverflow-layout-editor [data-frame-region-preview] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

.chips-coverflow-layout-editor [data-frame-region-preview-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-coverflow-layout-editor [data-frame-region-preview-status] {
  min-height: 160px;
  display: grid;
  place-items: center;
  padding: var(--chips-base-space-4);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  text-align: center;
}

.chips-coverflow-layout-editor [data-frame-region-preview-label] {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
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
      className="chips-coverflow-layout-editor"
      data-scope="chips-coverflow-layout-editor"
      aria-label={getLayoutMessage(locale, "editor.aria_label")}
    >
      <style>{EDITOR_STYLE_TEXT}</style>
      <ChipsForm.Root
        className="chips-coverflow-layout-editor__form"
        aria-label={getLayoutMessage(locale, "editor.aria_label")}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <ChipsForm.Section
          title={getLayoutMessage(locale, "editor.section.coverflow")}
          description={getLayoutMessage(locale, "editor.section.coverflow_desc")}
        >
          <ChipsForm.Field className="chips-coverflow-layout-editor__field" name="sortMode">
            <ChipsForm.Label>{getLayoutMessage(locale, "editor.sort_mode")}</ChipsForm.Label>
            <ChipsForm.Control>
              <StableSelect
                value={config.props.sortMode}
                placeholder={getLayoutMessage(locale, "editor.sort_mode")}
                i18n={i18n}
                options={[
                  { value: "manual", label: getLayoutMessage(locale, "editor.sort_manual") },
                  { value: "name-asc", label: getLayoutMessage(locale, "editor.sort_name_asc") },
                  { value: "name-desc", label: getLayoutMessage(locale, "editor.sort_name_desc") },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    sortMode: value as SortMode,
                  }));
                }}
              />
            </ChipsForm.Control>
            <ChipsForm.Hint>
              {config.props.sortMode === "manual"
                ? getLayoutMessage(locale, "editor.sort_manual_hint")
                : getLayoutMessage(locale, "editor.sort_runtime_hint")}
            </ChipsForm.Hint>
          </ChipsForm.Field>

          <ChipsForm.Field className="chips-coverflow-layout-editor__field" name="coverSize">
            <ChipsForm.Label>{getLayoutMessage(locale, "editor.cover_size")}</ChipsForm.Label>
            <ChipsForm.Control>
              <ChipsSegmentedControl
                value={config.props.coverSize}
                ariaLabel={getLayoutMessage(locale, "editor.cover_size")}
                i18n={i18n}
                options={[
                  { value: "compact", label: getLayoutMessage(locale, "editor.cover_size_compact") },
                  { value: "regular", label: getLayoutMessage(locale, "editor.cover_size_regular") },
                  { value: "large", label: getLayoutMessage(locale, "editor.cover_size_large") },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    coverSize: value as CoverSize,
                  }));
                }}
              />
            </ChipsForm.Control>
          </ChipsForm.Field>

          <ChipsForm.Field className="chips-coverflow-layout-editor__field" name="spacing">
            <ChipsForm.Label>{getLayoutMessage(locale, "editor.spacing")}</ChipsForm.Label>
            <ChipsForm.Control>
              <ChipsSegmentedControl
                value={config.props.spacing}
                ariaLabel={getLayoutMessage(locale, "editor.spacing")}
                i18n={i18n}
                options={[
                  { value: "tight", label: getLayoutMessage(locale, "editor.spacing_tight") },
                  { value: "regular", label: getLayoutMessage(locale, "editor.spacing_regular") },
                  { value: "wide", label: getLayoutMessage(locale, "editor.spacing_wide") },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    spacing: value as CoverFlowSpacing,
                  }));
                }}
              />
            </ChipsForm.Control>
          </ChipsForm.Field>

          <ChipsForm.Field className="chips-coverflow-layout-editor__field" name="sideAngleDeg">
            <ChipsForm.Label>{getLayoutMessage(locale, "editor.side_angle")}</ChipsForm.Label>
            <ChipsForm.Control>
              <StableNumberInput
                value={config.props.sideAngleDeg}
                min={SIDE_ANGLE_MIN}
                max={SIDE_ANGLE_MAX}
                step={1}
                largeStep={5}
                ariaLabel={getLayoutMessage(locale, "editor.side_angle")}
                onValueChange={(value: number | null) => {
                  commit(updateProps(config, {
                    sideAngleDeg: typeof value === "number" ? value : config.props.sideAngleDeg,
                  }));
                }}
              />
            </ChipsForm.Control>
            <ChipsForm.Hint>
              {formatMessage(locale, "editor.side_angle_hint", {
                min: SIDE_ANGLE_MIN,
                max: SIDE_ANGLE_MAX,
              })}
            </ChipsForm.Hint>
          </ChipsForm.Field>

          <ChipsForm.Field className="chips-coverflow-layout-editor__field" name="centerScale">
            <ChipsForm.Label>{getLayoutMessage(locale, "editor.center_scale")}</ChipsForm.Label>
            <ChipsForm.Control>
              <StableNumberInput
                value={config.props.centerScale}
                min={CENTER_SCALE_MIN}
                max={CENTER_SCALE_MAX}
                step={0.01}
                largeStep={0.05}
                ariaLabel={getLayoutMessage(locale, "editor.center_scale")}
                onValueChange={(value: number | null) => {
                  commit(updateProps(config, {
                    centerScale: typeof value === "number" ? value : config.props.centerScale,
                  }));
                }}
              />
            </ChipsForm.Control>
            <ChipsForm.Hint>
              {formatMessage(locale, "editor.center_scale_hint", {
                min: CENTER_SCALE_MIN,
                max: CENTER_SCALE_MAX,
              })}
            </ChipsForm.Hint>
          </ChipsForm.Field>

          <ChipsForm.Field className="chips-coverflow-layout-editor__field" name="wheelSensitivity">
            <ChipsForm.Label>{getLayoutMessage(locale, "editor.wheel_sensitivity")}</ChipsForm.Label>
            <ChipsForm.Control>
              <ChipsSegmentedControl
                value={config.props.wheelSensitivity}
                ariaLabel={getLayoutMessage(locale, "editor.wheel_sensitivity")}
                i18n={i18n}
                options={[
                  { value: "low", label: getLayoutMessage(locale, "editor.wheel_low") },
                  { value: "medium", label: getLayoutMessage(locale, "editor.wheel_medium") },
                  { value: "high", label: getLayoutMessage(locale, "editor.wheel_high") },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    wheelSensitivity: value as WheelSensitivity,
                  }));
                }}
              />
            </ChipsForm.Control>
          </ChipsForm.Field>

          <ChipsForm.Field className="chips-coverflow-layout-editor__field" name="showReflection">
            <ChipsForm.Control>
              <ChipsCheckbox
                checked={config.props.showReflection}
                label={getLayoutMessage(locale, "editor.show_reflection")}
                onCheckedChange={(checked) => {
                  commit(updateProps(config, {
                    showReflection: checked,
                  }));
                }}
              />
            </ChipsForm.Control>
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
          preferredAssetPrefix="assets/layouts/chips.layout.coverflow.blp/background"
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
          preferredAssetPrefix="assets/layouts/chips.layout.coverflow.blp/top-region"
          readBoxAsset={readBoxAsset}
          importBoxAsset={importBoxAsset}
          deleteBoxAsset={deleteBoxAsset}
          onChange={(nextRegion) => {
            commit(updateFrameRegion(config, "topRegion", nextRegion));
          }}
        />
      </ChipsForm.Root>
    </section>
  );
}

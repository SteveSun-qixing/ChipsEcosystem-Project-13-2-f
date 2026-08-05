import React from "react";
import {
  ChipsForm,
  ChipsNumberInput,
  ChipsSegmentedControl,
  ChipsSelect,
  ChipsStack,
  ChipsText,
  ChipsTextField,
} from "@chips/component-library";
import { FrameRegionEditor } from "./frame-region-editor";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import {
  normalizeLayoutConfig,
  type CardSize,
  type FrameRegionConfig,
  type LayoutConfig,
  type ReviewLoop,
  type SortMode,
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
.chips-box-layout-editor {
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

.chips-box-layout-editor,
.chips-box-layout-editor * {
  box-sizing: border-box;
}

.chips-box-layout-editor__form {
  width: 100%;
  min-width: 0;
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
}

.chips-box-layout-editor__field,
.chips-box-layout-editor__region {
  min-width: 0;
}

.chips-box-layout-editor__region {
  display: grid;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
}

.chips-box-layout-editor [data-scope="form"][data-part="section"] {
  display: grid;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  min-width: 0;
}

.chips-box-layout-editor [data-scope="form"][data-part="field"] {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

.chips-box-layout-editor [data-scope="select"][data-part="root"],
.chips-box-layout-editor [data-scope="segmented-control"][data-part="root"],
.chips-box-layout-editor [data-scope="text-area"][data-part="root"],
.chips-box-layout-editor [data-scope="toolbar"][data-part="root"] {
  min-width: 0;
  max-width: 100%;
}

.chips-box-layout-editor [data-scope="toolbar"][data-part="root"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
}

.chips-box-layout-editor [data-scope="toolbar"][data-part="group"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
}

.chips-box-layout-editor [data-frame-region-asset-path] {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

.chips-box-layout-editor [data-frame-region-preview-shell] {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

.chips-box-layout-editor [data-frame-region-preview] {
  width: 100%;
  min-height: 160px;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

.chips-box-layout-editor [data-frame-region-preview] [data-scope="embedded-document-frame"],
.chips-box-layout-editor [data-frame-region-preview] [data-part="root"],
.chips-box-layout-editor [data-frame-region-preview] [data-part="frame-container"],
.chips-box-layout-editor [data-frame-region-preview] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

.chips-box-layout-editor [data-frame-region-preview-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-box-layout-editor [data-frame-region-preview-status] {
  min-height: 160px;
  display: grid;
  place-items: center;
  padding: var(--chips-base-space-4);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  text-align: center;
}

.chips-box-layout-editor [data-frame-region-preview-label] {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

.chips-box-layout-editor [data-cardstack-preview] {
  display: grid;
  justify-items: center;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
  padding-block: var(--chips-base-space-2);
}

.chips-box-layout-editor [data-cardstack-preview-stack] {
  position: relative;
  width: min(100%, 220px);
  aspect-ratio: 3 / 4;
}

.chips-box-layout-editor [data-cardstack-preview-layer] {
  position: absolute;
  inset: 0;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-sys-color-surface-container-low, var(--chips-sys-color-surface));
  box-shadow: var(--chips-comp-elevation-1, 0 8px 24px rgb(15 23 42 / 10%));
  transform:
    translate3d(calc(var(--layer-index) * 8px), calc(var(--layer-index) * 8px), 0)
    rotate(calc(var(--layer-index) * var(--preview-rotation) * 1deg));
}

.chips-box-layout-editor [data-cardstack-preview-layer="top"] {
  display: grid;
  place-items: center;
  padding: var(--chips-base-space-4);
  color: var(--chips-sys-color-on-surface);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
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

function PreviewStack({
  config,
  locale,
}: {
  config: LayoutConfig;
  locale?: string;
}) {
  const layerCount = Math.min(config.props.stackDepth, 5);
  return (
    <div data-cardstack-preview>
      <div
        data-cardstack-preview-stack
        style={{
          "--preview-rotation": String(config.props.spreadRotationDeg),
        } as React.CSSProperties}
        aria-hidden="true"
      >
        {Array.from({ length: layerCount }).map((_, index) => {
          const reverseIndex = layerCount - index - 1;
          return (
            <div
              key={index}
              data-cardstack-preview-layer={index === layerCount - 1 ? "top" : "base"}
              style={{
                "--layer-index": String(reverseIndex),
              } as React.CSSProperties}
            >
              {index === layerCount - 1 ? getLayoutMessage(locale, "editor.preview_card") : null}
            </div>
          );
        })}
      </div>
      <ChipsText as="p" tone="muted" text={getLayoutMessage(locale, "editor.preview_hint")} />
    </div>
  );
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
      className="chips-box-layout-editor"
      data-scope="chips-box-layout-editor"
      aria-label={getLayoutMessage(locale, "editor.aria_label")}
    >
      <style>{EDITOR_STYLE_TEXT}</style>
      <ChipsForm.Root
        className="chips-box-layout-editor__form"
        aria-label={getLayoutMessage(locale, "editor.aria_label")}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <ChipsStack gap="var(--chips-layout-gap-lg, var(--chips-base-space-4))">
          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.stack")}
            description={getLayoutMessage(locale, "editor.section.stack_desc")}
          >
            <ChipsForm.Field
              className="chips-box-layout-editor__field"
              name="sortMode"
            >
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.sort_mode")}</ChipsForm.Label>
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
                    value: "name",
                    label: getLayoutMessage(locale, "editor.sort_name"),
                  },
                  {
                    value: "random",
                    label: getLayoutMessage(locale, "editor.sort_random"),
                  },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    sortMode: value as SortMode,
                  }));
                }}
              />
              <ChipsForm.Hint>
                {config.props.sortMode === "manual"
                  ? getLayoutMessage(locale, "editor.sort_manual_hint")
                  : config.props.sortMode === "random"
                    ? getLayoutMessage(locale, "editor.sort_random_hint")
                    : getLayoutMessage(locale, "editor.sort_runtime_hint")}
              </ChipsForm.Hint>
            </ChipsForm.Field>

            {config.props.sortMode === "random" ? (
              <ChipsForm.Field
                className="chips-box-layout-editor__field"
                name="randomSeed"
              >
                <ChipsTextField
                  value={config.props.randomSeed}
                  label={getLayoutMessage(locale, "editor.random_seed")}
                  ariaLabel={getLayoutMessage(locale, "editor.random_seed")}
                  onValueChange={(value) => {
                    commit(updateProps(config, {
                      randomSeed: value,
                    }));
                  }}
                />
                <ChipsForm.Hint>{getLayoutMessage(locale, "editor.random_seed_hint")}</ChipsForm.Hint>
              </ChipsForm.Field>
            ) : null}

            <ChipsForm.Field
              className="chips-box-layout-editor__field"
              name="cardSize"
            >
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.card_size")}</ChipsForm.Label>
              <ChipsSegmentedControl
                value={config.props.cardSize}
                ariaLabel={getLayoutMessage(locale, "editor.card_size")}
                i18n={i18n}
                options={[
                  { value: "compact", label: getLayoutMessage(locale, "editor.card_size_compact") },
                  { value: "regular", label: getLayoutMessage(locale, "editor.card_size_regular") },
                  { value: "large", label: getLayoutMessage(locale, "editor.card_size_large") },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    cardSize: value as CardSize,
                  }));
                }}
              />
            </ChipsForm.Field>

            <ChipsForm.Field
              className="chips-box-layout-editor__field"
              name="reviewLoop"
            >
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.review_loop")}</ChipsForm.Label>
              <ChipsSegmentedControl
                value={config.props.reviewLoop}
                ariaLabel={getLayoutMessage(locale, "editor.review_loop")}
                i18n={i18n}
                options={[
                  { value: "stop-at-end", label: getLayoutMessage(locale, "editor.review_stop") },
                  { value: "loop", label: getLayoutMessage(locale, "editor.review_loop_enabled") },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    reviewLoop: value as ReviewLoop,
                  }));
                }}
              />
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-layout-editor__field" name="stackDepth">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.stack_depth")}</ChipsForm.Label>
              <StableNumberInput
                value={config.props.stackDepth}
                min={2}
                max={8}
                step={1}
                largeStep={2}
                ariaLabel={getLayoutMessage(locale, "editor.stack_depth")}
                onValueChange={(value: number | null) => {
                  commit(updateProps(config, {
                    stackDepth: typeof value === "number" ? value : 4,
                  }));
                }}
              />
              <ChipsForm.Hint>{getLayoutMessage(locale, "editor.stack_depth_hint")}</ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-layout-editor__field" name="spreadRotationDeg">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.spread_rotation")}</ChipsForm.Label>
              <StableNumberInput
                value={config.props.spreadRotationDeg}
                min={0}
                max={12}
                step={1}
                largeStep={3}
                ariaLabel={getLayoutMessage(locale, "editor.spread_rotation")}
                onValueChange={(value: number | null) => {
                  commit(updateProps(config, {
                    spreadRotationDeg: typeof value === "number" ? value : 5,
                  }));
                }}
              />
              <ChipsForm.Hint>{getLayoutMessage(locale, "editor.spread_rotation_hint")}</ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-layout-editor__field" name="swipeThreshold">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.swipe_threshold")}</ChipsForm.Label>
              <StableNumberInput
                value={config.props.swipeThreshold}
                min={80}
                max={260}
                step={10}
                largeStep={20}
                ariaLabel={getLayoutMessage(locale, "editor.swipe_threshold")}
                onValueChange={(value: number | null) => {
                  commit(updateProps(config, {
                    swipeThreshold: typeof value === "number" ? value : 120,
                  }));
                }}
              />
              <ChipsForm.Hint>{getLayoutMessage(locale, "editor.swipe_threshold_hint")}</ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsText
              as="p"
              tone="muted"
              text={formatMessage(locale, "editor.entry_count", { count: entries.length })}
            />

            <PreviewStack config={config} locale={locale} />
          </ChipsForm.Section>

          <FrameRegionEditor
            id="background"
            region={config.props.background}
            locale={locale}
            title={getLayoutMessage(locale, "editor.background_title")}
            description={getLayoutMessage(locale, "editor.background_desc")}
            previewRatio="16:9"
            preferredAssetPrefix="assets/layouts/chips.layout.cardstack.blp/background"
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
            preferredAssetPrefix="assets/layouts/chips.layout.cardstack.blp/top-region"
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

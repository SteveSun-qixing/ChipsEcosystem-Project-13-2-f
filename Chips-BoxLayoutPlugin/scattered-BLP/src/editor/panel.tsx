import React from "react";
import {
  ChipsForm,
  ChipsNumberInput,
  ChipsSegmentedControl,
  ChipsSelect,
  ChipsStack,
  ChipsText,
} from "@chips/component-library";
import { FrameRegionEditor } from "./frame-region-editor";
import { createScatterPlacements } from "../shared/scatter";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import {
  CYCLE_INTERVAL_MS_MAX,
  CYCLE_INTERVAL_MS_MIN,
  VISIBLE_FAKE_COUNT_MAX,
  VISIBLE_FAKE_COUNT_MIN,
  normalizeLayoutConfig,
  type CardSize,
  type FrameRegionConfig,
  type LayoutConfig,
  type MotionMode,
  type SortMode,
  type SpreadMode,
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
.chips-box-scattered-layout-editor {
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

.chips-box-scattered-layout-editor,
.chips-box-scattered-layout-editor * {
  box-sizing: border-box;
}

.chips-box-scattered-layout-editor__form {
  width: 100%;
  min-width: 0;
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
}

.chips-box-scattered-layout-editor__field,
.chips-box-scattered-layout-editor__region {
  min-width: 0;
}

.chips-box-scattered-layout-editor__region {
  display: grid;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
}

.chips-box-scattered-layout-editor [data-scope="form"][data-part="section"] {
  display: grid;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  min-width: 0;
}

.chips-box-scattered-layout-editor [data-scope="form"][data-part="field"] {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

.chips-box-scattered-layout-editor [data-scope="select"][data-part="root"],
.chips-box-scattered-layout-editor [data-scope="number-input"][data-part="root"],
.chips-box-scattered-layout-editor [data-scope="segmented-control"][data-part="root"],
.chips-box-scattered-layout-editor [data-scope="text-area"][data-part="root"],
.chips-box-scattered-layout-editor [data-scope="toolbar"][data-part="root"] {
  min-width: 0;
  max-width: 100%;
}

.chips-box-scattered-layout-editor [data-scope="toolbar"][data-part="root"],
.chips-box-scattered-layout-editor [data-scope="toolbar"][data-part="group"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
}

.chips-box-scattered-layout-editor__text-input {
  width: 100%;
  min-height: 38px;
  padding: 0 12px;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.36));
  border-radius: var(--chips-comp-input-root-radius, 10px);
  color: var(--chips-sys-color-on-surface, #111827);
  background: var(--chips-comp-input-root-surface, var(--chips-sys-color-surface, #ffffff));
  font: inherit;
}

.chips-box-scattered-layout-editor__preview {
  position: relative;
  min-height: 180px;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.32));
  border-radius: var(--chips-comp-box-root-radius, 12px);
  background: var(--chips-sys-color-surface-muted, #f8fafc);
}

.chips-box-scattered-layout-editor__preview-card {
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(82px, 28%, 132px);
  aspect-ratio: 3 / 4;
  border-radius: var(--chips-comp-box-root-radius, 12px);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle, rgba(148, 163, 184, 0.28));
  background: var(--scatter-color);
  transform: translate(calc(-50% + var(--scatter-x)), calc(-50% + var(--scatter-y))) rotate(var(--scatter-rotate)) scale(var(--scatter-scale));
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
}

.chips-box-scattered-layout-editor [data-frame-region-asset-path] {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

.chips-box-scattered-layout-editor [data-frame-region-preview-shell] {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

.chips-box-scattered-layout-editor [data-frame-region-preview] {
  width: 100%;
  min-height: 160px;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

.chips-box-scattered-layout-editor [data-frame-region-preview] [data-scope="embedded-document-frame"],
.chips-box-scattered-layout-editor [data-frame-region-preview] [data-part="root"],
.chips-box-scattered-layout-editor [data-frame-region-preview] [data-part="frame-container"],
.chips-box-scattered-layout-editor [data-frame-region-preview] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

.chips-box-scattered-layout-editor [data-frame-region-preview-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-box-scattered-layout-editor [data-frame-region-preview-status] {
  min-height: 160px;
  display: grid;
  place-items: center;
  padding: var(--chips-base-space-4);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  text-align: center;
}

.chips-box-scattered-layout-editor [data-frame-region-preview-label] {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}
`;

const PREVIEW_COLORS = [
  "color-mix(in srgb, var(--chips-sys-color-primary, #2563eb) 24%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-secondary, #16a34a) 24%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-tertiary, #db2777) 22%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-warning, #d97706) 20%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-info, #0891b2) 20%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-success, #059669) 20%, var(--chips-sys-color-surface, #ffffff))",
  "color-mix(in srgb, var(--chips-sys-color-surface-variant, #e5e7eb) 86%, var(--chips-sys-color-primary, #2563eb))",
];

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

function updateProps(config: LayoutConfig, patch: Partial<LayoutConfig["props"]>): LayoutConfig {
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
  region: FrameRegionConfig,
): LayoutConfig {
  return updateProps(config, {
    [key]: region,
  });
}

function ScatterPreview({ config }: { config: LayoutConfig }) {
  const placements = React.useMemo(
    () => createScatterPlacements(Math.max(4, Math.min(8, config.props.visibleFakeCount + 1)), config.props.randomSeed, config.props.spread),
    [config.props.randomSeed, config.props.spread, config.props.visibleFakeCount],
  );

  return (
    <div className="chips-box-scattered-layout-editor__preview" aria-hidden="true">
      {placements.map((placement, index) => (
        <span
          key={`${config.props.randomSeed}-${index}`}
          className="chips-box-scattered-layout-editor__preview-card"
          style={{
            "--scatter-x": `${placement.x}%`,
            "--scatter-y": `${placement.y}%`,
            "--scatter-rotate": `${placement.rotate}deg`,
            "--scatter-scale": placement.scale,
            "--scatter-color": PREVIEW_COLORS[placement.colorIndex % PREVIEW_COLORS.length],
          } as React.CSSProperties}
        />
      ))}
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
      className="chips-box-scattered-layout-editor"
      data-scope="chips-box-layout-editor"
      aria-label={getLayoutMessage(locale, "editor.aria_label")}
    >
      <style>{EDITOR_STYLE_TEXT}</style>
      <ChipsForm.Root
        className="chips-box-scattered-layout-editor__form"
        aria-label={getLayoutMessage(locale, "editor.aria_label")}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <ChipsStack gap="var(--chips-layout-gap-lg, var(--chips-base-space-4))">
          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.behavior")}
            description={getLayoutMessage(locale, "editor.section.behavior_desc")}
          >
            <ChipsForm.Field className="chips-box-scattered-layout-editor__field" name="sortMode">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.sort_mode")}</ChipsForm.Label>
              <StableSelect
                value={config.props.sortMode}
                placeholder={getLayoutMessage(locale, "editor.sort_mode")}
                i18n={i18n}
                options={[
                  { value: "manual", label: getLayoutMessage(locale, "editor.sort_manual") },
                  { value: "name", label: getLayoutMessage(locale, "editor.sort_name") },
                  { value: "random", label: getLayoutMessage(locale, "editor.sort_random") },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    sortMode: value as SortMode,
                  }));
                }}
              />
              <ChipsForm.Hint>
                {config.props.sortMode === "random"
                  ? getLayoutMessage(locale, "editor.sort_random_hint")
                  : config.props.sortMode === "name"
                    ? getLayoutMessage(locale, "editor.sort_name_hint")
                    : getLayoutMessage(locale, "editor.sort_manual_hint")}
              </ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-scattered-layout-editor__field" name="randomSeed">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.random_seed")}</ChipsForm.Label>
              <ChipsForm.Control>
                <input
                  className="chips-box-scattered-layout-editor__text-input"
                  value={config.props.randomSeed}
                  aria-label={getLayoutMessage(locale, "editor.random_seed")}
                  onChange={(event) => {
                    commit(updateProps(config, {
                      randomSeed: event.currentTarget.value,
                    }));
                  }}
                />
              </ChipsForm.Control>
              <ChipsForm.Hint>{getLayoutMessage(locale, "editor.random_seed_hint")}</ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-scattered-layout-editor__field" name="visibleFakeCount">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.visible_fake_count")}</ChipsForm.Label>
              <StableNumberInput
                value={config.props.visibleFakeCount}
                min={VISIBLE_FAKE_COUNT_MIN}
                max={VISIBLE_FAKE_COUNT_MAX}
                step={1}
                largeStep={3}
                ariaLabel={getLayoutMessage(locale, "editor.visible_fake_count")}
                onValueChange={(value: number | null) => {
                  commit(updateProps(config, {
                    visibleFakeCount: typeof value === "number" ? value : config.props.visibleFakeCount,
                  }));
                }}
              />
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-scattered-layout-editor__field" name="cycleIntervalMs">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.cycle_interval")}</ChipsForm.Label>
              <StableNumberInput
                value={config.props.cycleIntervalMs}
                min={CYCLE_INTERVAL_MS_MIN}
                max={CYCLE_INTERVAL_MS_MAX}
                step={500}
                largeStep={2000}
                ariaLabel={getLayoutMessage(locale, "editor.cycle_interval")}
                onValueChange={(value: number | null) => {
                  commit(updateProps(config, {
                    cycleIntervalMs: typeof value === "number" ? value : config.props.cycleIntervalMs,
                  }));
                }}
              />
              <ChipsForm.Hint>{getLayoutMessage(locale, "editor.cycle_interval_hint")}</ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsText
              as="p"
              tone="muted"
              text={formatMessage(locale, "editor.entry_count", { count: entries.length })}
            />
          </ChipsForm.Section>

          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.appearance")}
            description={getLayoutMessage(locale, "editor.section.appearance_desc")}
          >
            <ChipsForm.Field className="chips-box-scattered-layout-editor__field" name="cardSize">
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

            <ChipsForm.Field className="chips-box-scattered-layout-editor__field" name="spread">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.spread")}</ChipsForm.Label>
              <ChipsSegmentedControl
                value={config.props.spread}
                ariaLabel={getLayoutMessage(locale, "editor.spread")}
                i18n={i18n}
                options={[
                  { value: "calm", label: getLayoutMessage(locale, "editor.spread_calm") },
                  { value: "loose", label: getLayoutMessage(locale, "editor.spread_loose") },
                  { value: "wild", label: getLayoutMessage(locale, "editor.spread_wild") },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    spread: value as SpreadMode,
                  }));
                }}
              />
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-scattered-layout-editor__field" name="motion">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.motion")}</ChipsForm.Label>
              <ChipsSegmentedControl
                value={config.props.motion}
                ariaLabel={getLayoutMessage(locale, "editor.motion")}
                i18n={i18n}
                options={[
                  { value: "auto", label: getLayoutMessage(locale, "editor.motion_auto") },
                  { value: "reduced", label: getLayoutMessage(locale, "editor.motion_reduced") },
                ]}
                onValueChange={(value: string) => {
                  commit(updateProps(config, {
                    motion: value as MotionMode,
                  }));
                }}
              />
              <ChipsForm.Hint>{getLayoutMessage(locale, "editor.motion_hint")}</ChipsForm.Hint>
            </ChipsForm.Field>

            <ScatterPreview config={config} />
          </ChipsForm.Section>

          <FrameRegionEditor
            id="background"
            region={config.props.background}
            locale={locale}
            title={getLayoutMessage(locale, "editor.background_title")}
            description={getLayoutMessage(locale, "editor.background_desc")}
            previewRatio="16:9"
            preferredAssetPrefix="assets/layouts/chips.layout.scattered.blp/background"
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
            preferredAssetPrefix="assets/layouts/chips.layout.scattered.blp/top-region"
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

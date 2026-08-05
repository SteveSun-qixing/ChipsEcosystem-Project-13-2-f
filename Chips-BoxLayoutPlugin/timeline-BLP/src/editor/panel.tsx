import React from "react";
import {
  ChipsButton,
  ChipsForm,
  ChipsSegmentedControl,
  ChipsSelect,
  ChipsStack,
  ChipsSwitch,
  ChipsText,
  ChipsTextArea,
  ChipsTextField,
} from "@chips/component-library";
import { FrameRegionEditor } from "./frame-region-editor";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import {
  normalizeLayoutConfig,
  type FrameRegionConfig,
  type LayoutConfig,
  type TimelineCardDensity,
  type TimelineOrientation,
  type TimelinePointConfig,
  type TimelineScaleMode,
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

const EDITOR_STYLE_TEXT = `
.chips-box-timeline-editor {
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

.chips-box-timeline-editor,
.chips-box-timeline-editor * {
  box-sizing: border-box;
}

.chips-box-timeline-editor__form {
  width: 100%;
  min-width: 0;
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
}

.chips-box-timeline-editor__field,
.chips-box-timeline-editor__region,
.chips-box-timeline-editor__point,
.chips-box-timeline-editor__binding {
  min-width: 0;
}

.chips-box-timeline-editor__point {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  padding-block: var(--chips-base-space-3);
  border-block-end: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
}

.chips-box-timeline-editor__point-header,
.chips-box-timeline-editor__entry-row,
.chips-box-timeline-editor__binding-row {
  display: flex;
  align-items: center;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

.chips-box-timeline-editor__point-header {
  justify-content: space-between;
}

.chips-box-timeline-editor__point-title,
.chips-box-timeline-editor__entry-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.chips-box-timeline-editor__point-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
}

.chips-box-timeline-editor__entry-list {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

.chips-box-timeline-editor__entry-row {
  justify-content: space-between;
  padding: var(--chips-base-space-2);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

.chips-box-timeline-editor__binding-row > * {
  min-width: 0;
}

.chips-box-timeline-editor [data-scope="form"][data-part="section"] {
  display: grid;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  min-width: 0;
}

.chips-box-timeline-editor [data-scope="form"][data-part="field"] {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

.chips-box-timeline-editor [data-scope="select"][data-part="root"],
.chips-box-timeline-editor [data-scope="segmented-control"][data-part="root"],
.chips-box-timeline-editor [data-scope="text-field"][data-part="root"],
.chips-box-timeline-editor [data-scope="text-area"][data-part="root"],
.chips-box-timeline-editor [data-scope="toolbar"][data-part="root"] {
  min-width: 0;
  max-width: 100%;
}

.chips-box-timeline-editor [data-frame-region-asset-path] {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

.chips-box-timeline-editor [data-frame-region-preview-shell] {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-width: 0;
}

.chips-box-timeline-editor [data-frame-region-preview] {
  width: 100%;
  min-height: 160px;
  overflow: hidden;
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

.chips-box-timeline-editor [data-frame-region-preview] [data-scope="embedded-document-frame"],
.chips-box-timeline-editor [data-frame-region-preview] [data-part="root"],
.chips-box-timeline-editor [data-frame-region-preview] [data-part="frame-container"],
.chips-box-timeline-editor [data-frame-region-preview] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

.chips-box-timeline-editor [data-frame-region-preview-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-box-timeline-editor [data-frame-region-preview-status] {
  min-height: 160px;
  display: grid;
  place-items: center;
  padding: var(--chips-base-space-4);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  text-align: center;
}

.chips-box-timeline-editor [data-frame-region-preview-label] {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

@media (max-width: 560px) {
  .chips-box-timeline-editor__point-grid,
  .chips-box-timeline-editor__binding-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .chips-box-timeline-editor__binding-row {
    display: grid;
  }
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

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
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
  region: FrameRegionConfig
): LayoutConfig {
  return updateProps(config, {
    [key]: region,
  });
}

function createPointId(points: TimelinePointConfig[]): string {
  const used = new Set(points.map((point) => point.id));
  let index = points.length + 1;
  let id = `point-${index}`;
  while (used.has(id)) {
    index += 1;
    id = `point-${index}`;
  }
  return id;
}

function updatePoint(
  config: LayoutConfig,
  pointId: string,
  patch: Partial<TimelinePointConfig>
): LayoutConfig {
  return updateProps(config, {
    points: config.props.points.map((point) => (
      point.id === pointId
        ? {
          ...point,
          ...patch,
        }
        : point
    )),
  });
}

function removePoint(config: LayoutConfig, pointId: string): LayoutConfig {
  return updateProps(config, {
    points: config.props.points.filter((point) => point.id !== pointId),
  });
}

function addPoint(config: LayoutConfig, locale?: string): LayoutConfig {
  const id = createPointId(config.props.points);
  return updateProps(config, {
    points: [
      ...config.props.points,
      {
        id,
        label: formatMessage(locale, "editor.new_point_label", { index: config.props.points.length + 1 }),
        entryIds: [],
      },
    ],
  });
}

function bindEntry(config: LayoutConfig, pointId: string, entryId: string): LayoutConfig {
  return updateProps(config, {
    points: config.props.points.map((point) => {
      const withoutEntry = point.entryIds.filter((currentEntryId) => currentEntryId !== entryId);
      return point.id === pointId
        ? {
          ...point,
          entryIds: [...withoutEntry, entryId],
        }
        : {
          ...point,
          entryIds: withoutEntry,
        };
    }),
  });
}

function removeEntryFromPoint(config: LayoutConfig, pointId: string, entryId: string): LayoutConfig {
  return updateProps(config, {
    points: config.props.points.map((point) => (
      point.id === pointId
        ? {
          ...point,
          entryIds: point.entryIds.filter((currentEntryId) => currentEntryId !== entryId),
        }
        : point
    )),
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
  const [selectedEntryId, setSelectedEntryId] = React.useState<string>("");
  const [selectedPointId, setSelectedPointId] = React.useState<string>("");
  const i18n = React.useMemo(() => createI18nAdapter(locale), [locale]);
  const entryById = React.useMemo(() => new Map(entries.map((entry) => [entry.entryId, entry])), [entries]);
  const assignedEntryIds = React.useMemo(() => new Set(config.props.points.flatMap((point) => point.entryIds)), [config.props.points]);
  const unscheduledEntries = React.useMemo(
    () => entries.filter((entry) => entry.enabled && !assignedEntryIds.has(entry.entryId)),
    [assignedEntryIds, entries]
  );

  React.useEffect(() => {
    setConfig(normalizeLayoutConfig(initialConfig));
  }, [initialConfig]);

  React.useEffect(() => {
    setSelectedEntryId((current) => current || (unscheduledEntries[0]?.entryId ?? ""));
  }, [unscheduledEntries]);

  React.useEffect(() => {
    setSelectedPointId((current) => current || (config.props.points[0]?.id ?? ""));
  }, [config.props.points]);

  function commit(next: LayoutConfig): void {
    const normalized = normalizeLayoutConfig(next);
    setConfig(normalized);
    onChange(normalized);
  }

  const pointOptions = config.props.points.map((point) => ({
    value: point.id,
    label: point.label,
  }));
  const unscheduledOptions = unscheduledEntries.map((entry) => ({
    value: entry.entryId,
    label: resolveEntryTitle(entry),
  }));
  const canBind = Boolean(selectedEntryId && selectedPointId);

  return (
    <section
      className="chips-box-timeline-editor"
      data-scope="chips-box-layout-editor"
      aria-label={getLayoutMessage(locale, "editor.aria_label")}
    >
      <style>{EDITOR_STYLE_TEXT}</style>
      <ChipsForm.Root
        className="chips-box-timeline-editor__form"
        aria-label={getLayoutMessage(locale, "editor.aria_label")}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <ChipsStack gap="var(--chips-layout-gap-lg, var(--chips-base-space-4))">
          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.timeline")}
            description={getLayoutMessage(locale, "editor.section.timeline_desc")}
          >
            <ChipsForm.Field className="chips-box-timeline-editor__field" name="orientation">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.orientation")}</ChipsForm.Label>
              <ChipsSegmentedControl
                value={config.props.orientation}
                ariaLabel={getLayoutMessage(locale, "editor.orientation")}
                i18n={i18n}
                options={[
                  { value: "vertical", label: getLayoutMessage(locale, "editor.orientation_vertical") },
                  { value: "horizontal", label: getLayoutMessage(locale, "editor.orientation_horizontal") },
                ]}
                onValueChange={(value) => {
                  commit(updateProps(config, {
                    orientation: value as TimelineOrientation,
                  }));
                }}
              />
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-timeline-editor__field" name="scaleMode">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.scale_mode")}</ChipsForm.Label>
              <ChipsSegmentedControl
                value={config.props.scaleMode}
                ariaLabel={getLayoutMessage(locale, "editor.scale_mode")}
                i18n={i18n}
                options={[
                  { value: "equal-points", label: getLayoutMessage(locale, "editor.scale_equal_points") },
                  { value: "date-distance", label: getLayoutMessage(locale, "editor.scale_date_distance") },
                ]}
                onValueChange={(value) => {
                  commit(updateProps(config, {
                    scaleMode: value as TimelineScaleMode,
                  }));
                }}
              />
              <ChipsForm.Hint>{getLayoutMessage(locale, "editor.scale_hint")}</ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-timeline-editor__field" name="cardDensity">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.card_density")}</ChipsForm.Label>
              <ChipsSegmentedControl
                value={config.props.cardDensity}
                ariaLabel={getLayoutMessage(locale, "editor.card_density")}
                i18n={i18n}
                options={[
                  { value: "compact", label: getLayoutMessage(locale, "editor.density_compact") },
                  { value: "comfortable", label: getLayoutMessage(locale, "editor.density_comfortable") },
                  { value: "spacious", label: getLayoutMessage(locale, "editor.density_spacious") },
                ]}
                onValueChange={(value) => {
                  commit(updateProps(config, {
                    cardDensity: value as TimelineCardDensity,
                  }));
                }}
              />
            </ChipsForm.Field>

            <ChipsForm.Field className="chips-box-timeline-editor__field" name="showCovers">
              <ChipsSwitch
                checked={config.props.showCovers}
                label={getLayoutMessage(locale, "editor.show_covers")}
                onCheckedChange={(checked) => {
                  commit(updateProps(config, {
                    showCovers: checked,
                  }));
                }}
              />
              <ChipsForm.Hint>{getLayoutMessage(locale, "editor.show_covers_hint")}</ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsText
              as="p"
              tone="muted"
              text={formatMessage(locale, "editor.entry_count", { count: entries.length })}
            />
          </ChipsForm.Section>

          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.points")}
            description={getLayoutMessage(locale, "editor.section.points_desc")}
          >
            <ChipsButton
              type="button"
              onPress={() => {
                commit(addPoint(config, locale));
              }}
            >
              {getLayoutMessage(locale, "editor.add_point")}
            </ChipsButton>

            {config.props.points.length === 0 ? (
              <ChipsText as="p" tone="muted" text={getLayoutMessage(locale, "editor.no_points")} />
            ) : null}

            {config.props.points.map((point, index) => {
              const pointEntries = point.entryIds
                .map((entryId) => entryById.get(entryId))
                .filter((entry): entry is BoxEntrySnapshot => Boolean(entry));

              return (
                <section key={point.id} className="chips-box-timeline-editor__point" data-point-id={point.id}>
                  <div className="chips-box-timeline-editor__point-header">
                    <ChipsText
                      as="strong"
                      className="chips-box-timeline-editor__point-title"
                      text={formatMessage(locale, "editor.point_title", { index: index + 1 })}
                    />
                    <ChipsButton
                      type="button"
                      onPress={() => {
                        commit(removePoint(config, point.id));
                      }}
                    >
                      {getLayoutMessage(locale, "editor.delete_point")}
                    </ChipsButton>
                  </div>

                  <div className="chips-box-timeline-editor__point-grid">
                    <ChipsForm.Field name={`${point.id}.label`}>
                      <ChipsForm.Label>{getLayoutMessage(locale, "editor.point_label")}</ChipsForm.Label>
                      <ChipsTextField
                        value={point.label}
                        ariaLabel={getLayoutMessage(locale, "editor.point_label")}
                        onValueChange={(value) => {
                          commit(updatePoint(config, point.id, {
                            label: value,
                          }));
                        }}
                      />
                    </ChipsForm.Field>

                    <ChipsForm.Field name={`${point.id}.date`}>
                      <ChipsForm.Label>{getLayoutMessage(locale, "editor.point_date")}</ChipsForm.Label>
                      <ChipsTextField
                        value={point.date ?? ""}
                        ariaLabel={getLayoutMessage(locale, "editor.point_date")}
                        placeholder={getLayoutMessage(locale, "editor.point_date_placeholder")}
                        onValueChange={(value) => {
                          commit(updatePoint(config, point.id, {
                            date: value,
                          }));
                        }}
                      />
                    </ChipsForm.Field>
                  </div>

                  <ChipsForm.Field name={`${point.id}.note`}>
                    <ChipsTextArea
                      value={point.note ?? ""}
                      label={getLayoutMessage(locale, "editor.point_note")}
                      ariaLabel={getLayoutMessage(locale, "editor.point_note")}
                      rows={3}
                      resize="block"
                      onValueChange={(value) => {
                        commit(updatePoint(config, point.id, {
                          note: value,
                        }));
                      }}
                    />
                  </ChipsForm.Field>

                  <div className="chips-box-timeline-editor__entry-list">
                    {pointEntries.length === 0 ? (
                      <ChipsText as="p" tone="muted" text={getLayoutMessage(locale, "editor.point_no_entries")} />
                    ) : null}
                    {pointEntries.map((entry) => (
                      <div key={entry.entryId} className="chips-box-timeline-editor__entry-row">
                        <span className="chips-box-timeline-editor__entry-title">{resolveEntryTitle(entry)}</span>
                        <ChipsButton
                          type="button"
                          onPress={() => {
                            commit(removeEntryFromPoint(config, point.id, entry.entryId));
                          }}
                        >
                          {getLayoutMessage(locale, "editor.remove_entry")}
                        </ChipsButton>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </ChipsForm.Section>

          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.bindings")}
            description={getLayoutMessage(locale, "editor.section.bindings_desc")}
          >
            <ChipsText
              as="p"
              tone="muted"
              text={formatMessage(locale, "editor.unscheduled_count", { count: unscheduledEntries.length })}
            />
            <div className="chips-box-timeline-editor__binding-row">
              <StableSelect
                value={selectedEntryId}
                placeholder={getLayoutMessage(locale, "editor.select_entry")}
                i18n={i18n}
                options={unscheduledOptions}
                disabled={unscheduledOptions.length === 0}
                onValueChange={setSelectedEntryId}
              />
                <StableSelect
                value={selectedPointId}
                placeholder={getLayoutMessage(locale, "editor.select_point")}
                i18n={i18n}
                options={pointOptions}
                disabled={pointOptions.length === 0}
                onValueChange={setSelectedPointId}
              />
              <ChipsButton
                type="button"
                disabled={!canBind}
                onPress={() => {
                  if (!canBind) {
                    return;
                  }
                  commit(bindEntry(config, selectedPointId, selectedEntryId));
                  setSelectedEntryId("");
                }}
              >
                {getLayoutMessage(locale, "editor.bind_entry")}
              </ChipsButton>
            </div>
          </ChipsForm.Section>

          <FrameRegionEditor
            id="background"
            region={config.props.background}
            locale={locale}
            title={getLayoutMessage(locale, "editor.background_title")}
            description={getLayoutMessage(locale, "editor.background_desc")}
            previewRatio="16:9"
            preferredAssetPrefix="assets/layouts/chips.layout.timeline.blp/background"
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
            preferredAssetPrefix="assets/layouts/chips.layout.timeline.blp/top-region"
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

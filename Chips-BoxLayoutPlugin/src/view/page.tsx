import React, { useMemo } from "react";
import { hasFrameRegionContent, type LayoutConfig } from "../schema/layout-config";
import { FrameRegionSurface } from "../shared/frame-region";
import type { BoxEntrySnapshot, BoxLayoutRuntime } from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";
import { EntryTile } from "./entry-tile";
import { GRID_LAYOUT_STYLE } from "./styles";

export interface LayoutViewProps {
  entries: BoxEntrySnapshot[];
  config: LayoutConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
}

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
}

function sortEntries(entries: BoxEntrySnapshot[], sortMode: LayoutConfig["props"]["sortMode"], locale?: string): BoxEntrySnapshot[] {
  if (sortMode === "manual") {
    return entries;
  }

  const direction = sortMode === "name-desc" ? -1 : 1;
  const compareLocale = locale === "zh-CN" ? "zh-CN" : "en-US";

  return [...entries].sort((left, right) => {
    const compared = resolveEntryTitle(left).localeCompare(resolveEntryTitle(right), compareLocale);
    if (compared !== 0) {
      return compared * direction;
    }
    return left.entryId.localeCompare(right.entryId);
  });
}

export function LayoutViewPage({
  entries,
  config,
  runtime,
  locale,
}: LayoutViewProps) {
  const sortedEntries = useMemo(
    () => sortEntries(entries, config.props.sortMode, locale),
    [config.props.sortMode, entries, locale],
  );
  const showBackground = hasFrameRegionContent(config.props.background);
  const showTopRegion = hasFrameRegionContent(config.props.topRegion);

  return (
    <section data-scope="chips-box-grid-layout">
      <style>{GRID_LAYOUT_STYLE}</style>

      {showBackground ? (
        <div data-layout-background aria-hidden="true">
          <FrameRegionSurface
            region={config.props.background}
            title={getLayoutMessage(locale, "editor.background_title")}
            ratio="16:9"
            readBoxAsset={runtime.readBoxAsset}
          />
        </div>
      ) : null}

      <div data-layout-shell>
        {showTopRegion ? (
          <div data-layout-top-region>
            <FrameRegionSurface
              region={config.props.topRegion}
              title={getLayoutMessage(locale, "editor.top_region_title")}
              ratio="16:5"
              readBoxAsset={runtime.readBoxAsset}
            />
          </div>
        ) : null}

        <div data-layout-grid data-empty={sortedEntries.length === 0 ? "true" : undefined}>
          {sortedEntries.length > 0 ? (
            sortedEntries.map((entry) => (
              <EntryTile
                key={entry.entryId}
                entry={entry}
                runtime={runtime}
                locale={locale}
              />
            ))
          ) : (
            <div data-layout-empty>
              <div data-layout-empty-ghosts aria-hidden="true">
                <span data-layout-empty-ghost data-size="lg" />
                <span data-layout-empty-ghost data-size="md" />
                <span data-layout-empty-ghost data-size="sm" />
              </div>
              <strong data-layout-empty-title>{getLayoutMessage(locale, "layout.empty")}</strong>
              <span data-layout-empty-text>{getLayoutMessage(locale, "layout.empty_hint")}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

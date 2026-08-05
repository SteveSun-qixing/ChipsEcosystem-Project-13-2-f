import React from "react";
import {
  ChipsButton,
  ChipsCheckbox,
  ChipsForm,
  ChipsSegmentedControl,
  ChipsSelect,
  ChipsStack,
  ChipsText,
} from "@chips/component-library";
import { FrameRegionEditor } from "./frame-region-editor";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import {
  normalizeLayoutConfig,
  type DocumentTreeNodeConfig,
  type FrameRegionConfig,
  type LayoutConfig,
  type SidebarWidth,
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
type NodePath = number[];

const StableSelect = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof ChipsSelect>>((props, ref) => (
  <ChipsSelect
    {...props}
    ref={ref}
    iconContent={<span aria-hidden="true">{"\u25be"}</span>}
  />
));
StableSelect.displayName = "StableSelect";

interface FlatEditorNode {
  node: DocumentTreeNodeConfig;
  path: NodePath;
  depth: number;
}

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

.chips-box-layout-editor__tree {
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
}

.chips-box-layout-editor__tree-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-1));
  min-width: 0;
  padding: var(--chips-base-space-2, 8px);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-base-radius-sm, 4px);
  background: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

.chips-box-layout-editor__tree-title {
  display: flex;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-1));
  align-items: center;
  min-width: 0;
}

.chips-box-layout-editor__title-input {
  width: 100%;
  min-width: 0;
  min-height: var(--chips-layout-density-comfortable, 40px);
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-base-radius-sm, 4px);
  padding-inline: var(--chips-base-space-2, 8px);
  color: var(--chips-sys-color-on-surface);
  background: var(--chips-sys-color-surface);
  font: inherit;
}

.chips-box-layout-editor__node-actions,
.chips-box-layout-editor__unconfigured-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-1));
  min-width: 0;
}

.chips-box-layout-editor__node-meta {
  min-width: 0;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
  overflow-wrap: anywhere;
}

.chips-box-layout-editor__empty {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
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

.chips-box-layout-editor [data-scope="toolbar"][data-part="root"],
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

function cloneNode(node: DocumentTreeNodeConfig): DocumentTreeNodeConfig {
  return {
    id: node.id,
    entryId: node.entryId,
    titleOverride: node.titleOverride,
    collapsed: node.collapsed,
    children: node.children.map(cloneNode),
  };
}

function cloneNodes(nodes: DocumentTreeNodeConfig[]): DocumentTreeNodeConfig[] {
  return nodes.map(cloneNode);
}

function getChildrenAtPath(nodes: DocumentTreeNodeConfig[], parentPath: NodePath): DocumentTreeNodeConfig[] {
  let children = nodes;
  for (const index of parentPath) {
    children = children[index]?.children ?? [];
  }
  return children;
}

function updateNodeAtPath(
  nodes: DocumentTreeNodeConfig[],
  path: NodePath,
  updater: (node: DocumentTreeNodeConfig) => DocumentTreeNodeConfig
): DocumentTreeNodeConfig[] {
  const next = cloneNodes(nodes);
  const parent = getChildrenAtPath(next, path.slice(0, -1));
  const index = path[path.length - 1];
  if (typeof index === "number" && parent[index]) {
    parent[index] = updater(parent[index]);
  }
  return next;
}

function removeNodeAtPath(nodes: DocumentTreeNodeConfig[], path: NodePath): {
  nodes: DocumentTreeNodeConfig[];
  removed?: DocumentTreeNodeConfig;
} {
  const next = cloneNodes(nodes);
  const parent = getChildrenAtPath(next, path.slice(0, -1));
  const index = path[path.length - 1];
  if (typeof index !== "number") {
    return { nodes: next };
  }
  const [removed] = parent.splice(index, 1);
  return { nodes: next, removed };
}

function insertNodeAtPath(
  nodes: DocumentTreeNodeConfig[],
  parentPath: NodePath,
  index: number,
  node: DocumentTreeNodeConfig
): DocumentTreeNodeConfig[] {
  const next = cloneNodes(nodes);
  const parent = getChildrenAtPath(next, parentPath);
  parent.splice(index, 0, cloneNode(node));
  return next;
}

function flattenNodes(nodes: DocumentTreeNodeConfig[], depth = 0, parentPath: NodePath = []): FlatEditorNode[] {
  return nodes.flatMap((node, index) => {
    const path = [...parentPath, index];
    return [
      { node, path, depth },
      ...flattenNodes(node.children, depth + 1, path),
    ];
  });
}

function collectEntryIds(nodes: DocumentTreeNodeConfig[], output = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.entryId) {
      output.add(node.entryId);
    }
    collectEntryIds(node.children, output);
  }
  return output;
}

function createEntryNode(entry: BoxEntrySnapshot): DocumentTreeNodeConfig {
  return {
    id: `entry-${entry.entryId}`,
    entryId: entry.entryId,
    collapsed: false,
    children: [],
  };
}

function createGroupNode(): DocumentTreeNodeConfig {
  return {
    id: `group-${Date.now()}`,
    titleOverride: "",
    collapsed: false,
    children: [],
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
  const configRef = React.useRef(config);
  const i18n = React.useMemo(() => createI18nAdapter(locale), [locale]);
  const entryMap = React.useMemo(() => new Map(entries.map((entry) => [entry.entryId, entry])), [entries]);

  React.useEffect(() => {
    const normalized = normalizeLayoutConfig(initialConfig);
    configRef.current = normalized;
    setConfig(normalized);
  }, [initialConfig]);

  function commit(next: LayoutConfig): void {
    const normalized = normalizeLayoutConfig(next);
    configRef.current = normalized;
    setConfig(normalized);
    onChange(normalized);
  }

  function commitTreeNodes(treeNodes: DocumentTreeNodeConfig[]): void {
    commit(updateProps(configRef.current, { treeNodes }));
  }

  const flatNodes = React.useMemo(() => flattenNodes(config.props.treeNodes), [config.props.treeNodes]);
  const configuredEntryIds = React.useMemo(() => collectEntryIds(config.props.treeNodes), [config.props.treeNodes]);
  const unconfiguredEntries = entries.filter((entry) => !configuredEntryIds.has(entry.entryId));

  function moveNode(path: NodePath, direction: -1 | 1): void {
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    if (typeof index !== "number") {
      return;
    }
    const siblings = getChildrenAtPath(configRef.current.props.treeNodes, parentPath);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= siblings.length) {
      return;
    }
    const next = cloneNodes(configRef.current.props.treeNodes);
    const parent = getChildrenAtPath(next, parentPath);
    const [node] = parent.splice(index, 1);
    if (!node) {
      return;
    }
    parent.splice(nextIndex, 0, node);
    commitTreeNodes(next);
  }

  function indentNode(path: NodePath): void {
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    if (typeof index !== "number" || index <= 0) {
      return;
    }
    const removal = removeNodeAtPath(configRef.current.props.treeNodes, path);
    if (!removal.removed) {
      return;
    }
    const newParentPath = [...parentPath, index - 1];
    const nextParent = getChildrenAtPath(removal.nodes, newParentPath);
    nextParent.push(removal.removed);
    commitTreeNodes(removal.nodes);
  }

  function outdentNode(path: NodePath): void {
    if (path.length <= 1) {
      return;
    }
    const parentPath = path.slice(0, -1);
    const grandParentPath = path.slice(0, -2);
    const parentIndex = parentPath[parentPath.length - 1];
    if (typeof parentIndex !== "number") {
      return;
    }
    const removal = removeNodeAtPath(configRef.current.props.treeNodes, path);
    if (!removal.removed) {
      return;
    }
    commitTreeNodes(insertNodeAtPath(removal.nodes, grandParentPath, parentIndex + 1, removal.removed));
  }

  function addEntry(entry: BoxEntrySnapshot): void {
    commitTreeNodes([...configRef.current.props.treeNodes, createEntryNode(entry)]);
  }

  function addGroup(): void {
    commitTreeNodes([...configRef.current.props.treeNodes, createGroupNode()]);
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
            title={getLayoutMessage(locale, "editor.section.display")}
            description={getLayoutMessage(locale, "editor.section.display_desc")}
          >
            <ChipsForm.Field className="chips-box-layout-editor__field" name="sortMode">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.sort_mode")}</ChipsForm.Label>
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
                  commit(updateProps(config, { sortMode: value as SortMode }));
                }}
              />
              <ChipsForm.Hint>
                {config.props.sortMode === "manual"
                  ? getLayoutMessage(locale, "editor.sort_manual_hint")
                  : getLayoutMessage(locale, "editor.sort_runtime_hint")}
              </ChipsForm.Hint>
            </ChipsForm.Field>

            <ChipsForm.Field name="sidebarWidth">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.sidebar_width")}</ChipsForm.Label>
              <ChipsSegmentedControl
                value={config.props.sidebarWidth}
                ariaLabel={getLayoutMessage(locale, "editor.sidebar_width")}
                i18n={i18n}
                options={[
                  { value: "compact", label: getLayoutMessage(locale, "editor.sidebar_compact") },
                  { value: "regular", label: getLayoutMessage(locale, "editor.sidebar_regular") },
                  { value: "wide", label: getLayoutMessage(locale, "editor.sidebar_wide") },
                ]}
                onValueChange={(value) => {
                  commit(updateProps(config, { sidebarWidth: value as SidebarWidth }));
                }}
              />
            </ChipsForm.Field>

            <ChipsForm.Field name="showSummary">
              <ChipsCheckbox
                checked={config.props.showSummary}
                label={getLayoutMessage(locale, "editor.show_summary")}
                onCheckedChange={(checked) => {
                  commit(updateProps(config, { showSummary: checked }));
                }}
              />
            </ChipsForm.Field>

            <ChipsText
              as="p"
              tone="muted"
              text={formatMessage(locale, "editor.entry_count", { count: entries.length })}
            />
          </ChipsForm.Section>

          <ChipsForm.Section
            title={getLayoutMessage(locale, "editor.section.tree")}
            description={getLayoutMessage(locale, "editor.section.tree_desc")}
          >
            <div className="chips-box-layout-editor__node-actions">
              <ChipsButton type="button" onPress={addGroup}>
                {getLayoutMessage(locale, "editor.add_group")}
              </ChipsButton>
            </div>

            <div className="chips-box-layout-editor__tree">
              {flatNodes.length > 0 ? flatNodes.map(({ node, path, depth }) => {
                const entry = node.entryId ? entryMap.get(node.entryId) : undefined;
                const inheritedTitle = entry ? resolveEntryTitle(entry) : getLayoutMessage(locale, "editor.group_title_fallback");
                return (
                  <div
                    key={node.id}
                    className="chips-box-layout-editor__tree-row"
                    style={{ marginInlineStart: `calc(${depth} * var(--chips-base-space-4, 16px))` }}
                    data-tree-node-id={node.id}
                  >
                    <div className="chips-box-layout-editor__tree-title">
                      <input
                        className="chips-box-layout-editor__title-input"
                        value={node.titleOverride ?? ""}
                        aria-label={formatMessage(locale, "editor.title_override_for", { title: inheritedTitle })}
                        placeholder={inheritedTitle}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          commitTreeNodes(updateNodeAtPath(configRef.current.props.treeNodes, path, (current) => ({
                            ...current,
                            titleOverride: value,
                          })));
                        }}
                      />
                    </div>
                    <div className="chips-box-layout-editor__node-meta">
                      {node.entryId
                        ? formatMessage(locale, entry ? "editor.node_entry" : "editor.node_missing_entry", { entryId: node.entryId })
                        : getLayoutMessage(locale, "editor.node_group")}
                    </div>
                    <ChipsCheckbox
                      checked={node.collapsed}
                      label={getLayoutMessage(locale, "editor.collapsed_by_default")}
                      onCheckedChange={(checked) => {
                        commitTreeNodes(updateNodeAtPath(configRef.current.props.treeNodes, path, (current) => ({
                          ...current,
                          collapsed: checked,
                        })));
                      }}
                    />
                    <div className="chips-box-layout-editor__node-actions">
                      <ChipsButton type="button" onPress={() => { moveNode(path, -1); }}>
                        {getLayoutMessage(locale, "editor.move_up")}
                      </ChipsButton>
                      <ChipsButton type="button" onPress={() => { moveNode(path, 1); }}>
                        {getLayoutMessage(locale, "editor.move_down")}
                      </ChipsButton>
                      <ChipsButton type="button" onPress={() => { indentNode(path); }}>
                        {getLayoutMessage(locale, "editor.indent")}
                      </ChipsButton>
                      <ChipsButton type="button" onPress={() => { outdentNode(path); }}>
                        {getLayoutMessage(locale, "editor.outdent")}
                      </ChipsButton>
                      <ChipsButton
                        type="button"
                        onPress={() => {
                          commitTreeNodes(removeNodeAtPath(configRef.current.props.treeNodes, path).nodes);
                        }}
                      >
                        {getLayoutMessage(locale, "editor.remove_node")}
                      </ChipsButton>
                    </div>
                  </div>
                );
              }) : (
                <span className="chips-box-layout-editor__empty">
                  {getLayoutMessage(locale, "editor.tree_empty")}
                </span>
              )}
            </div>

            <ChipsForm.Field name="unconfiguredEntries">
              <ChipsForm.Label>{getLayoutMessage(locale, "editor.unconfigured_entries")}</ChipsForm.Label>
              <div className="chips-box-layout-editor__unconfigured-list">
                {unconfiguredEntries.length > 0 ? unconfiguredEntries.map((entry) => (
                  <ChipsButton
                    key={entry.entryId}
                    type="button"
                    onPress={() => {
                      addEntry(entry);
                    }}
                  >
                    {formatMessage(locale, "editor.add_entry", { title: resolveEntryTitle(entry) })}
                  </ChipsButton>
                )) : (
                  <span className="chips-box-layout-editor__empty">
                    {getLayoutMessage(locale, "editor.no_unconfigured_entries")}
                  </span>
                )}
              </div>
            </ChipsForm.Field>
          </ChipsForm.Section>

          <FrameRegionEditor
            id="background"
            region={config.props.background}
            locale={locale}
            title={getLayoutMessage(locale, "editor.background_title")}
            description={getLayoutMessage(locale, "editor.background_desc")}
            previewRatio="16:9"
            preferredAssetPrefix="assets/layouts/chips.layout.documentlibrary.blp/background"
            readBoxAsset={readBoxAsset}
            importBoxAsset={importBoxAsset}
            deleteBoxAsset={deleteBoxAsset}
            onChange={(nextRegion) => {
              commit(updateFrameRegion(configRef.current, "background", nextRegion));
            }}
          />

          <FrameRegionEditor
            id="topRegion"
            region={config.props.topRegion}
            locale={locale}
            title={getLayoutMessage(locale, "editor.top_region_title")}
            description={getLayoutMessage(locale, "editor.top_region_desc")}
            previewRatio="16:5"
            preferredAssetPrefix="assets/layouts/chips.layout.documentlibrary.blp/top-region"
            readBoxAsset={readBoxAsset}
            importBoxAsset={importBoxAsset}
            deleteBoxAsset={deleteBoxAsset}
            onChange={(nextRegion) => {
              commit(updateFrameRegion(configRef.current, "topRegion", nextRegion));
            }}
          />
        </ChipsStack>
      </ChipsForm.Root>
    </section>
  );
}

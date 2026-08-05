import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmbeddedDocumentFrame } from "@chips/component-library";
import {
  hasFrameRegionContent,
  type DocumentTreeNodeConfig,
  type FrameRegionConfig,
  type LayoutConfig,
} from "../schema/layout-config";
import type {
  BoxEntryCoverView,
  BoxEntryPage,
  BoxEntrySnapshot,
  BoxLayoutRuntime,
  ResolvedRuntimeResource,
} from "../shared/types";
import { getLayoutMessage } from "../shared/i18n";

const PAGE_LIMIT = 240;

export interface LayoutViewProps {
  initialView: BoxEntryPage;
  config: LayoutConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
}

interface CoverState {
  status: "idle" | "loading" | "ready" | "error";
  view?: BoxEntryCoverView;
}

interface FrameRegionState {
  status: "idle" | "loading" | "ready" | "error";
  resource?: ResolvedRuntimeResource;
}

interface TreeDisplayNode {
  id: string;
  entryId?: string;
  title: string;
  depth: number;
  collapsed: boolean;
  configured: boolean;
  missing: boolean;
  entry?: BoxEntrySnapshot;
  children: TreeDisplayNode[];
}

const DOCUMENT_LIBRARY_STYLE = `
[data-scope="chips-document-library-layout"] {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  box-sizing: border-box;
  color: var(--chips-sys-color-on-surface);
  background-color: var(--chips-sys-color-surface);
}

[data-scope="chips-document-library-layout"] * {
  box-sizing: border-box;
}

[data-scope="chips-document-library-layout"] [data-layout-background] {
  position: sticky;
  top: 0;
  width: 100%;
  block-size: 100vh;
  margin-block-end: -100vh;
  pointer-events: none;
}

[data-scope="chips-document-library-layout"] [data-layout-shell] {
  position: relative;
  display: grid;
  gap: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  padding: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  min-width: 0;
  min-height: 100%;
}

[data-scope="chips-document-library-layout"] [data-layout-top-region] {
  min-width: 0;
  min-block-size: clamp(132px, 24vw, 288px);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  overflow: hidden;
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
}

[data-scope="chips-document-library-layout"] [data-frame-region],
[data-scope="chips-document-library-layout"] [data-frame-region] [data-part="root"],
[data-scope="chips-document-library-layout"] [data-frame-region] [data-part="frame-container"],
[data-scope="chips-document-library-layout"] [data-frame-region] [data-part="iframe"] {
  width: 100%;
  height: 100%;
}

[data-scope="chips-document-library-layout"] [data-frame-region-image] {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

[data-scope="chips-document-library-layout"] [data-document-library-main] {
  display: grid;
  grid-template-columns: minmax(0, var(--document-library-sidebar-width, 280px)) minmax(0, 1fr);
  gap: var(--chips-layout-gap-lg, var(--chips-base-space-4));
  align-items: start;
  min-width: 0;
}

[data-scope="chips-document-library-layout"] [data-document-library-main][data-sidebar-width="compact"] {
  --document-library-sidebar-width: 220px;
}

[data-scope="chips-document-library-layout"] [data-document-library-main][data-sidebar-width="regular"] {
  --document-library-sidebar-width: 280px;
}

[data-scope="chips-document-library-layout"] [data-document-library-main][data-sidebar-width="wide"] {
  --document-library-sidebar-width: 360px;
}

[data-scope="chips-document-library-layout"] [data-document-tree],
[data-scope="chips-document-library-layout"] [data-document-preview],
[data-scope="chips-document-library-layout"] [data-frame-region-status],
[data-scope="chips-document-library-layout"] [data-layout-empty],
[data-scope="chips-document-library-layout"] [data-layout-page-error] {
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-box-root-surface, var(--chips-sys-color-surface));
}

[data-scope="chips-document-library-layout"] [data-document-tree] {
  position: sticky;
  top: var(--chips-base-space-4, 16px);
  display: grid;
  gap: var(--chips-layout-gap-sm, var(--chips-base-space-2));
  min-width: 0;
  max-height: calc(100vh - var(--chips-base-space-8, 64px));
  overflow: auto;
  padding: var(--chips-base-space-3, 12px);
}

[data-scope="chips-document-library-layout"] [data-document-tree-list] {
  display: grid;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-1));
  min-width: 0;
}

[data-scope="chips-document-library-layout"] [data-document-tree-row] {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  border-radius: var(--chips-comp-button-root-radius, var(--chips-base-radius-sm));
}

[data-scope="chips-document-library-layout"] [data-document-tree-row][data-active="true"] {
  background-color: var(--chips-comp-button-root-surface-selected, var(--chips-sys-color-surface-container));
}

[data-scope="chips-document-library-layout"] [data-document-tree-toggle],
[data-scope="chips-document-library-layout"] [data-document-tree-title],
[data-scope="chips-document-library-layout"] [data-document-cover-button],
[data-scope="chips-document-library-layout"] [data-document-open-button],
[data-scope="chips-document-library-layout"] [data-layout-load-more],
[data-scope="chips-document-library-layout"] [data-layout-retry] {
  border: none;
  margin: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

[data-scope="chips-document-library-layout"] [data-document-tree-toggle] {
  inline-size: 28px;
  block-size: 28px;
  display: grid;
  place-items: center;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
}

[data-scope="chips-document-library-layout"] [data-document-tree-title] {
  display: block;
  min-width: 0;
  padding: var(--chips-base-space-1, 4px) var(--chips-base-space-2, 8px);
  text-align: start;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-scope="chips-document-library-layout"] [data-document-tree-row][data-missing="true"] [data-document-tree-title] {
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-style: italic;
}

[data-scope="chips-document-library-layout"] [data-document-preview] {
  display: grid;
  gap: var(--chips-layout-gap-md, var(--chips-base-space-3));
  min-width: 0;
  padding: var(--chips-base-space-4, 16px);
}

[data-scope="chips-document-library-layout"] [data-document-cover-shell] {
  width: min(100%, 520px);
  overflow: hidden;
  border-radius: var(--chips-comp-box-root-radius, var(--chips-base-radius-md));
  border: var(--chips-layout-divider-thickness, 1px) solid var(--chips-sys-color-border-subtle);
  background-color: var(--chips-sys-color-surface);
}

[data-scope="chips-document-library-layout"] [data-document-cover-shell] [data-scope="embedded-document-frame"] {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

[data-scope="chips-document-library-layout"] [data-document-cover-shell] [data-part="frame-container"],
[data-scope="chips-document-library-layout"] [data-document-cover-shell] [data-part="iframe"] {
  width: 100%;
  height: 100%;
  border: none;
  pointer-events: none;
}

[data-scope="chips-document-library-layout"] [data-document-cover-placeholder] {
  width: 100%;
  min-height: 220px;
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  padding: var(--chips-base-space-4);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  text-align: center;
}

[data-scope="chips-document-library-layout"] [data-document-title] {
  margin: 0;
  color: var(--chips-sys-color-on-surface);
  font-size: var(--chips-comp-heading-md-font-size, 24px);
  line-height: var(--chips-comp-heading-md-line-height, 1.25);
  font-weight: var(--chips-comp-text-root-font-weight-strong, 700);
}

[data-scope="chips-document-library-layout"] [data-document-summary],
[data-scope="chips-document-library-layout"] [data-document-meta] {
  margin: 0;
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  line-height: var(--chips-comp-text-root-line-height, 1.5);
}

[data-scope="chips-document-library-layout"] [data-document-tags] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-1));
}

[data-scope="chips-document-library-layout"] [data-document-tag] {
  padding: 2px 8px;
  border-radius: var(--chips-base-radius-sm, 4px);
  background-color: var(--chips-sys-color-surface-container);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  font-size: var(--chips-comp-label-root-font-size, 12px);
}

[data-scope="chips-document-library-layout"] [data-document-open-button],
[data-scope="chips-document-library-layout"] [data-layout-load-more],
[data-scope="chips-document-library-layout"] [data-layout-retry] {
  justify-self: start;
  min-block-size: var(--chips-layout-density-comfortable, 40px);
  padding-inline: var(--chips-base-space-4);
  padding-block: var(--chips-base-space-2);
  border-radius: var(--chips-comp-button-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-button-root-surface-idle);
  color: var(--chips-comp-button-label-color-idle, var(--chips-sys-color-on-surface));
}

[data-scope="chips-document-library-layout"] [data-layout-footer] {
  display: flex;
  justify-content: center;
  min-width: 0;
}

[data-scope="chips-document-library-layout"] [data-layout-empty],
[data-scope="chips-document-library-layout"] [data-layout-page-error],
[data-scope="chips-document-library-layout"] [data-frame-region-status] {
  display: grid;
  place-items: center;
  gap: var(--chips-layout-gap-xs, var(--chips-base-space-2));
  min-height: 160px;
  padding: var(--chips-base-space-4);
  color: var(--chips-sys-color-on-surface-muted, var(--chips-sys-color-on-surface));
  text-align: center;
}

[data-scope="chips-document-library-layout"] [data-document-tree-toggle]:focus-visible,
[data-scope="chips-document-library-layout"] [data-document-tree-title]:focus-visible,
[data-scope="chips-document-library-layout"] [data-document-cover-button]:focus-visible,
[data-scope="chips-document-library-layout"] [data-document-open-button]:focus-visible,
[data-scope="chips-document-library-layout"] [data-layout-load-more]:focus-visible,
[data-scope="chips-document-library-layout"] [data-layout-retry]:focus-visible {
  outline: var(--chips-layout-focus-outline-width, 2px) solid var(--chips-comp-button-focus-outline, currentColor);
  outline-offset: var(--chips-layout-focus-outline-offset, 2px);
}

@media (max-width: 720px) {
  [data-scope="chips-document-library-layout"] [data-document-library-main] {
    grid-template-columns: minmax(0, 1fr);
  }

  [data-scope="chips-document-library-layout"] [data-document-tree] {
    position: relative;
    top: auto;
    max-height: none;
  }
}
`;

function resolveEntryTitle(entry: BoxEntrySnapshot): string {
  return entry.snapshot.title ?? entry.snapshot.documentId ?? entry.entryId;
}

function resolveEntryKindMessage(entry: BoxEntrySnapshot, locale?: string): string {
  if (entry.snapshot.contentType === "chips/box") {
    return getLayoutMessage(locale, "layout.entry_type_box");
  }
  return getLayoutMessage(locale, "layout.entry_type_card");
}

function resolveTags(entry: BoxEntrySnapshot): string[] {
  return (entry.snapshot.tags ?? [])
    .map((tag) => Array.isArray(tag) ? tag.join(" / ") : tag)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function toCssAspectRatio(value: string | number | undefined, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value}`;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.includes(":") ? value.trim().replace(":", " / ") : value.trim();
  }
  return fallback.includes(":") ? fallback.replace(":", " / ") : fallback;
}

function toRatioToken(value: string | number | undefined, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value}`;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function compareTitles(locale: string | undefined, left: string, right: string): number {
  return left.localeCompare(right, locale === "zh-CN" ? "zh-CN" : "en-US");
}

function sortTreeNodes(
  nodes: TreeDisplayNode[],
  sortMode: LayoutConfig["props"]["sortMode"],
  locale?: string
): TreeDisplayNode[] {
  const next = nodes.map((node) => ({
    ...node,
    children: sortTreeNodes(node.children, sortMode, locale),
  }));
  if (sortMode === "manual") {
    return next;
  }
  const direction = sortMode === "name-desc" ? -1 : 1;
  return next.sort((left, right) => {
    const compared = compareTitles(locale, left.title, right.title);
    return compared === 0 ? left.id.localeCompare(right.id) : compared * direction;
  });
}

function appendUniqueEntries(current: BoxEntrySnapshot[], incoming: BoxEntrySnapshot[]): BoxEntrySnapshot[] {
  const seen = new Set(current.map((entry) => entry.entryId));
  const next = [...current];
  for (const entry of incoming) {
    if (!seen.has(entry.entryId)) {
      seen.add(entry.entryId);
      next.push(entry);
    }
  }
  return next;
}

function collectConfiguredEntryIds(nodes: DocumentTreeNodeConfig[], output = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.entryId) {
      output.add(node.entryId);
    }
    collectConfiguredEntryIds(node.children, output);
  }
  return output;
}

function buildTreeNodes({
  configNodes,
  entries,
  sortMode,
  locale,
}: {
  configNodes: DocumentTreeNodeConfig[];
  entries: BoxEntrySnapshot[];
  sortMode: LayoutConfig["props"]["sortMode"];
  locale?: string;
}): TreeDisplayNode[] {
  const entryMap = new Map(entries.map((entry) => [entry.entryId, entry]));
  const configuredEntryIds = collectConfiguredEntryIds(configNodes);

  const mapConfigNode = (node: DocumentTreeNodeConfig, depth: number): TreeDisplayNode => {
    const entry = node.entryId ? entryMap.get(node.entryId) : undefined;
    const fallbackTitle = entry ? resolveEntryTitle(entry) : getLayoutMessage(locale, "layout.missing_entry");
    return {
      id: node.id,
      entryId: node.entryId,
      title: node.titleOverride ?? fallbackTitle,
      depth,
      collapsed: node.collapsed,
      configured: true,
      missing: Boolean(node.entryId && !entry),
      entry,
      children: node.children.map((child) => mapConfigNode(child, depth + 1)),
    };
  };

  const configuredNodes = configNodes.map((node) => mapConfigNode(node, 0));
  const unconfiguredNodes = entries
    .filter((entry) => entry.enabled && !configuredEntryIds.has(entry.entryId))
    .map((entry): TreeDisplayNode => ({
      id: `unconfigured-${entry.entryId}`,
      entryId: entry.entryId,
      title: resolveEntryTitle(entry),
      depth: 0,
      collapsed: false,
      configured: false,
      missing: false,
      entry,
      children: [],
    }));

  return sortTreeNodes([...configuredNodes, ...unconfiguredNodes], sortMode, locale);
}

function flattenVisibleTree(nodes: TreeDisplayNode[]): TreeDisplayNode[] {
  const flattened: TreeDisplayNode[] = [];
  const visit = (node: TreeDisplayNode): void => {
    flattened.push(node);
    if (!node.collapsed) {
      node.children.forEach(visit);
    }
  };
  nodes.forEach(visit);
  return flattened;
}

function FrameRegionSurface({
  region,
  runtime,
  locale,
  title,
  ratio,
  decorative = false,
}: {
  region: FrameRegionConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
  title: string;
  ratio: string;
  decorative?: boolean;
}) {
  const [state, setState] = useState<FrameRegionState>({ status: "idle" });

  useEffect(() => {
    if (region.mode !== "image" || !region.assetPath) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void runtime.readBoxAsset(region.assetPath).then((resource) => {
      if (!cancelled) {
        setState({ status: "ready", resource });
      }
    }).catch(() => {
      if (!cancelled) {
        setState({ status: "error" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [region.assetPath, region.mode, runtime]);

  if (region.mode === "html") {
    return (
      <div data-frame-region>
        <EmbeddedDocumentFrame
          title={title}
          srcDoc={region.html ?? ""}
          ratio={ratio}
          disabled={decorative}
        />
      </div>
    );
  }

  if (region.mode !== "image") {
    return null;
  }

  if (state.status === "ready" && state.resource?.resourceUrl) {
    return (
      <div data-frame-region>
        <img data-frame-region-image src={state.resource.resourceUrl} alt={decorative ? "" : title} />
      </div>
    );
  }

  const message = state.status === "loading"
    ? getLayoutMessage(locale, "layout.asset_loading")
    : getLayoutMessage(locale, "layout.asset_error");

  return (
    <div data-frame-region-status role={decorative ? undefined : "status"}>
      {message}
    </div>
  );
}

function CoverPreview({
  entry,
  runtime,
  locale,
}: {
  entry: BoxEntrySnapshot;
  runtime: BoxLayoutRuntime;
  locale?: string;
}) {
  const [coverState, setCoverState] = useState<CoverState>(() => ({
    status: entry.snapshot.cover?.mode === "none" ? "idle" : "loading",
  }));

  useEffect(() => {
    if (entry.snapshot.cover?.mode === "none") {
      setCoverState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setCoverState({ status: "loading" });
    void runtime.renderEntryCover(entry.entryId).then((view) => {
      if (!cancelled) {
        setCoverState({ status: "ready", view });
      }
    }).catch(() => {
      if (!cancelled) {
        setCoverState({ status: "error" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [entry.entryId, entry.snapshot.cover?.mode, runtime]);

  const openEntry = () => {
    void runtime.openEntry(entry.entryId);
  };
  const fallbackRatio = "3:4";
  const aspectRatio = toCssAspectRatio(coverState.view?.ratio ?? entry.layoutHints?.aspectRatio, fallbackRatio);
  const ratioToken = toRatioToken(coverState.view?.ratio ?? entry.layoutHints?.aspectRatio, fallbackRatio);
  const title = resolveEntryTitle(entry);

  if (coverState.status === "ready" && coverState.view?.coverUrl) {
    return (
      <div data-document-cover-shell style={{ aspectRatio }}>
        <EmbeddedDocumentFrame
          title={coverState.view.title || title}
          src={coverState.view.coverUrl}
          ratio={ratioToken}
          onActivate={openEntry}
        />
      </div>
    );
  }

  const message = coverState.status === "loading"
    ? getLayoutMessage(locale, "layout.loading")
    : coverState.status === "error"
      ? getLayoutMessage(locale, "layout.cover_error")
      : getLayoutMessage(locale, "layout.cover_missing");

  return (
    <button
      type="button"
      data-document-cover-shell
      data-document-cover-button
      data-document-cover-placeholder
      data-state={coverState.status}
      style={{ aspectRatio }}
      onClick={openEntry}
    >
      <strong>{title}</strong>
      <span>{message}</span>
      <span>{resolveEntryKindMessage(entry, locale)}</span>
    </button>
  );
}

function DocumentPreview({
  node,
  runtime,
  locale,
  showSummary,
}: {
  node: TreeDisplayNode | undefined;
  runtime: BoxLayoutRuntime;
  locale?: string;
  showSummary: boolean;
}) {
  if (!node) {
    return (
      <div data-layout-empty>
        <strong>{getLayoutMessage(locale, "layout.empty")}</strong>
        <span>{getLayoutMessage(locale, "layout.empty_hint")}</span>
      </div>
    );
  }

  if (!node.entry) {
    return (
      <div data-document-preview data-missing="true">
        <h1 data-document-title>{node.title}</h1>
        <p data-document-meta>{getLayoutMessage(locale, "layout.missing_entry_hint")}</p>
      </div>
    );
  }

  const tags = resolveTags(node.entry);
  const summary = node.entry.snapshot.summary?.trim();

  return (
    <article data-document-preview data-entry-id={node.entry.entryId}>
      <CoverPreview entry={node.entry} runtime={runtime} locale={locale} />
      <h1 data-document-title>{node.title}</h1>
      <p data-document-meta>{resolveEntryKindMessage(node.entry, locale)}</p>
      {showSummary && summary ? (
        <p data-document-summary>{summary}</p>
      ) : null}
      {tags.length > 0 ? (
        <div data-document-tags aria-label={getLayoutMessage(locale, "layout.tags")}>
          {tags.map((tag) => (
            <span key={tag} data-document-tag>{tag}</span>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        data-document-open-button
        onClick={() => {
          void runtime.openEntry(node.entry?.entryId ?? "");
        }}
      >
        {getLayoutMessage(locale, "layout.open_entry")}
      </button>
    </article>
  );
}

export function LayoutViewPage({ initialView, config, runtime, locale }: LayoutViewProps) {
  const isMountedRef = useRef(true);
  const [items, setItems] = useState<BoxEntrySnapshot[]>(initialView.items);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialView.nextCursor);
  const [total, setTotal] = useState(initialView.total);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [collapsedOverrides, setCollapsedOverrides] = useState<Record<string, boolean>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setItems(initialView.items);
    setNextCursor(initialView.nextCursor);
    setTotal(initialView.total);
    setIsLoadingNext(false);
    setPageError(false);
    setSelectedNodeId(undefined);
  }, [initialView]);

  const enabledEntries = useMemo(() => items.filter((entry) => entry.enabled), [items]);
  const treeNodes = useMemo(() => buildTreeNodes({
    configNodes: config.props.treeNodes,
    entries: enabledEntries,
    sortMode: config.props.sortMode,
    locale,
  }), [config.props.sortMode, config.props.treeNodes, enabledEntries, locale]);

  const effectiveTreeNodes = useMemo(() => {
    const applyExpansion = (nodes: TreeDisplayNode[]): TreeDisplayNode[] => nodes.map((node) => ({
      ...node,
      collapsed: collapsedOverrides[node.id] ?? node.collapsed,
      children: applyExpansion(node.children),
    }));
    return flattenVisibleTree(applyExpansion(treeNodes));
  }, [collapsedOverrides, treeNodes]);

  const selectedNode = useMemo(() => {
    return effectiveTreeNodes.find((node) => node.id === selectedNodeId)
      ?? effectiveTreeNodes.find((node) => node.entry)
      ?? effectiveTreeNodes[0];
  }, [selectedNodeId, effectiveTreeNodes]);

  const hasTopRegion = hasFrameRegionContent(config.props.topRegion);
  const hasBackground = hasFrameRegionContent(config.props.background);

  useEffect(() => {
    const prefetchEntries = enabledEntries.slice(0, PAGE_LIMIT);
    if (prefetchEntries.length === 0) {
      return;
    }
    void runtime.prefetchEntries({
      entryIds: prefetchEntries.map((entry) => entry.entryId),
      targets: ["cover"],
    }).catch(() => undefined);
  }, [enabledEntries, runtime]);

  const loadNextPage = useCallback(async () => {
    if (!nextCursor || isLoadingNext) {
      return;
    }
    setIsLoadingNext(true);
    setPageError(false);
    try {
      const page = await runtime.listEntries({ cursor: nextCursor, limit: PAGE_LIMIT });
      if (!page || !Array.isArray(page.items)) {
        throw new Error("Invalid box entry page.");
      }
      if (!isMountedRef.current) {
        return;
      }
      setItems((current) => appendUniqueEntries(current, page.items));
      setNextCursor(page.nextCursor);
      setTotal(page.total);
    } catch {
      if (isMountedRef.current) {
        setPageError(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingNext(false);
      }
    }
  }, [isLoadingNext, nextCursor, runtime]);

  const toggleNode = (nodeId: string): void => {
    const node = effectiveTreeNodes.find((candidate) => candidate.id === nodeId);
    setCollapsedOverrides((current) => ({
      ...current,
      [nodeId]: !(node?.collapsed ?? false),
    }));
  };

  const openNode = (node: TreeDisplayNode): void => {
    setSelectedNodeId(node.id);
    if (node.entryId && node.entry) {
      void runtime.openEntry(node.entryId);
    }
  };

  const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (effectiveTreeNodes.length === 0) {
      return;
    }
    const currentIndex = Math.max(0, effectiveTreeNodes.findIndex((node) => node.id === selectedNode?.id));
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedNodeId(effectiveTreeNodes[Math.min(effectiveTreeNodes.length - 1, currentIndex + 1)]?.id);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedNodeId(effectiveTreeNodes[Math.max(0, currentIndex - 1)]?.id);
    } else if (event.key === "ArrowRight" && selectedNode && selectedNode.children.length > 0) {
      event.preventDefault();
      setCollapsedOverrides((current) => ({ ...current, [selectedNode.id]: false }));
    } else if (event.key === "ArrowLeft" && selectedNode && selectedNode.children.length > 0) {
      event.preventDefault();
      setCollapsedOverrides((current) => ({ ...current, [selectedNode.id]: true }));
    } else if ((event.key === "Enter" || event.key === " ") && selectedNode) {
      event.preventDefault();
      openNode(selectedNode);
    }
  };

  return (
    <section data-scope="chips-document-library-layout">
      <style>{DOCUMENT_LIBRARY_STYLE}</style>

      {hasBackground ? (
        <div data-layout-background aria-hidden="true">
          <FrameRegionSurface
            region={config.props.background}
            runtime={runtime}
            locale={locale}
            title={getLayoutMessage(locale, "layout.background_title")}
            ratio="16:9"
            decorative
          />
        </div>
      ) : null}

      <div data-layout-shell>
        {hasTopRegion ? (
          <div data-layout-top-region>
            <FrameRegionSurface
              region={config.props.topRegion}
              runtime={runtime}
              locale={locale}
              title={getLayoutMessage(locale, "layout.top_region_title")}
              ratio="16:5"
            />
          </div>
        ) : null}

        <div data-document-library-main data-sidebar-width={config.props.sidebarWidth}>
          <nav
            data-document-tree
            aria-label={getLayoutMessage(locale, "layout.tree_label")}
            onKeyDown={handleTreeKeyDown}
          >
            <div data-document-tree-list role="tree">
              {effectiveTreeNodes.map((node) => (
                <div
                  key={node.id}
                  data-document-tree-row
                  data-active={selectedNode?.id === node.id ? "true" : "false"}
                  data-missing={node.missing ? "true" : undefined}
                  data-unconfigured={!node.configured ? "true" : undefined}
                  role="treeitem"
                  aria-selected={selectedNode?.id === node.id ? "true" : "false"}
                  aria-expanded={node.children.length > 0 ? !node.collapsed : undefined}
                  style={{ paddingInlineStart: `calc(${node.depth} * var(--chips-base-space-4, 16px))` }}
                >
                  <button
                    type="button"
                    data-document-tree-toggle
                    disabled={node.children.length === 0}
                    aria-label={getLayoutMessage(locale, node.collapsed ? "layout.expand_node" : "layout.collapse_node")}
                    onClick={() => {
                      toggleNode(node.id);
                    }}
                  >
                    {node.children.length > 0 ? (node.collapsed ? "+" : "-") : ""}
                  </button>
                  <button
                    type="button"
                    data-document-tree-title
                    title={node.title}
                    onClick={() => {
                      openNode(node);
                    }}
                  >
                    {node.title}
                  </button>
                </div>
              ))}
            </div>
          </nav>

          <DocumentPreview
            node={selectedNode}
            runtime={runtime}
            locale={locale}
            showSummary={config.props.showSummary}
          />
        </div>

        {nextCursor || pageError ? (
          <div data-layout-footer data-total={total}>
            {pageError ? (
              <div data-layout-page-error role="status">
                <span>{getLayoutMessage(locale, "layout.page_error")}</span>
                <button type="button" data-layout-retry onClick={loadNextPage}>
                  {getLayoutMessage(locale, "layout.retry")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-layout-load-more
                onClick={loadNextPage}
                disabled={isLoadingNext}
              >
                {isLoadingNext
                  ? getLayoutMessage(locale, "layout.loading_more")
                  : getLayoutMessage(locale, "layout.load_more")}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

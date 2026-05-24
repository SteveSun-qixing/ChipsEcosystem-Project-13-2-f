import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { LayoutEditorPanel } from "./panel";
import type { BoxEntrySnapshot, ResolvedRuntimeResource } from "../shared/types";
import type { LayoutConfig } from "../schema/layout-config";

export interface MountLayoutEditorOptions {
  container: HTMLElement;
  entries: BoxEntrySnapshot[];
  initialConfig: LayoutConfig;
  locale?: string;
  readBoxAsset?(assetPath: string): Promise<ResolvedRuntimeResource>;
  importBoxAsset?(input: { file: File; preferredPath?: string }): Promise<{ assetPath: string }>;
  deleteBoxAsset?(assetPath: string): Promise<void>;
  onChange(next: LayoutConfig): void;
}

export function mountLayoutEditor(options: MountLayoutEditorOptions): () => void {
  const root: Root = createRoot(options.container);
  root.render(
    React.createElement(LayoutEditorPanel, {
      entries: options.entries,
      config: options.initialConfig,
      locale: options.locale,
      readBoxAsset: options.readBoxAsset,
      importBoxAsset: options.importBoxAsset,
      deleteBoxAsset: options.deleteBoxAsset,
      onChange: options.onChange,
    })
  );

  return () => {
    root.unmount();
    options.container.replaceChildren();
  };
}

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { LayoutEditorPanel } from "./panel";
import type { BoxEntrySnapshot } from "../shared/types";
import type { LayoutConfig } from "../schema/layout-config";

export interface MountLayoutEditorOptions {
  container: HTMLElement;
  entries: BoxEntrySnapshot[];
  initialConfig: LayoutConfig;
  locale?: string;
  onChange(next: LayoutConfig): void;
}

export function mountLayoutEditor(options: MountLayoutEditorOptions): () => void {
  const root: Root = createRoot(options.container);
  root.render(
    React.createElement(LayoutEditorPanel, {
      entries: options.entries,
      config: options.initialConfig,
      locale: options.locale,
      onChange: options.onChange,
    })
  );

  return () => {
    root.unmount();
    options.container.replaceChildren();
  };
}

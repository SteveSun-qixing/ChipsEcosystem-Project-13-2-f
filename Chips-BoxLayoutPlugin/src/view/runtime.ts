import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { LayoutViewPage } from "./page";
import type { BoxEntryPage, BoxLayoutRuntime } from "../shared/types";
import type { LayoutConfig } from "../schema/layout-config";

export interface MountLayoutViewOptions {
  container: HTMLElement;
  initialView: BoxEntryPage;
  config: LayoutConfig;
  runtime: BoxLayoutRuntime;
  locale?: string;
}

export function mountLayoutView(options: MountLayoutViewOptions): () => void {
  const root: Root = createRoot(options.container);
  root.render(
    React.createElement(LayoutViewPage, {
      entries: options.initialView.items,
      config: options.config,
      runtime: options.runtime,
      locale: options.locale,
    })
  );

  return () => {
    root.unmount();
    options.container.replaceChildren();
  };
}

import React from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { BasecardRenderContext } from "../index";
import type { BasecardConfig } from "../schema/card-config";
import { RichTextCardView, VIEW_STYLE_TEXT } from "./view";

type MountState = {
  root: Root;
};

export function mountBasecardView(ctx: BasecardRenderContext): () => void {
  const { container, config, themeCssText } = ctx;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const mountNode = document.createElement("div");
  mountNode.setAttribute("data-chips-richtext-view-root", "true");
  mountNode.style.width = "100%";
  container.appendChild(mountNode);

  const state: MountState = {
    root: createRoot(mountNode),
  };

  flushSync(() => {
    state.root.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement("style", null, `${themeCssText ?? ""}\n${VIEW_STYLE_TEXT}`),
        React.createElement(RichTextCardView, {
          config: config as BasecardConfig,
        }),
      ),
    );
  });

  return () => {
    state.root.unmount();
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };
}

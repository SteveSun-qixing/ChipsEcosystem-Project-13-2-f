import type { BasecardConfig } from "../schema/card-config";
import type { BasecardRenderContext } from "../index";
import { createBasecardViewRoot } from "./view";

export function mountBasecardView(
  ctx: BasecardRenderContext
): () => void {
  const { container, config, themeCssText } = ctx;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (themeCssText) {
    const styleEl = document.createElement("style");
    styleEl.textContent = themeCssText;
    container.appendChild(styleEl);
  }

  const root = createBasecardViewRoot(config as BasecardConfig);
  container.appendChild(root);

  return () => {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };
}


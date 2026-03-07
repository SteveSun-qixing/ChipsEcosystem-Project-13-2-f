import type { BasecardConfig } from "../schema/card-config";

export interface BasecardViewProps {
  config: BasecardConfig;
}

export function createBasecardViewRoot(config: BasecardConfig): HTMLElement {
  const root = document.createElement("div");
  root.className = "chips-basecard chips-basecard--standard";

  const titleEl = document.createElement("h2");
  titleEl.className = "chips-basecard__title";
  titleEl.textContent = config.title || "";
  root.appendChild(titleEl);

  const bodyEl = document.createElement("div");
  bodyEl.className = "chips-basecard__body";
  bodyEl.textContent = config.body || "";
  root.appendChild(bodyEl);

  return root;
}


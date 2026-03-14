import type { BasecardConfig } from "../schema/card-config";
import { sanitizeRichTextHtml } from "../shared/utils";

export function createBasecardViewRoot(config: BasecardConfig): HTMLElement {
  const root = document.createElement("div");
  root.className = "chips-basecard chips-basecard--richtext";

  const bodyEl = document.createElement("div");
  bodyEl.className = "chips-basecard__body chips-basecard__body--richtext";
  bodyEl.innerHTML = sanitizeRichTextHtml(config.body || "");
  root.appendChild(bodyEl);

  return root;
}

import { Editor, defaultValueCtx, editorViewOptionsCtx, rootCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import type { Editor as MilkdownEditor } from "@milkdown/core";
import type { BasecardRenderContext } from "../index";
import { normalizeBasecardConfig } from "../schema/card-config";
import { loadMarkdownFromConfig, rewriteRelativeResourceUrls } from "../shared/resource-links";
import { createTranslator } from "../shared/i18n";
import { VIEW_STYLE_TEXT } from "./view";

type ViewState = {
  editor?: MilkdownEditor;
  disposed: boolean;
  resolvedResources: Set<string>;
};

export function mountBasecardView(ctx: BasecardRenderContext): () => void {
  const { container, themeCssText } = ctx;
  const config = normalizeBasecardConfig(ctx.config as unknown as Record<string, unknown>);
  const t = createTranslator(config.locale);
  const state: ViewState = {
    disposed: false,
    resolvedResources: new Set<string>(),
  };

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const style = document.createElement("style");
  style.textContent = `${themeCssText ?? ""}\n${VIEW_STYLE_TEXT}`;
  container.appendChild(style);

  const root = document.createElement("div");
  root.className = "chips-richtext-card";
  root.setAttribute("data-card-type", config.card_type);
  container.appendChild(root);

  const surface = document.createElement("div");
  surface.className = "chips-richtext-card__surface";
  root.appendChild(surface);

  const status = document.createElement("div");
  status.className = "chips-richtext-card__status";
  root.appendChild(status);

  const setStatus = (message: string, type: "info" | "error") => {
    status.textContent = message;
    status.className = `chips-richtext-card__status${type === "error" ? " chips-richtext-card__status--error" : ""}`;
    status.hidden = false;
  };

  const hideStatus = () => {
    status.hidden = true;
    status.textContent = "";
  };

  setStatus(t("basecard.status.loading"), "info");

  void (async () => {
    try {
      const markdown = await loadMarkdownFromConfig(config, ctx.resolveResourceUrl);
      if (state.disposed) {
        return;
      }

      state.editor = await Editor.make()
        .config((editorCtx) => {
          editorCtx.set(rootCtx, surface);
          editorCtx.set(defaultValueCtx, markdown);
          editorCtx.update(editorViewOptionsCtx, (prev) => ({
            ...prev,
            editable: () => false,
            attributes: {
              ...(typeof prev.attributes === "object" ? prev.attributes : {}),
              spellcheck: "false",
              autocapitalize: "off",
              autocorrect: "off",
              translate: "no",
            },
          }));
        })
        .use(commonmark)
        .create();

      if (state.disposed) {
        await state.editor.destroy();
        return;
      }

      const resolved = await rewriteRelativeResourceUrls(surface, ctx.resolveResourceUrl);
      resolved.forEach((resourcePath) => state.resolvedResources.add(resourcePath));
      hideStatus();
    } catch (error) {
      if (state.disposed) {
        return;
      }
      surface.innerHTML = "";
      setStatus(
        `${t("basecard.status.renderFailed")}：${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  })();

  return () => {
    state.disposed = true;
    const destroyPromise = state.editor?.destroy();
    if (destroyPromise) {
      void destroyPromise;
    }
    if (ctx.releaseResourceUrl) {
      for (const resourcePath of state.resolvedResources) {
        void ctx.releaseResourceUrl(resourcePath);
      }
    }
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };
}

import { describe, it, expect } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import { mountBasecardEditor } from "../../src/editor/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("basecard integration flow", () => {
  it("updates the rendered hyperlink when editor emits valid config", () => {
    const container = document.createElement("div");
    const editorContainer = document.createElement("div");

    const initialConfig: BasecardConfig = {
      card_type: "HyperlinkCard",
      anchor_text: "Initial",
      url: "https://example.com",
      locale: "zh-CN",
      theme: "",
    };

    let currentConfig: BasecardConfig = initialConfig;

    mountBasecardView({
      container,
      config: currentConfig,
    });

    mountBasecardEditor({
      container: editorContainer,
      initialConfig,
      onChange: (next) => {
        currentConfig = next;
        mountBasecardView({
          container,
          config: currentConfig,
        });
      },
    });

    const inputs = editorContainer.querySelectorAll(".chips-basecard-editor__input");
    const anchorInput = inputs.item(0) as HTMLInputElement | null;
    const urlInput = inputs.item(1) as HTMLInputElement | null;

    if (!anchorInput || !urlInput) {
      throw new Error("找不到超链接输入框");
    }

    anchorInput.value = "Updated";
    anchorInput.dispatchEvent(new Event("input", { bubbles: true }));
    urlInput.value = "https://example.com/updated";
    urlInput.dispatchEvent(new Event("input", { bubbles: true }));

    const buttonEl = container.querySelector(".chips-hyperlink-card__button") as HTMLButtonElement | null;
    expect(buttonEl?.textContent).toBe("Updated");
    expect(currentConfig.url).toBe("https://example.com/updated");
  });
});

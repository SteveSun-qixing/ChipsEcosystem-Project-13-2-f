import { describe, it, expect } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("createBasecardEditorRoot", () => {
  it("emits changes when anchor text and link fields are valid", () => {
    const initialConfig: BasecardConfig = {
      card_type: "HyperlinkCard",
      anchor_text: "Chips",
      url: "https://example.com",
      locale: "zh-CN",
      theme: "",
    };

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const inputs = root.querySelectorAll(".chips-basecard-editor__input");
    const anchorInput = inputs.item(0) as HTMLInputElement | null;
    const urlInput = inputs.item(1) as HTMLInputElement | null;

    if (!anchorInput || !urlInput) {
      throw new Error("找不到超链接输入框");
    }

    anchorInput.value = "Chips Docs";
    anchorInput.dispatchEvent(new Event("input", { bubbles: true }));
    urlInput.value = "https://example.com/docs";
    urlInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(lastConfig?.anchor_text).toBe("Chips Docs");
    expect(lastConfig?.url).toBe("https://example.com/docs");
    expect(lastConfig?.card_type).toBe("HyperlinkCard");
  });

  it("keeps invalid URLs local and displays an i18n validation message", async () => {
    const initialConfig: BasecardConfig = {
      card_type: "HyperlinkCard",
      anchor_text: "Chips",
      url: "https://example.com",
      locale: "zh-CN",
      theme: "",
    };

    let changeCount = 0;
    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: () => {
        changeCount += 1;
      },
    });

    const urlInput = root.querySelectorAll(".chips-basecard-editor__input").item(1) as HTMLInputElement | null;
    if (!urlInput) {
      throw new Error("找不到链接输入框");
    }

    urlInput.value = "ftp://example.com/file";
    urlInput.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(changeCount).toBe(0);
    expect(root.textContent).toContain("链接必须是有效的 http 或 https 地址。");
  });
});

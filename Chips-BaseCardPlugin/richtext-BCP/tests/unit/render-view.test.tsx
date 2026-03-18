import { describe, expect, it } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";
import { VIEW_STYLE_TEXT } from "../../src/render/view";

function createConfig(overrides: Partial<BasecardConfig> = {}): BasecardConfig {
  return {
    card_type: "RichTextCard",
    body: "<p>World</p>",
    locale: "zh-CN",
    theme: "",
    ...overrides,
  };
}

describe("mountBasecardView (richtext)", () => {
  it("renders sanitized rich text content through the React runtime", () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: createConfig({
        body: '<p>safe</p><script>alert(1)</script>',
      }),
    });

    const surface = container.querySelector(".chips-richtext-card__surface");

    expect(container.querySelector("[data-chips-richtext-view-root='true']")).not.toBeNull();
    expect(surface?.textContent).toContain("safe");
    expect(surface?.innerHTML).not.toContain("script");

    dispose();
  });

  it("keeps the preview shell transparent without outline or rounded card chrome", () => {
    expect(VIEW_STYLE_TEXT).toContain(".chips-richtext-card__surface");
    expect(VIEW_STYLE_TEXT).toContain("background: transparent;");
    expect(VIEW_STYLE_TEXT).toContain("border: 0;");
    expect(VIEW_STYLE_TEXT).toContain("border-radius: 0;");
    expect(VIEW_STYLE_TEXT).toContain("box-shadow: none;");
    expect(VIEW_STYLE_TEXT).not.toContain("border: 1px solid");
    expect(VIEW_STYLE_TEXT).not.toContain("border-radius: 22px;");
    expect(VIEW_STYLE_TEXT).not.toContain("box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);");
  });
});

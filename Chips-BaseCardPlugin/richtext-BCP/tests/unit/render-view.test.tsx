import { describe, expect, it } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

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
});

import { describe, it, expect } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import { mountBasecardEditor } from "../../src/editor/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

function createConfig(overrides?: Partial<BasecardConfig>): BasecardConfig {
  return {
    card_type: "ScoreCard",
    style: "stars",
    score: 1,
    total_score: 5,
    locale: "zh-CN",
    theme: "",
    ...overrides,
  };
}

describe("score basecard integration flow", () => {
  it("updates view when editor emits a valid rating config", () => {
    const container = document.createElement("div");
    const editorContainer = document.createElement("div");

    const initialConfig = createConfig();

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

    const ratingButtons = Array.from(
      editorContainer.querySelectorAll(".chips-score-editor__rating-button"),
    ) as HTMLButtonElement[];

    const fourthButton = ratingButtons[3];
    if (!fourthButton) {
      throw new Error("找不到第四个评分按钮");
    }

    fourthButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const activeSymbols = container.querySelectorAll(".chips-score-card__symbol--active");
    expect(currentConfig.score).toBe(4);
    expect(activeSymbols).toHaveLength(4);
  });
});

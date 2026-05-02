import { describe, it, expect } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";

function createConfig(overrides?: Partial<BasecardConfig>): BasecardConfig {
  return {
    card_type: "ScoreCard",
    style: "stars",
    score: 2,
    total_score: 5,
    locale: "zh-CN",
    theme: "",
    ...overrides,
  };
}

function setNumberInputValue(input: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("createBasecardEditorRoot", () => {
  it("emits five-point symbol scores when a rating button is clicked", () => {
    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig: createConfig(),
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const ratingButtons = Array.from(
      root.querySelectorAll(".chips-score-editor__rating-button"),
    ) as HTMLButtonElement[];

    const fifthButton = ratingButtons[4];
    if (!fifthButton) {
      throw new Error("找不到第五个评分按钮");
    }

    expect(root.querySelectorAll(".chips-score-editor__rating-icon")).toHaveLength(5);

    fifthButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(lastConfig?.score).toBe(5);
    expect(lastConfig?.total_score).toBe(5);
    expect(lastConfig?.card_type).toBe("ScoreCard");
  });

  it("shows numeric inputs for progress style and emits normalized values", () => {
    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig: createConfig({
        style: "score",
        score: 6,
        total_score: 10,
      }),
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const progressButton = Array.from(root.querySelectorAll(".chips-score-editor__segment"))
      .find((button) => button.textContent === "进度条") as HTMLButtonElement | undefined;
    if (!progressButton) {
      throw new Error("找不到进度条样式按钮");
    }

    progressButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const totalInput = root.querySelector(".chips-score-editor__input--total") as HTMLInputElement | null;
    const scoreInput = root.querySelector(".chips-score-editor__input--score") as HTMLInputElement | null;
    if (!totalInput || !scoreInput) {
      throw new Error("找不到分数输入框");
    }

    setNumberInputValue(totalInput, "20");
    setNumberInputValue(scoreInput, "15");

    expect(lastConfig?.style).toBe("progress");
    expect(lastConfig?.total_score).toBe(20);
    expect(lastConfig?.score).toBe(15);
  });
});

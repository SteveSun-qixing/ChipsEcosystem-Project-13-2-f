import { describe, it, expect } from "vitest";
import { mountBasecardEditor } from "../../src/editor/runtime";
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

    const rating = root.querySelector('[data-scope="rating"][data-part="root"]') as HTMLElement | null;
    const ratingButtons = Array.from(
      root.querySelectorAll('[data-scope="rating"][data-part="item"]'),
    ) as HTMLButtonElement[];

    const fifthButton = ratingButtons[4];
    if (!fifthButton) {
      throw new Error("找不到第五个评分按钮");
    }

    expect(rating?.getAttribute("role")).toBe("radiogroup");
    expect(root.querySelectorAll('[data-scope="rating"][data-part="icon"]')).toHaveLength(5);

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

    const progressButton = Array.from(root.querySelectorAll('[data-scope="segmented-control"][data-part="item"]'))
      .find((button) => button.textContent === "进度条") as HTMLButtonElement | undefined;
    if (!progressButton) {
      throw new Error("找不到进度条样式按钮");
    }

    progressButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const numberInputs = Array.from(
      root.querySelectorAll('[data-scope="number-input"][data-part="control"]'),
    ) as HTMLInputElement[];
    const totalInput = numberInputs[0];
    const scoreInput = numberInputs[1];
    if (!totalInput || !scoreInput) {
      throw new Error("找不到分数输入框");
    }

    setNumberInputValue(totalInput, "20");
    setNumberInputValue(scoreInput, "15");

    expect(lastConfig?.style).toBe("progress");
    expect(lastConfig?.total_score).toBe(20);
    expect(lastConfig?.score).toBe(15);
  });

  it("supports keyboard rating updates through ChipsRating", () => {
    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig: createConfig({ score: 2 }),
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const rating = root.querySelector('[data-scope="rating"][data-part="root"]') as HTMLElement | null;
    if (!rating) {
      throw new Error("找不到评分控件");
    }

    rating.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));

    expect(lastConfig?.score).toBe(5);
    expect(lastConfig?.total_score).toBe(5);
  });

  it("supports keyboard style switching through ChipsSegmentedControl", () => {
    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig: createConfig({ style: "stars", score: 2 }),
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const segmented = root.querySelector('[data-scope="segmented-control"][data-part="root"]') as HTMLElement | null;
    if (!segmented) {
      throw new Error("找不到样式切换控件");
    }

    segmented.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));

    expect(lastConfig?.style).toBe("progress");
    expect(lastConfig?.total_score).toBe(5);
  });

  it("restores host document styles and clears the editor root on cleanup", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    document.documentElement.style.height = "77px";
    document.body.style.overflow = "auto";
    container.style.display = "block";
    container.style.width = "33px";

    const dispose = mountBasecardEditor({
      container,
      initialConfig: createConfig(),
      onChange: () => {},
    });

    expect(container.querySelector('[data-chips-basecard-editor-root="true"]')).not.toBeNull();
    expect(document.documentElement.style.height).toBe("100%");
    expect(document.body.style.overflow).toBe("hidden");
    expect(container.style.display).toBe("flex");

    dispose();

    expect(container.childElementCount).toBe(0);
    expect(document.documentElement.style.height).toBe("77px");
    expect(document.body.style.overflow).toBe("auto");
    expect(container.style.display).toBe("block");
    expect(container.style.width).toBe("33px");

    document.body.removeChild(container);
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
  });
});

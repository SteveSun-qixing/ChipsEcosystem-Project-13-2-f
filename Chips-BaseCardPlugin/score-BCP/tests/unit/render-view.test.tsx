import { describe, it, expect } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

function createConfig(overrides?: Partial<BasecardConfig>): BasecardConfig {
  return {
    card_type: "ScoreCard",
    style: "stars",
    score: 0,
    total_score: 5,
    locale: "zh-CN",
    theme: "",
    ...overrides,
  };
}

describe("mountBasecardView", () => {
  it("renders active and inactive stars without an outer shell", () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: createConfig({ score: 3 }),
    });
    const surface = container.querySelector(".chips-score-card__surface") as HTMLElement | null;
    const symbols = Array.from(container.querySelectorAll(".chips-score-card__symbol"));
    const activeSymbols = container.querySelectorAll(".chips-score-card__symbol--active");

    expect(symbols).toHaveLength(5);
    expect(activeSymbols).toHaveLength(3);
    expect(surface).not.toBeNull();
    expect(surface?.classList.contains("chips-score-card__surface--symbols")).toBe(true);
    expect(container.querySelectorAll(".chips-score-card__symbol-icon")).toHaveLength(5);
    expect(surface?.style.backgroundColor).toBe("");
    expect(surface?.style.border).toBe("");

    dispose();
  });

  it("renders score style as a number pair", () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: createConfig({
        style: "score",
        score: 7.5,
        total_score: 10,
      }),
    });

    expect(container.querySelector(".chips-score-card__numeric-score")?.textContent).toBe("7.5");
    expect(container.querySelector(".chips-score-card__numeric-total")?.textContent).toBe("10");

    dispose();
  });

  it("renders progress fill according to score ratio", () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: createConfig({
        style: "progress",
        score: 4,
        total_score: 8,
      }),
    });

    const fill = container.querySelector(".chips-score-card__progress-fill") as HTMLElement | null;
    expect(fill?.style.width).toBe("50%");

    dispose();
  });
});

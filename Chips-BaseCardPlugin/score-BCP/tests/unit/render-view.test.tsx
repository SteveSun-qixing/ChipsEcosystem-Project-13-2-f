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
  it("renders active and inactive stars through ChipsRating without an outer shell", () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: createConfig({ score: 3 }),
    });
    const surface = container.querySelector(".chips-score-card__surface") as HTMLElement | null;
    const rating = container.querySelector('[data-scope="rating"][data-part="root"]') as HTMLElement | null;
    const items = Array.from(container.querySelectorAll('[data-scope="rating"][data-part="item"]'));
    const activeItems = container.querySelectorAll('[data-scope="rating"][data-part="item"][data-active="true"]');

    expect(rating).not.toBeNull();
    expect(rating?.getAttribute("role")).toBe("radiogroup");
    expect(rating?.getAttribute("aria-readonly")).toBe("true");
    expect(items).toHaveLength(5);
    expect(activeItems).toHaveLength(3);
    expect(surface).not.toBeNull();
    expect(surface?.classList.contains("chips-score-card__surface--symbols")).toBe(true);
    expect(container.querySelectorAll('[data-scope="rating"][data-part="icon"]')).toHaveLength(5);
    expect(surface?.style.backgroundColor).toBe("");
    expect(surface?.style.border).toBe("");

    dispose();
    expect(container.childElementCount).toBe(0);
  });

  it("renders hearts through ChipsRating with the heart shape and localized labels", () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: createConfig({ style: "hearts", score: 2 }),
    });
    const rating = container.querySelector('[data-scope="rating"][data-part="root"]') as HTMLElement | null;
    const secondItem = container.querySelectorAll('[data-scope="rating"][data-part="item"]')[1] as HTMLElement | undefined;

    expect(rating?.getAttribute("data-shape")).toBe("heart");
    expect(rating?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(secondItem?.getAttribute("aria-label")).toBe("2 / 5，已获得");

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
    expect(container.querySelectorAll('[data-scope="text"][data-part="root"]')).toHaveLength(3);

    dispose();
  });

  it("renders progress through ChipsProgress according to score ratio", () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: createConfig({
        style: "progress",
        score: 4,
        total_score: 8,
      }),
    });

    const progress = container.querySelector('[data-scope="progress"][data-part="root"]') as HTMLElement | null;
    const range = container.querySelector('[data-scope="progress"][data-part="range"]') as HTMLElement | null;
    expect(progress?.getAttribute("role")).toBe("progressbar");
    expect(progress?.getAttribute("aria-valuenow")).toBe("4");
    expect(progress?.getAttribute("aria-valuemin")).toBe("0");
    expect(progress?.getAttribute("aria-valuemax")).toBe("8");
    expect(progress?.getAttribute("aria-valuetext")).toBe("50%");
    expect(range).not.toBeNull();

    dispose();
  });

  it("injects theme CSS text and removes the mounted view on cleanup", () => {
    const container = document.createElement("div");
    const themeCssText = ":root { --chips-score-test-token: 1; }";

    const dispose = mountBasecardView({
      container,
      config: createConfig({ score: 1 }),
      themeCssText,
    });
    const style = container.querySelector("style");

    expect(style?.textContent).toContain(themeCssText);
    expect(container.querySelector('[data-chips-basecard-view-root="true"]')).not.toBeNull();

    dispose();

    expect(container.childElementCount).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";
import {
  SYMBOL_SCORE_TOTAL,
  normalizeBasecardConfig,
  validateBasecardConfig,
} from "../../src/schema/card-config";

describe("basecard schema", () => {
  it("exports the formal basecard definition contract", () => {
    expect(basecardDefinition.pluginId).toBe("chips.basecard.score");
    expect(basecardDefinition.cardType).toBe("base.score");
    expect(basecardDefinition.aliases).toContain("ScoreCard");
    expect(basecardDefinition.createInitialConfig("base-1")).toMatchObject({
      card_type: "ScoreCard",
      style: "stars",
      total_score: SYMBOL_SCORE_TOTAL,
    });
  });

  it("fills default locale, theme, and five-point symbol scale during normalization", () => {
    const normalized = normalizeBasecardConfig({
      card_type: "ScoreCard",
      style: "hearts",
      score: 3.4,
      total_score: 100,
    });

    expect(normalized).toMatchObject({
      card_type: "ScoreCard",
      style: "hearts",
      score: 3,
      total_score: SYMBOL_SCORE_TOTAL,
      locale: "zh-CN",
      theme: "",
    });
  });

  it("clamps score and total score for numeric styles", () => {
    const normalized = normalizeBasecardConfig({
      card_type: "ScoreCard",
      style: "progress",
      score: 12,
      total_score: 10,
    });

    expect(normalized.score).toBe(10);
    expect(normalized.total_score).toBe(10);
  });

  it("rejects invalid raw score values", () => {
    const result = validateBasecardConfig(
      {
        card_type: "ScoreCard",
        style: "score",
        score: 12,
        total_score: 10,
        theme: "",
        locale: "zh-CN",
      },
    );

    expect(result.valid).toBe(false);
    expect(result.errors.score).toBe("score.validation.scoreMax");
  });
});

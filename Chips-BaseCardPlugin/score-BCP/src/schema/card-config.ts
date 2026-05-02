export type ScoreStyle = "stars" | "hearts" | "score" | "progress";

export interface BasecardConfig {
  card_type: "ScoreCard";
  theme?: string;
  style: ScoreStyle;
  score: number;
  total_score: number;
  locale?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const SYMBOL_SCORE_TOTAL = 5;
export const MIN_TOTAL_SCORE = 1;
export const MAX_TOTAL_SCORE = 100000;

export const scoreStyles: readonly ScoreStyle[] = [
  "stars",
  "hearts",
  "score",
  "progress",
];

export const defaultBasecardConfig: BasecardConfig = {
  card_type: "ScoreCard",
  theme: "",
  style: "stars",
  score: 0,
  total_score: SYMBOL_SCORE_TOTAL,
  locale: "zh-CN",
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isSymbolScoreStyle(style: ScoreStyle): boolean {
  return style === "stars" || style === "hearts";
}

function normalizeScoreStyle(value: unknown): ScoreStyle {
  return scoreStyles.includes(value as ScoreStyle)
    ? (value as ScoreStyle)
    : defaultBasecardConfig.style;
}

function normalizeTotalScore(style: ScoreStyle, value: unknown): number {
  if (isSymbolScoreStyle(style)) {
    return SYMBOL_SCORE_TOTAL;
  }

  return clamp(
    asFiniteNumber(value) ?? defaultBasecardConfig.total_score,
    MIN_TOTAL_SCORE,
    MAX_TOTAL_SCORE,
  );
}

function normalizeScore(style: ScoreStyle, value: unknown, totalScore: number): number {
  const rawScore = clamp(asFiniteNumber(value) ?? defaultBasecardConfig.score, 0, totalScore);

  if (isSymbolScoreStyle(style)) {
    return Math.round(rawScore);
  }

  return rawScore;
}

export function normalizeBasecardConfig(
  input: Partial<BasecardConfig> | Record<string, unknown> | null | undefined,
): BasecardConfig {
  const record = (input ?? {}) as Record<string, unknown>;
  const style = normalizeScoreStyle(record.style);
  const totalScore = normalizeTotalScore(style, record.total_score);
  const score = normalizeScore(style, record.score, totalScore);

  return {
    card_type: "ScoreCard",
    theme: asString(record.theme) ?? defaultBasecardConfig.theme,
    style,
    score,
    total_score: totalScore,
    locale: asString(record.locale) ?? defaultBasecardConfig.locale,
  };
}

export function getScoreRatio(config: Pick<BasecardConfig, "score" | "total_score">): number {
  if (!Number.isFinite(config.total_score) || config.total_score <= 0) {
    return 0;
  }

  return clamp(config.score / config.total_score, 0, 1);
}

export function validateBasecardConfig(config: BasecardConfig): ConfigValidationResult {
  const errors: Record<string, string> = {};

  if (config.card_type !== "ScoreCard") {
    errors.card_type = "score.validation.cardType";
  }

  if (!scoreStyles.includes(config.style)) {
    errors.style = "score.validation.style";
  }

  if (!Number.isFinite(config.total_score) || config.total_score < MIN_TOTAL_SCORE) {
    errors.total_score = "score.validation.totalMin";
  }

  if (config.total_score > MAX_TOTAL_SCORE) {
    errors.total_score = "score.validation.totalMax";
  }

  if (!Number.isFinite(config.score) || config.score < 0) {
    errors.score = "score.validation.scoreMin";
  }

  if (Number.isFinite(config.total_score) && config.score > config.total_score) {
    errors.score = "score.validation.scoreMax";
  }

  if (isSymbolScoreStyle(config.style)) {
    if (config.total_score !== SYMBOL_SCORE_TOTAL) {
      errors.total_score = "score.validation.symbolTotal";
    }

    if (!Number.isInteger(config.score)) {
      errors.score = "score.validation.symbolInteger";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

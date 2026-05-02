import React from "react";
import { getScoreRatio, isSymbolScoreStyle, type BasecardConfig } from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import { ScoreSymbolIcon } from "../shared/score-symbol-icon";

export const VIEW_STYLE_TEXT = `
.chips-score-card {
  width: 100%;
  color: var(--chips-sys-color-on-surface, #0f172a);
  font: 14px/1.5 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-score-card,
.chips-score-card * {
  box-sizing: border-box;
}

.chips-score-card__surface {
  width: 100%;
  min-width: 0;
}

.chips-score-card__surface--symbols {
  display: flex;
  justify-content: center;
}

.chips-score-card__symbols {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
  line-height: 1;
}

.chips-score-card__symbol {
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--chips-sys-color-outline-variant, rgba(15, 23, 42, 0.24));
  line-height: 1;
  transition: color 0.16s ease, transform 0.16s ease;
}

.chips-score-card__symbol-icon {
  display: block;
  width: 34px;
  height: 34px;
}

.chips-score-card__symbol--active {
  color: var(--chips-sys-color-primary, #f59e0b);
}

.chips-score-card__symbol--heart.chips-score-card__symbol--active {
  color: var(--chips-sys-color-error, #e11d48);
}

.chips-score-card__numeric {
  display: inline-flex;
  align-items: baseline;
  min-width: 0;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-score-card__numeric-score {
  font-size: 42px;
  font-weight: 750;
  line-height: 1;
}

.chips-score-card__numeric-separator {
  margin: 0 8px;
  color: var(--chips-sys-color-outline, rgba(15, 23, 42, 0.36));
  font-size: 24px;
  font-weight: 600;
}

.chips-score-card__numeric-total {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 22px;
  font-weight: 650;
}

.chips-score-card__progress {
  display: grid;
  gap: 10px;
  width: 100%;
}

.chips-score-card__progress-track {
  width: 100%;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chips-sys-color-surface-container-highest, rgba(15, 23, 42, 0.12));
}

.chips-score-card__progress-fill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: var(--chips-sys-color-primary, #2563eb);
  transition: width 0.18s ease;
}

.chips-score-card__progress-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
  line-height: 1.3;
}

.chips-score-card__progress-score {
  color: var(--chips-sys-color-on-surface, #0f172a);
  font-weight: 650;
}
`;

export interface BasecardViewProps {
  config: BasecardConfig;
}

function formatNumber(value: number, locale: string | undefined): string {
  return new Intl.NumberFormat(locale ?? "zh-CN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function renderSymbols(config: BasecardConfig, ariaLabel: string) {
  const symbolKind = config.style === "hearts" ? "heart" : "star";
  const roundedScore = Math.round(config.score);

  return (
    <div className="chips-score-card__symbols" role="img" aria-label={ariaLabel}>
      {Array.from({ length: config.total_score }, (_, index) => {
        const active = index < roundedScore;
        return (
          <span
            className={[
              "chips-score-card__symbol",
              config.style === "hearts" ? "chips-score-card__symbol--heart" : "",
              active ? "chips-score-card__symbol--active" : "",
            ].filter(Boolean).join(" ")}
            aria-hidden="true"
            key={index}
          >
            <ScoreSymbolIcon className="chips-score-card__symbol-icon" kind={symbolKind} />
          </span>
        );
      })}
    </div>
  );
}

export function BasecardView({ config }: BasecardViewProps) {
  const t = createTranslator(config.locale);
  const scoreText = formatNumber(config.score, config.locale);
  const totalText = formatNumber(config.total_score, config.locale);
  const ratio = getScoreRatio(config);
  const percentText = formatNumber(ratio * 100, config.locale);
  const ariaLabel = t("score.accessible.value", {
    score: scoreText,
    total: totalText,
  });

  return (
    <div className="chips-score-card" data-card-type={config.card_type} data-score-style={config.style}>
      <div
        className={[
          "chips-score-card__surface",
          isSymbolScoreStyle(config.style) ? "chips-score-card__surface--symbols" : "",
        ].filter(Boolean).join(" ")}
      >
        {isSymbolScoreStyle(config.style) ? renderSymbols(config, ariaLabel) : null}

        {config.style === "score" ? (
          <div className="chips-score-card__numeric" role="img" aria-label={ariaLabel}>
            <span className="chips-score-card__numeric-score">{scoreText}</span>
            <span className="chips-score-card__numeric-separator">/</span>
            <span className="chips-score-card__numeric-total">{totalText}</span>
          </div>
        ) : null}

        {config.style === "progress" ? (
          <div className="chips-score-card__progress" role="img" aria-label={ariaLabel}>
            <div className="chips-score-card__progress-track" aria-hidden="true">
              <div
                className="chips-score-card__progress-fill"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <div className="chips-score-card__progress-meta" aria-hidden="true">
              <span className="chips-score-card__progress-score">
                {scoreText} / {totalText}
              </span>
              <span>{percentText}%</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

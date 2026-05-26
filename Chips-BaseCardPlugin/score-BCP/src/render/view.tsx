import React from "react";
import { ChipsProgress, ChipsRating, ChipsText } from "@chips/component-library";
import { getScoreRatio, isSymbolScoreStyle, type BasecardConfig } from "../schema/card-config";
import { createTranslator } from "../shared/i18n";

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

.chips-score-card__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
  padding: 0;
}

.chips-score-card__rating[data-scope="rating"][data-part="root"] {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--chips-comp-rating-root-gap, var(--chips-layout-gap-xs, 8px));
  min-width: 0;
  width: 100%;
  --chips-comp-rating-item-size: 38px;
}

.chips-score-card__rating[data-scope="rating"][data-part="root"] [data-part="item"] {
  cursor: default;
}

.chips-score-card__rating[data-scope="rating"][data-part="root"] [data-part="item"]:hover {
  background-color: var(--chips-comp-rating-item-surface-idle, transparent);
}

.chips-score-card__rating[data-scope="rating"][data-part="root"] [data-part="item"][data-active="true"],
.chips-score-card__rating[data-scope="rating"][data-part="root"] [data-part="item"][data-state="active"] {
  color: var(--chips-comp-rating-icon-color-active, var(--chips-sys-color-primary, #f59e0b));
}

.chips-score-card__rating[data-scope="rating"][data-part="root"][data-shape="heart"] [data-part="item"][data-active="true"],
.chips-score-card__rating[data-scope="rating"][data-part="root"][data-shape="heart"] [data-part="item"][data-state="active"] {
  color: var(--chips-comp-rating-icon-color-heart-active, var(--chips-sys-color-error, #e11d48));
}

.chips-score-card__numeric {
  display: inline-flex;
  align-items: baseline;
  min-width: 0;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-score-card__numeric-score[data-scope="text"][data-part="root"] {
  font-size: 42px;
  font-weight: 750;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.chips-score-card__numeric-separator[data-scope="text"][data-part="root"] {
  margin: 0 8px;
  color: var(--chips-sys-color-outline, rgba(15, 23, 42, 0.36));
  font-size: 24px;
  font-weight: 600;
}

.chips-score-card__numeric-total[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 22px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.chips-score-card__progress {
  display: grid;
  gap: 10px;
  width: 100%;
}

.chips-score-card__progress-control[data-scope="progress"][data-part="root"] {
  display: grid;
  gap: 6px;
  width: 100%;
}

.chips-score-card__progress-control[data-scope="progress"][data-part="root"] [data-part="track"] {
  position: relative;
  display: block;
  width: 100%;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chips-comp-progress-track-surface, var(--chips-sys-color-surface-container-highest, rgba(15, 23, 42, 0.12)));
}

.chips-score-card__progress-control[data-scope="progress"][data-part="root"] [data-part="range"] {
  display: block;
  height: 100%;
  width: calc(var(--chips-progress-ratio, 0) * 100%);
  min-width: 0;
  border-radius: inherit;
  background: var(--chips-comp-progress-range-surface, var(--chips-sys-color-primary, #2563eb));
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

.chips-score-card__progress-score[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface, #0f172a);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.chips-score-card__progress-percent[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-variant-numeric: tabular-nums;
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

function getRatingShape(config: BasecardConfig): "heart" | "star" {
  return config.style === "hearts" ? "heart" : "star";
}

function getRatingItemLabel(
  config: BasecardConfig,
  t: ReturnType<typeof createTranslator>,
) {
  return (value: number, details: { active: boolean; count: number }) =>
    t(details.active ? "score.rating.item.active" : "score.rating.item.inactive", {
      score: value,
      total: details.count,
    });
}

function renderSymbols(
  config: BasecardConfig,
  ariaLabel: string,
  labelId: string,
  t: ReturnType<typeof createTranslator>,
) {
  const symbolKind = getRatingShape(config);

  return (
    <>
      <span className="chips-score-card__sr-only" id={labelId}>
        {ariaLabel}
      </span>
      <ChipsRating
        ariaLabelledBy={labelId}
        className="chips-score-card__rating"
        count={config.total_score}
        getItemLabel={getRatingItemLabel(config, t)}
        readOnly
        shape={symbolKind}
        value={config.score}
      />
    </>
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
  const progressLabelId = React.useId();
  const ratingLabelId = React.useId();

  return (
    <div className="chips-score-card" data-card-type={config.card_type} data-score-style={config.style}>
      <div
        className={[
          "chips-score-card__surface",
          isSymbolScoreStyle(config.style) ? "chips-score-card__surface--symbols" : "",
        ].filter(Boolean).join(" ")}
      >
        {isSymbolScoreStyle(config.style) ? renderSymbols(config, ariaLabel, ratingLabelId, t) : null}

        {config.style === "score" ? (
          <div className="chips-score-card__numeric" role="img" aria-label={ariaLabel}>
            <ChipsText aria-hidden="true" as="span" className="chips-score-card__numeric-score">
              {scoreText}
            </ChipsText>
            <ChipsText aria-hidden="true" as="span" className="chips-score-card__numeric-separator">
              {t("score.separator")}
            </ChipsText>
            <ChipsText aria-hidden="true" as="span" className="chips-score-card__numeric-total">
              {totalText}
            </ChipsText>
          </div>
        ) : null}

        {config.style === "progress" ? (
          <div className="chips-score-card__progress">
            <span className="chips-score-card__sr-only" id={progressLabelId}>
              {ariaLabel}
            </span>
            <ChipsProgress
              aria-labelledby={progressLabelId}
              className="chips-score-card__progress-control"
              max={config.total_score}
              min={0}
              value={config.score}
              valueText={t("score.progress.percent", { percent: percentText })}
            />
            <div className="chips-score-card__progress-meta" aria-hidden="true">
              <ChipsText as="span" className="chips-score-card__progress-score">
                {scoreText} / {totalText}
              </ChipsText>
              <ChipsText as="span" className="chips-score-card__progress-percent">
                {t("score.progress.percent", { percent: percentText })}
              </ChipsText>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

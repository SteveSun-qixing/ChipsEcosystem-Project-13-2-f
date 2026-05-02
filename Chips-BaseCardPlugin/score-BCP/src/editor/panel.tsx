import React, { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type {
  BasecardResourceImportRequest,
  BasecardResourceImportResult,
} from "../index";
import {
  MAX_TOTAL_SCORE,
  SYMBOL_SCORE_TOTAL,
  getScoreRatio,
  isSymbolScoreStyle,
  normalizeBasecardConfig,
  scoreStyles,
  validateBasecardConfig,
  type BasecardConfig,
  type ScoreStyle,
} from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import { ScoreSymbolIcon } from "../shared/score-symbol-icon";

export interface BasecardEditorProps {
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  importResource?: (
    input: BasecardResourceImportRequest,
  ) => Promise<BasecardResourceImportResult>;
  deleteResource?: (resourcePath: string) => Promise<void>;
}

type EditorRoot = HTMLElement & {
  __chipsDispose?: () => void;
};

const EDITOR_STYLE_TEXT = `
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--chips-sys-color-surface, #ffffff);
}

.chips-basecard-editor {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  color: var(--chips-sys-color-on-surface, #111827);
  background: var(--chips-sys-color-surface, #ffffff);
  font: 14px/1.6 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-basecard-editor,
.chips-basecard-editor * {
  box-sizing: border-box;
}

.chips-score-editor__group {
  display: grid;
  gap: 10px;
}

.chips-score-editor__label {
  color: var(--chips-sys-color-on-surface, #111827);
  font-weight: 600;
}

.chips-score-editor__segmented {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.chips-score-editor__segment,
.chips-score-editor__rating-button {
  min-height: 44px;
  border: 1px solid var(--chips-comp-button-border-color, rgba(15, 23, 42, 0.12));
  border-radius: 10px;
  background: var(--chips-comp-button-container-color, var(--chips-sys-color-surface-container-low, #f8fafc));
  color: var(--chips-comp-button-label-color, var(--chips-sys-color-on-surface, #111827));
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.chips-score-editor__segment:hover,
.chips-score-editor__rating-button:hover,
.chips-score-editor__segment:focus-visible,
.chips-score-editor__rating-button:focus-visible {
  border-color: var(--chips-sys-color-primary, #2563eb);
  outline: none;
  transform: translateY(-1px);
}

.chips-score-editor__segment--active,
.chips-score-editor__rating-button--active {
  border-color: var(--chips-sys-color-primary, #2563eb);
  background: var(--chips-sys-color-primary-container, rgba(37, 99, 235, 0.10));
  color: var(--chips-sys-color-primary, #2563eb);
}

.chips-score-editor__rating {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.chips-score-editor__rating-button {
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--chips-sys-color-outline, rgba(15, 23, 42, 0.38));
  line-height: 1;
}

.chips-score-editor__rating-icon {
  display: block;
  width: 26px;
  height: 26px;
}

.chips-score-editor__rating-button--active {
  color: var(--chips-sys-color-primary, #f59e0b);
}

.chips-score-editor__rating-button--heart.chips-score-editor__rating-button--active {
  color: var(--chips-sys-color-error, #e11d48);
}

.chips-score-editor__number-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.chips-score-editor__field {
  display: grid;
  gap: 8px;
}

.chips-score-editor__input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--chips-comp-input-border-color, rgba(15, 23, 42, 0.16));
  border-radius: 10px;
  background: var(--chips-comp-input-container-color, var(--chips-sys-color-surface, #ffffff));
  color: inherit;
  font: inherit;
  padding: 0 12px;
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.chips-score-editor__input:hover,
.chips-score-editor__input:focus {
  border-color: var(--chips-sys-color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.chips-score-editor__preview {
  display: grid;
  gap: 8px;
}

.chips-score-editor__progress-track {
  width: 100%;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chips-sys-color-surface-container-highest, rgba(15, 23, 42, 0.12));
}

.chips-score-editor__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--chips-sys-color-primary, #2563eb);
}

.chips-score-editor__preview-value {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
  line-height: 1.3;
}

.chips-basecard-editor__errors {
  min-height: 0;
  color: var(--chips-sys-color-error, #d92d20);
  font-size: 13px;
}

.chips-basecard-editor__errors-list {
  margin: 0;
  padding-left: 18px;
}
`;

const styleTranslationKeys: Record<ScoreStyle, string> = {
  stars: "score.style.stars",
  hearts: "score.style.hearts",
  score: "score.style.score",
  progress: "score.style.progress",
};

function formatNumber(value: number, locale: string | undefined): string {
  return new Intl.NumberFormat(locale ?? "zh-CN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function parseNumberInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function BasecardEditor(props: BasecardEditorProps) {
  const [config, setConfig] = useState(() => normalizeBasecardConfig(props.initialConfig));
  const configRef = useRef(config);
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    validateBasecardConfig(normalizeBasecardConfig(props.initialConfig)).errors
  );
  const t = createTranslator(config.locale);
  const symbolKind = config.style === "hearts" ? "heart" : "star";
  const ratio = useMemo(() => getScoreRatio(config), [config]);
  const formattedScore = formatNumber(config.score, config.locale);
  const formattedTotal = formatNumber(config.total_score, config.locale);

  useEffect(() => {
    const next = normalizeBasecardConfig(props.initialConfig);
    configRef.current = next;
    setConfig(next);
    setErrors(validateBasecardConfig(next).errors);
  }, [props.initialConfig]);

  function updateConfig(patch: Partial<BasecardConfig>) {
    const next = normalizeBasecardConfig({
      ...configRef.current,
      ...patch,
    });
    const validation = validateBasecardConfig(next);
    configRef.current = next;
    setConfig(next);
    setErrors(validation.errors);
    if (validation.valid) {
      props.onChange(next);
    }
  }

  return (
    <div className="chips-basecard-editor chips-basecard-editor--standard">
      <section className="chips-score-editor__group" aria-labelledby="chips-score-style-label">
        <div className="chips-score-editor__label" id="chips-score-style-label">
          {t("score.style")}
        </div>
        <div className="chips-score-editor__segmented" role="radiogroup" aria-labelledby="chips-score-style-label">
          {scoreStyles.map((style) => (
            <button
              type="button"
              className={[
                "chips-score-editor__segment",
                style === config.style ? "chips-score-editor__segment--active" : "",
              ].filter(Boolean).join(" ")}
              aria-checked={style === config.style}
              key={style}
              role="radio"
              onClick={() => {
                updateConfig({
                  style,
                  total_score: isSymbolScoreStyle(style) ? SYMBOL_SCORE_TOTAL : config.total_score,
                });
              }}
            >
              {t(styleTranslationKeys[style])}
            </button>
          ))}
        </div>
      </section>

      <section className="chips-score-editor__group" aria-labelledby="chips-score-value-label">
        <div className="chips-score-editor__label" id="chips-score-value-label">
          {t("score.earnedScore")}
        </div>

        {isSymbolScoreStyle(config.style) ? (
          <div className="chips-score-editor__rating" role="radiogroup" aria-labelledby="chips-score-value-label">
            {Array.from({ length: SYMBOL_SCORE_TOTAL }, (_, index) => {
              const score = index + 1;
              const active = score <= config.score;
              return (
                <button
                  type="button"
                  className={[
                    "chips-score-editor__rating-button",
                    config.style === "hearts" ? "chips-score-editor__rating-button--heart" : "",
                    active ? "chips-score-editor__rating-button--active" : "",
                  ].filter(Boolean).join(" ")}
                  aria-checked={score === config.score}
                  aria-label={t("score.setScore", { score })}
                  key={score}
                  role="radio"
                  onClick={() => {
                    updateConfig({ score, total_score: SYMBOL_SCORE_TOTAL });
                  }}
                >
                  <ScoreSymbolIcon className="chips-score-editor__rating-icon" kind={symbolKind} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="chips-score-editor__number-grid">
            <label className="chips-score-editor__field">
              <span className="chips-score-editor__label">{t("score.totalScore")}</span>
              <input
                type="number"
                className="chips-score-editor__input chips-score-editor__input--total"
                min="1"
                max={MAX_TOTAL_SCORE}
                step="0.1"
                value={config.total_score}
                onInput={(event) => {
                  updateConfig({ total_score: parseNumberInput(event.currentTarget.value) });
                }}
              />
            </label>

            <label className="chips-score-editor__field">
              <span className="chips-score-editor__label">{t("score.scoreValue")}</span>
              <input
                type="number"
                className="chips-score-editor__input chips-score-editor__input--score"
                min="0"
                max={config.total_score}
                step="0.1"
                value={config.score}
                onInput={(event) => {
                  updateConfig({ score: parseNumberInput(event.currentTarget.value) });
                }}
              />
            </label>
          </div>
        )}

        {config.style === "progress" ? (
          <div className="chips-score-editor__preview" aria-label={t("score.accessible.value", {
            score: formattedScore,
            total: formattedTotal,
          })}>
            <div className="chips-score-editor__progress-track" aria-hidden="true">
              <div
                className="chips-score-editor__progress-fill"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <div className="chips-score-editor__preview-value" aria-hidden="true">
              {formattedScore} / {formattedTotal}
            </div>
          </div>
        ) : null}

        <div className="chips-basecard-editor__errors">
          {Object.keys(errors).length > 0 ? (
            <ul className="chips-basecard-editor__errors-list">
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>{t(message, { max: MAX_TOTAL_SCORE })}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function createBasecardEditorRoot(props: BasecardEditorProps): HTMLElement {
  const rootElement = document.createElement("div") as EditorRoot;
  rootElement.setAttribute("data-chips-basecard-editor-root", "true");
  rootElement.style.width = "100%";
  rootElement.style.height = "100%";
  rootElement.style.minHeight = "0";

  const reactRoot: Root = createRoot(rootElement);

  flushSync(() => {
    reactRoot.render(
      <>
        <style>{EDITOR_STYLE_TEXT}</style>
        <BasecardEditor {...props} />
      </>,
    );
  });

  rootElement.__chipsDispose = () => {
    reactRoot.unmount();
  };

  return rootElement;
}

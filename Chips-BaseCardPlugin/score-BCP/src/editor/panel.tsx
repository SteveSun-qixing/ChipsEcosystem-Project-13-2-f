import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChipsNumberInput,
  ChipsProgress,
  ChipsRating,
  ChipsSegmentedControl,
  ChipsText,
} from "@chips/component-library";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type {
  BasecardArchiveImportRequest,
  BasecardArchiveImportResult,
  BasecardResourceImportRequest,
  BasecardResourceImportResult,
  BasecardTiffToPngRequest,
  BasecardTiffToPngResult,
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

export interface BasecardEditorProps {
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  importResource?: (
    input: BasecardResourceImportRequest,
  ) => Promise<BasecardResourceImportResult>;
  importArchiveBundle?: (
    input: BasecardArchiveImportRequest,
  ) => Promise<BasecardArchiveImportResult>;
  deleteResource?: (resourcePath: string) => Promise<void>;
  convertTiffToPng?: (input: BasecardTiffToPngRequest) => Promise<BasecardTiffToPngResult>;
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

.chips-score-editor__label[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface, #111827);
  font-weight: 650;
}

.chips-score-editor__segmented[data-scope="segmented-control"][data-part="root"] {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--chips-layout-gap-xs, 8px);
  width: 100%;
}

.chips-score-editor__segmented[data-scope="segmented-control"][data-part="root"] [data-part="item"] {
  min-height: var(--chips-layout-density-comfortable, 44px);
}

.chips-score-editor__rating[data-scope="rating"][data-part="root"] {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--chips-layout-gap-xs, 8px);
  width: 100%;
  --chips-comp-rating-item-size: var(--chips-layout-density-comfortable, 44px);
}

.chips-score-editor__rating[data-scope="rating"][data-part="root"] [data-part="item"] {
  width: 100%;
}

.chips-score-editor__number-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.chips-score-editor__number-grid [data-scope="number-input"][data-part="root"] {
  display: grid;
  gap: 8px;
}

.chips-score-editor__number-grid [data-scope="number-input"][data-part="control"] {
  width: 100%;
  min-height: var(--chips-layout-density-comfortable, 44px);
}

.chips-score-editor__preview {
  display: grid;
  gap: 8px;
}

.chips-score-editor__preview [data-scope="progress"][data-part="root"] {
  display: grid;
  gap: 6px;
  width: 100%;
}

.chips-score-editor__preview [data-scope="progress"][data-part="track"] {
  position: relative;
  display: block;
  width: 100%;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chips-comp-progress-track-surface, var(--chips-sys-color-surface-container-highest, rgba(15, 23, 42, 0.12)));
}

.chips-score-editor__preview [data-scope="progress"][data-part="range"] {
  display: block;
  width: calc(var(--chips-progress-ratio, 0) * 100%);
  height: 100%;
  border-radius: inherit;
  background: var(--chips-comp-progress-range-surface, var(--chips-sys-color-primary, #2563eb));
}

.chips-score-editor__preview-value[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

.chips-score-editor__sr-only {
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

function getRatingShape(config: BasecardConfig): "heart" | "star" {
  return config.style === "hearts" ? "heart" : "star";
}

function BasecardEditor(props: BasecardEditorProps) {
  const [config, setConfig] = useState(() => normalizeBasecardConfig(props.initialConfig));
  const configRef = useRef(config);
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    validateBasecardConfig(normalizeBasecardConfig(props.initialConfig)).errors
  );
  const t = createTranslator(config.locale);
  const ratio = useMemo(() => getScoreRatio(config), [config]);
  const formattedScore = formatNumber(config.score, config.locale);
  const formattedTotal = formatNumber(config.total_score, config.locale);
  const progressPercent = formatNumber(ratio * 100, config.locale);
  const styleLabelId = React.useId();
  const valueLabelId = React.useId();
  const previewLabelId = React.useId();

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

  const styleOptions = scoreStyles.map((style) => ({
    value: style,
    label: t(styleTranslationKeys[style]),
  }));

  const scoreValueText = t("score.accessible.value", {
    score: formattedScore,
    total: formattedTotal,
  });

  return (
    <div className="chips-basecard-editor chips-basecard-editor--standard">
      <section className="chips-score-editor__group" aria-labelledby={styleLabelId}>
        <ChipsText as="div" className="chips-score-editor__label" id={styleLabelId}>
          {t("score.style")}
        </ChipsText>
        <ChipsSegmentedControl
          ariaLabelledBy={styleLabelId}
          className="chips-score-editor__segmented"
          options={styleOptions}
          value={config.style}
          onValueChange={(value) => {
            const style = value as ScoreStyle;
            updateConfig({
              style,
              total_score: isSymbolScoreStyle(style) ? SYMBOL_SCORE_TOTAL : config.total_score,
            });
          }}
        />
      </section>

      <section className="chips-score-editor__group" aria-labelledby={valueLabelId}>
        <ChipsText as="div" className="chips-score-editor__label" id={valueLabelId}>
          {t("score.earnedScore")}
        </ChipsText>

        {isSymbolScoreStyle(config.style) ? (
          <ChipsRating
            ariaLabelledBy={valueLabelId}
            className="chips-score-editor__rating"
            count={SYMBOL_SCORE_TOTAL}
            getItemLabel={(value) => t("score.setScore", { score: value })}
            shape={getRatingShape(config)}
            value={config.score}
            onValueChange={(score) => {
              updateConfig({ score, total_score: SYMBOL_SCORE_TOTAL });
            }}
          />
        ) : (
          <div className="chips-score-editor__number-grid">
            <ChipsNumberInput
              decrementLabel={t("score.totalScore.decrement")}
              incrementLabel={t("score.totalScore.increment")}
              label={t("score.totalScore")}
              max={MAX_TOTAL_SCORE}
              min={1}
              step={0.1}
              value={config.total_score}
              onInputChange={(value) => {
                updateConfig({ total_score: parseNumberInput(value) });
              }}
              onValueChange={(value) => {
                updateConfig({ total_score: value ?? 1 });
              }}
            />
            <ChipsNumberInput
              decrementLabel={t("score.scoreValue.decrement")}
              incrementLabel={t("score.scoreValue.increment")}
              label={t("score.scoreValue")}
              max={config.total_score}
              min={0}
              step={0.1}
              value={config.score}
              onInputChange={(value) => {
                updateConfig({ score: parseNumberInput(value) });
              }}
              onValueChange={(value) => {
                updateConfig({ score: value ?? 0 });
              }}
            />
          </div>
        )}

        {config.style === "progress" ? (
          <div className="chips-score-editor__preview">
            <span className="chips-score-editor__sr-only" id={previewLabelId}>
              {t("score.progressPreview", {
                score: formattedScore,
                total: formattedTotal,
                percent: progressPercent,
              })}
            </span>
            <ChipsProgress
              aria-labelledby={previewLabelId}
              max={config.total_score}
              min={0}
              value={config.score}
              valueText={t("score.progress.percent", { percent: progressPercent })}
            />
            <ChipsText aria-hidden="true" as="div" className="chips-score-editor__preview-value">
              {formattedScore} / {formattedTotal}
            </ChipsText>
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

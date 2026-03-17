import React, { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type {
  BasecardResourceImportRequest,
  BasecardResourceImportResult,
} from "../index";
import {
  normalizeBasecardConfig,
  validateBasecardConfig,
  type BasecardConfig,
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
  gap: 14px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  color: var(--chips-sys-color-on-surface, #111827);
  background:
    radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 42%),
    var(--chips-sys-color-surface, #ffffff);
  font: 14px/1.6 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-basecard-editor,
.chips-basecard-editor * {
  box-sizing: border-box;
}

.chips-basecard-editor__form {
  display: grid;
  gap: 14px;
}

.chips-basecard-editor__label {
  display: grid;
  gap: 8px;
  font-weight: 600;
}

.chips-basecard-editor__input,
.chips-basecard-editor__textarea {
  width: 100%;
  border: 1px solid var(--chips-comp-card-shell-border-color, rgba(15, 23, 42, 0.12));
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  color: inherit;
  font: inherit;
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.chips-basecard-editor__input {
  min-height: 44px;
  padding: 0 14px;
}

.chips-basecard-editor__textarea {
  min-height: 180px;
  padding: 12px 14px;
  resize: vertical;
}

.chips-basecard-editor__input:hover,
.chips-basecard-editor__textarea:hover,
.chips-basecard-editor__input:focus,
.chips-basecard-editor__textarea:focus {
  border-color: rgba(37, 99, 235, 0.5);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
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

function BasecardEditor(props: BasecardEditorProps) {
  const [config, setConfig] = useState(() => normalizeBasecardConfig(props.initialConfig));
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    validateBasecardConfig(normalizeBasecardConfig(props.initialConfig)).errors
  );
  const t = createTranslator(config.locale);

  useEffect(() => {
    const next = normalizeBasecardConfig(props.initialConfig);
    setConfig(next);
    setErrors(validateBasecardConfig(next).errors);
  }, [props.initialConfig]);

  function updateConfig(patch: Partial<BasecardConfig>) {
    const next = normalizeBasecardConfig({
      ...config,
      ...patch,
    });
    const validation = validateBasecardConfig(next);
    setConfig(next);
    setErrors(validation.errors);
    if (validation.valid) {
      props.onChange(next);
    }
  }

  return (
    <div className="chips-basecard-editor chips-basecard-editor--standard">
      <form className="chips-basecard-editor__form">
        <label className="chips-basecard-editor__label">
          <span>{t("basecard.title")}</span>
          <input
            type="text"
            className="chips-basecard-editor__input"
            value={config.title}
            placeholder={t("basecard.placeholder.title")}
            onInput={(event) => {
              updateConfig({ title: event.currentTarget.value });
            }}
          />
        </label>

        <label className="chips-basecard-editor__label">
          <span>{t("basecard.body")}</span>
          <textarea
            className="chips-basecard-editor__textarea"
            value={config.body}
            placeholder={t("basecard.placeholder.body")}
            onInput={(event) => {
              updateConfig({ body: event.currentTarget.value });
            }}
          />
        </label>

        <div className="chips-basecard-editor__errors">
          {Object.keys(errors).length > 0 ? (
            <ul className="chips-basecard-editor__errors-list">
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </form>
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

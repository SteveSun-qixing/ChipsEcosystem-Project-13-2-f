import React, { useEffect, useRef, useState } from "react";
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
  gap: 16px;
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

.chips-basecard-editor__form {
  display: grid;
  gap: 16px;
}

.chips-basecard-editor__label {
  display: grid;
  gap: 8px;
}

.chips-basecard-editor__label-text {
  color: var(--chips-sys-color-on-surface, #111827);
  font-weight: 600;
}

.chips-basecard-editor__input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--chips-comp-input-border-color, rgba(15, 23, 42, 0.16));
  border-radius: 8px;
  background: var(--chips-comp-input-container-color, var(--chips-sys-color-surface, #ffffff));
  color: inherit;
  font: inherit;
  outline: none;
  padding: 0 12px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.chips-basecard-editor__input:hover,
.chips-basecard-editor__input:focus {
  border-color: var(--chips-sys-color-primary, #2563eb);
  box-shadow: 0 0 0 3px var(--chips-sys-color-primary-container, rgba(37, 99, 235, 0.12));
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
  const configRef = useRef(config);
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    validateBasecardConfig(normalizeBasecardConfig(props.initialConfig)).errors
  );
  const t = createTranslator(config.locale);

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
      <form
        className="chips-basecard-editor__form"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label className="chips-basecard-editor__label">
          <span className="chips-basecard-editor__label-text">{t("hyperlink.anchorText")}</span>
          <input
            type="text"
            className="chips-basecard-editor__input"
            value={config.anchor_text}
            placeholder={t("hyperlink.placeholder.anchorText")}
            aria-invalid={Boolean(errors.anchor_text)}
            onInput={(event) => {
              updateConfig({ anchor_text: event.currentTarget.value });
            }}
          />
        </label>

        <label className="chips-basecard-editor__label">
          <span className="chips-basecard-editor__label-text">{t("hyperlink.url")}</span>
          <input
            type="url"
            className="chips-basecard-editor__input"
            value={config.url}
            placeholder={t("hyperlink.placeholder.url")}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.url)}
            onInput={(event) => {
              updateConfig({ url: event.currentTarget.value });
            }}
          />
        </label>

        <div className="chips-basecard-editor__errors">
          {Object.keys(errors).length > 0 ? (
            <ul className="chips-basecard-editor__errors-list">
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>{t(message)}</li>
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

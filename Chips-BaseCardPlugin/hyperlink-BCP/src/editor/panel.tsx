import React, { useEffect, useRef, useState } from "react";
import {
  ChipsBadge,
  ChipsButton,
  ChipsForm,
  ChipsSegmentedControl,
  ChipsSwitch,
  ChipsTextArea,
  ChipsTextField,
  ChipsTooltip,
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
  normalizeBasecardConfig,
  validateBasecardConfig,
  type BasecardConfig,
  type HyperlinkDisplayDensity,
  type HyperlinkOpenMode,
} from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import { analyzeHyperlinkUrl } from "../shared/utils";

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

.chips-basecard-editor__section {
  display: grid;
  gap: 16px;
  margin: 0;
}

.chips-basecard-editor__section-title {
  margin: 0;
  color: var(--chips-sys-color-on-surface, #111827);
  font-size: 15px;
  font-weight: 600;
}

.chips-basecard-editor [data-scope="text-field"][data-part="root"],
.chips-basecard-editor [data-scope="text-area"][data-part="root"] {
  display: grid;
  gap: 8px;
}

.chips-basecard-editor [data-scope="text-field"][data-part="label"],
.chips-basecard-editor [data-scope="text-area"][data-part="label"] {
  color: var(--chips-sys-color-on-surface, #111827);
  font-weight: 600;
}

.chips-basecard-editor [data-scope="text-field"][data-part="control"],
.chips-basecard-editor [data-scope="text-area"][data-part="control"],
.chips-basecard-editor__select {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--chips-comp-text-field.root.border, var(--chips-sys-color-outline, rgba(15, 23, 42, 0.16)));
  border-radius: 8px;
  background: var(--chips-comp-text-field.root.surface, var(--chips-sys-color-surface, #ffffff));
  color: inherit;
  font: inherit;
  outline: none;
  padding: 0 12px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.chips-basecard-editor [data-scope="text-area"][data-part="control"] {
  min-height: 92px;
  padding-block: 10px;
  resize: vertical;
}

.chips-basecard-editor [data-scope="text-field"][data-part="control"]:hover,
.chips-basecard-editor [data-scope="text-field"][data-part="control"]:focus,
.chips-basecard-editor [data-scope="text-area"][data-part="control"]:hover,
.chips-basecard-editor [data-scope="text-area"][data-part="control"]:focus,
.chips-basecard-editor__select:hover,
.chips-basecard-editor__select:focus {
  border-color: var(--chips-sys-color-primary, #2563eb);
  box-shadow: 0 0 0 3px var(--chips-sys-color-primary-container, rgba(37, 99, 235, 0.12));
}

.chips-basecard-editor [data-scope="text-field"][data-part="description"],
.chips-basecard-editor [data-scope="text-area"][data-part="description"],
.chips-basecard-editor [data-scope="form"][data-part="hint"] {
  margin: 0;
  color: var(--chips-sys-color-on-surface-variant, #667085);
  font-size: 12px;
  line-height: 1.5;
}

.chips-basecard-editor [data-scope="text-field"][data-part="status"],
.chips-basecard-editor [data-scope="text-area"][data-part="status"],
.chips-basecard-editor [data-scope="form"][data-part="error"] {
  margin: 0;
  color: var(--chips-sys-color-error, #d92d20);
  font-size: 12px;
  line-height: 1.5;
}

.chips-basecard-editor__field {
  display: grid;
  gap: 8px;
}

.chips-basecard-editor__field-label {
  color: var(--chips-sys-color-on-surface, #111827);
  font-weight: 600;
}

.chips-basecard-editor__switch-row,
.chips-basecard-editor__security-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chips-basecard-editor__switch-copy,
.chips-basecard-editor__security-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.chips-basecard-editor__switch-title,
.chips-basecard-editor__security-title {
  font-weight: 600;
}

.chips-basecard-editor__switch-description,
.chips-basecard-editor__security-description {
  color: var(--chips-sys-color-on-surface-variant, #667085);
  font-size: 12px;
  line-height: 1.5;
}

.chips-basecard-editor [data-scope="switch"][data-part="root"] {
  flex: 0 0 auto;
}

.chips-basecard-editor__segmented [data-scope="segmented-control"][data-part="root"] {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chips-basecard-editor__segmented [data-scope="segmented-control"][data-part="item"] {
  min-height: 36px;
  border: 1px solid var(--chips-sys-color-outline, rgba(15, 23, 42, 0.18));
  border-radius: 8px;
  background: var(--chips-sys-color-surface, #ffffff);
  color: var(--chips-sys-color-on-surface, #111827);
  padding: 0 12px;
}

.chips-basecard-editor__segmented [data-scope="segmented-control"][data-part="item"][aria-checked="true"],
.chips-basecard-editor__segmented [data-scope="segmented-control"][data-part="item"][data-checked="true"] {
  border-color: var(--chips-sys-color-primary, #2563eb);
  background: var(--chips-sys-color-primary-container, rgba(37, 99, 235, 0.12));
  color: var(--chips-sys-color-primary, #2563eb);
}

.chips-basecard-editor__security-row {
  border: 1px solid var(--chips-sys-color-outline-variant, rgba(15, 23, 42, 0.12));
  border-radius: 8px;
  padding: 12px;
  background: var(--chips-sys-color-surface-container-low, rgba(15, 23, 42, 0.04));
}

.chips-basecard-editor [data-scope="badge"][data-part="root"] {
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}

.chips-basecard-editor [data-scope="badge"][data-tone="success"] {
  background: var(--chips-sys-color-success-surface, rgba(12, 126, 67, 0.12));
  color: var(--chips-sys-color-success, #0c7e43);
}

.chips-basecard-editor [data-scope="badge"][data-tone="warning"] {
  background: var(--chips-sys-color-warning-surface, rgba(181, 102, 0, 0.12));
  color: var(--chips-sys-color-warning, #b56600);
}

.chips-basecard-editor [data-scope="badge"][data-tone="error"] {
  background: var(--chips-sys-color-error-surface, rgba(217, 45, 32, 0.12));
  color: var(--chips-sys-color-error, #d92d20);
}

.chips-basecard-editor [data-scope="tooltip"][data-part="root"] {
  position: relative;
  display: inline-flex;
}

.chips-basecard-editor [data-scope="tooltip"][data-part="trigger"] {
  min-width: 28px;
  min-height: 28px;
  border: 1px solid var(--chips-sys-color-outline, rgba(15, 23, 42, 0.18));
  border-radius: 999px;
  background: transparent;
  color: var(--chips-sys-color-on-surface-variant, #667085);
}

.chips-basecard-editor [data-scope="tooltip"][data-part="content"] {
  position: absolute;
  z-index: 2;
  top: calc(100% + 6px);
  right: 0;
  width: min(260px, 70vw);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--chips-sys-color-inverse-surface, #111827);
  color: var(--chips-sys-color-inverse-on-surface, #ffffff);
  font-size: 12px;
  line-height: 1.5;
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

function getErrorMessage(errors: Record<string, string>, field: string, t: ReturnType<typeof createTranslator>): string | null {
  const key = errors[field];
  return key ? t(key) : null;
}

function getSecurityLabelKey(reason: string): string {
  if (reason === "secure") {
    return "hyperlink.security.secure";
  }

  if (reason === "insecure-http") {
    return "hyperlink.security.insecureHttp";
  }

  if (reason === "empty") {
    return "hyperlink.security.empty";
  }

  if (reason === "credentials-blocked") {
    return "hyperlink.security.credentialsBlocked";
  }

  return "hyperlink.security.blocked";
}

function getSecurityTone(reason: string): "success" | "warning" | "error" {
  if (reason === "secure") {
    return "success";
  }

  if (reason === "insecure-http") {
    return "warning";
  }

  return "error";
}

function createOpenModeOptions(t: ReturnType<typeof createTranslator>) {
  return [
    { value: "external-browser", label: t("hyperlink.openMode.external-browser") },
    { value: "resource-router", label: t("hyperlink.openMode.resource-router") },
  ];
}

function createDensityOptions(t: ReturnType<typeof createTranslator>) {
  return [
    { value: "compact", label: t("hyperlink.density.compact") },
    { value: "comfortable", label: t("hyperlink.density.comfortable") },
    { value: "spacious", label: t("hyperlink.density.spacious") },
  ];
}

function BasecardEditor(props: BasecardEditorProps) {
  const [config, setConfig] = useState(() => normalizeBasecardConfig(props.initialConfig));
  const configRef = useRef(config);
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    validateBasecardConfig(normalizeBasecardConfig(props.initialConfig)).errors
  );
  const t = createTranslator(config.locale);
  const urlAnalysis = analyzeHyperlinkUrl(config.url);
  const securityText = t(getSecurityLabelKey(urlAnalysis.reason));

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
      <ChipsForm
        className="chips-basecard-editor__form"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <section className="chips-basecard-editor__section" aria-labelledby="chips-hyperlink-editor-content-title">
          <h2 id="chips-hyperlink-editor-content-title" className="chips-basecard-editor__section-title">
            {t("hyperlink.editor.contentSection")}
          </h2>
          <ChipsTextField
            value={config.anchor_text}
            label={t("hyperlink.anchorText")}
            placeholder={t("hyperlink.placeholder.anchorText")}
            error={getErrorMessage(errors, "anchor_text", t)}
            required
            onValueChange={(value) => {
              updateConfig({ anchor_text: value });
            }}
          />

          <ChipsTextField
            value={config.url}
            label={t("hyperlink.url")}
            placeholder={t("hyperlink.placeholder.url")}
            description={t("hyperlink.description.url")}
            error={getErrorMessage(errors, "url", t)}
            required
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onValueChange={(value) => {
              updateConfig({ url: value });
            }}
          />

          <ChipsTextArea
            value={config.description}
            label={t("hyperlink.description")}
            placeholder={t("hyperlink.placeholder.description")}
            description={t("hyperlink.description.description")}
            rows={3}
            onValueChange={(value) => {
              updateConfig({ description: value });
            }}
          />
        </section>

        <section className="chips-basecard-editor__section" aria-labelledby="chips-hyperlink-editor-display-title">
          <h2 id="chips-hyperlink-editor-display-title" className="chips-basecard-editor__section-title">
            {t("hyperlink.editor.displaySection")}
          </h2>

          <ChipsTextField
            value={config.icon_url}
            label={t("hyperlink.iconUrl")}
            placeholder={t("hyperlink.placeholder.iconUrl")}
            description={t("hyperlink.description.iconUrl")}
            error={getErrorMessage(errors, "icon_url", t)}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onValueChange={(value) => {
              updateConfig({ icon_url: value });
            }}
          />

          <div className="chips-basecard-editor__field">
            <span className="chips-basecard-editor__field-label">
              {t("hyperlink.openMode")}
            </span>
            <div className="chips-basecard-editor__segmented">
              <ChipsSegmentedControl
                value={config.open_mode}
                ariaLabel={t("hyperlink.openMode")}
                options={createOpenModeOptions(t)}
                onValueChange={(value) => {
                  updateConfig({ open_mode: value as HyperlinkOpenMode });
                }}
              />
            </div>
            <p className="chips-basecard-editor__switch-description">
              {t("hyperlink.description.openMode")}
            </p>
          </div>

          <div className="chips-basecard-editor__field">
            <span className="chips-basecard-editor__field-label">
              {t("hyperlink.displayDensity")}
            </span>
            <div className="chips-basecard-editor__segmented">
              <ChipsSegmentedControl
                value={config.display_density}
                ariaLabel={t("hyperlink.displayDensity")}
                options={createDensityOptions(t)}
                onValueChange={(value) => {
                  updateConfig({ display_density: value as HyperlinkDisplayDensity });
                }}
              />
            </div>
          </div>

          <div className="chips-basecard-editor__switch-row">
            <span className="chips-basecard-editor__switch-copy">
              <span className="chips-basecard-editor__switch-title">{t("hyperlink.securityHint")}</span>
              <span className="chips-basecard-editor__switch-description">
                {t("hyperlink.description.securityHint")}
              </span>
            </span>
            <ChipsSwitch
              checked={config.show_security_hint}
              label={t("hyperlink.securityHint")}
              onCheckedChange={(checked) => {
                updateConfig({ show_security_hint: checked });
              }}
            />
          </div>
        </section>

        <section className="chips-basecard-editor__section" aria-labelledby="chips-hyperlink-editor-security-title">
          <h2 id="chips-hyperlink-editor-security-title" className="chips-basecard-editor__section-title">
            {t("hyperlink.editor.securitySection")}
          </h2>
          <div className="chips-basecard-editor__security-row">
            <span className="chips-basecard-editor__security-copy">
              <span className="chips-basecard-editor__security-title">{securityText}</span>
              <span className="chips-basecard-editor__security-description">
                {t("hyperlink.security.description", {
                  url: urlAnalysis.normalizedUrl || urlAnalysis.input || t("hyperlink.view.emptyUrl"),
                })}
              </span>
            </span>
            <span className="chips-basecard-editor__switch-row">
              <ChipsBadge tone={getSecurityTone(urlAnalysis.reason)}>
                {securityText}
              </ChipsBadge>
              <ChipsTooltip
                triggerContent="?"
                content={t("hyperlink.security.tooltip")}
              />
            </span>
          </div>
        </section>

        <div className="chips-basecard-editor__errors" aria-live="polite">
          {Object.keys(errors).length > 0 ? (
            <ul className="chips-basecard-editor__errors-list">
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>{t(message)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </ChipsForm>
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

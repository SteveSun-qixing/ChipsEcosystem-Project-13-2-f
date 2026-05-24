import React, { useEffect, useState } from "react";
import {
  ChipsBox,
  ChipsErrorState,
  ChipsForm,
  ChipsStack,
  ChipsTextArea,
  ChipsTextField,
  type StandardErrorLike,
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
} from "../schema/card-config";
import { createBasecardText } from "../shared/i18n";

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
  convertTiffToPng?: (
    input: BasecardTiffToPngRequest,
  ) => Promise<BasecardTiffToPngResult>;
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
}

.chips-basecard-editor {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: var(--chips-comp-basecard-editor-padding, var(--chips-sys-space-4));
}

.chips-basecard-editor,
.chips-basecard-editor * {
  box-sizing: border-box;
}

.chips-basecard-editor__form {
  width: 100%;
}

.chips-basecard-editor__field {
  min-width: 0;
}
`;

function toStandardError(errorKey: string | undefined): StandardErrorLike | null {
  if (!errorKey) {
    return null;
  }

  return {
    code: errorKey,
    message: errorKey,
  };
}

function BasecardEditor(props: BasecardEditorProps) {
  const [config, setConfig] = useState(() => normalizeBasecardConfig(props.initialConfig));
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    validateBasecardConfig(normalizeBasecardConfig(props.initialConfig)).errors
  );
  const t = createBasecardText(config.locale);
  const i18n = {
    translate(
      input: string | { key: string; params?: Record<string, string | number> },
      params?: Record<string, string | number>,
    ) {
      return typeof input === "string" ? t(input, params) : t(input.key, input.params);
    },
  };
  const titleError = toStandardError(errors.title);
  const bodyError = toStandardError(errors.body);
  const firstError = toStandardError(Object.values(errors)[0]);

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
    <ChipsBox
      as="section"
      className="chips-basecard-editor chips-basecard-editor--standard"
      aria-label={t("basecard.editor.ariaLabel")}
    >
      <ChipsForm.Root
        className="chips-basecard-editor__form"
        aria-label={t("basecard.editor.ariaLabel")}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <ChipsStack gap="var(--chips-comp-form-section-gap, var(--chips-sys-space-3))">
          <ChipsForm.Field
            className="chips-basecard-editor__field"
            name="title"
            error={titleError}
            required
          >
            <ChipsTextField
              value={config.title}
              labelKey="basecard.field.title.label"
              ariaLabel={t("basecard.field.title.ariaLabel")}
              ariaLabelKey="basecard.field.title.ariaLabel"
              placeholder={t("basecard.field.title.placeholder")}
              i18n={i18n}
              error={titleError ? {
                ...titleError,
                message: t(titleError.message),
              } : null}
              required
              onValueChange={(value) => {
                updateConfig({ title: value });
              }}
            />
            <ChipsForm.Error>
              {titleError ? t(titleError.message) : null}
            </ChipsForm.Error>
          </ChipsForm.Field>

          <ChipsForm.Field
            className="chips-basecard-editor__field"
            name="body"
            error={bodyError}
            required
          >
            <ChipsTextArea
              value={config.body}
              labelKey="basecard.field.body.label"
              ariaLabel={t("basecard.field.body.ariaLabel")}
              ariaLabelKey="basecard.field.body.ariaLabel"
              placeholder={t("basecard.field.body.placeholder")}
              i18n={i18n}
              error={bodyError ? {
                ...bodyError,
                message: t(bodyError.message),
              } : null}
              rows={6}
              resize="block"
              required
              onValueChange={(value) => {
                updateConfig({ body: value });
              }}
            />
            <ChipsForm.Error>
              {bodyError ? t(bodyError.message) : null}
            </ChipsForm.Error>
          </ChipsForm.Field>

          {firstError ? (
            <ChipsErrorState
              error={{
                ...firstError,
                message: t(firstError.message),
              }}
              titleKey="basecard.error.title"
              descriptionKey={firstError.message}
              ariaLabel={t("basecard.error.ariaLabel")}
              i18n={i18n}
            />
          ) : null}
        </ChipsStack>
      </ChipsForm.Root>
    </ChipsBox>
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

import React, { useEffect, useState } from "react";
import {
  ChipsBox,
  ChipsButton,
  ChipsErrorState,
  ChipsForm,
  ChipsStack,
  ChipsText,
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

.chips-basecard-editor__resource-dropzone {
  width: 100%;
  min-width: 0;
  padding: var(--chips-comp-basecard-resource-dropzone-padding, var(--chips-sys-space-3));
}

.chips-basecard-editor__actions {
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

function toPreferredResourcePath(file: File): string {
  const fallbackName = "resource";
  const safeName = file.name
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/^\.+/, "")
    .trim();
  return `assets/${safeName || fallbackName}`;
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
  const resourcePathError = toStandardError(errors.resource_path);
  const [resourceBridgeErrorKey, setResourceBridgeErrorKey] = useState<string | undefined>();
  const resourceBridgeError = toStandardError(resourceBridgeErrorKey);
  const firstError = resourceBridgeError ?? toStandardError(Object.values(errors)[0]);

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
    setResourceBridgeErrorKey(undefined);
    if (validation.valid) {
      props.onChange(next);
    }
  }

  async function importDroppedResource(file: File): Promise<void> {
    if (!props.importResource) {
      setResourceBridgeErrorKey("basecard.resource.importUnavailable");
      return;
    }

    try {
      const result = await props.importResource({
        file,
        preferredPath: toPreferredResourcePath(file),
      });
      updateConfig({ resource_path: result.path });
    } catch {
      setResourceBridgeErrorKey("basecard.resource.importFailed");
    }
  }

  function handleResourceDragOver(event: React.DragEvent<HTMLElement>): void {
    if (!props.importResource) {
      return;
    }
    event.preventDefault();
  }

  function handleResourceDrop(event: React.DragEvent<HTMLElement>): void {
    if (!props.importResource) {
      return;
    }

    event.preventDefault();
    const file = event.dataTransfer.files.item(0);
    if (file) {
      void importDroppedResource(file);
    }
  }

  async function handleDeleteResource(): Promise<void> {
    if (!config.resource_path || !props.deleteResource) {
      return;
    }

    try {
      await props.deleteResource(config.resource_path);
      updateConfig({ resource_path: undefined });
    } catch {
      setResourceBridgeErrorKey("basecard.resource.deleteFailed");
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

          <ChipsForm.Field
            className="chips-basecard-editor__field"
            name="resource_path"
            error={resourcePathError}
          >
            <ChipsTextField
              value={config.resource_path ?? ""}
              labelKey="basecard.resource.pathLabel"
              ariaLabel={t("basecard.resource.pathAriaLabel")}
              ariaLabelKey="basecard.resource.pathAriaLabel"
              placeholder={t("basecard.resource.pathPlaceholder")}
              i18n={i18n}
              error={resourcePathError ? {
                ...resourcePathError,
                message: t(resourcePathError.message),
              } : null}
              onValueChange={(value) => {
                updateConfig({ resource_path: value });
              }}
            />
            <ChipsForm.Error>
              {resourcePathError ? t(resourcePathError.message) : null}
            </ChipsForm.Error>
          </ChipsForm.Field>

          {props.importResource ? (
            <ChipsBox
              as="section"
              className="chips-basecard-editor__resource-dropzone"
              role="button"
              tabIndex={0}
              aria-label={t("basecard.resource.dropzoneAriaLabel")}
              onDragOver={handleResourceDragOver}
              onDrop={handleResourceDrop}
              data-chips-basecard-resource-dropzone="true"
            >
              <ChipsText
                as="span"
                textKey="basecard.resource.dropzoneLabel"
                i18n={i18n}
              />
            </ChipsBox>
          ) : null}

          {config.resource_path && props.deleteResource ? (
            <ChipsStack
              className="chips-basecard-editor__actions"
              direction="horizontal"
              gap="var(--chips-comp-basecard-editor-action-gap, var(--chips-sys-space-2))"
              wrap
            >
              <ChipsButton
                type="button"
                onPress={() => {
                  void handleDeleteResource();
                }}
              >
                {t("basecard.resource.deleteAction")}
              </ChipsButton>
            </ChipsStack>
          ) : null}

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

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { BasecardArchiveImportResult } from "../index";
import {
  defaultBasecardConfig,
  normalizeBasecardConfig,
  type BasecardConfig,
  type WebpageDisplayMode,
  type WebpageSourceType,
} from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import { cloneConfig, dedupeResourcePaths, validateWebpageUrl } from "../shared/utils";

export interface BasecardEditorProps {
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
  importArchiveBundle?: (input: {
    file: File;
    preferredRootDir?: string;
    entryFile?: string;
  }) => Promise<BasecardArchiveImportResult>;
  deleteResource?: (resourcePath: string) => Promise<void>;
}

type EditorRoot = HTMLElement & {
  __chipsDispose?: () => void;
};

const AUTO_URL_SYNC_DELAY_MS = 360;

const EDITOR_STYLE_TEXT = `
.chips-webpage-editor {
  width: 100%;
  min-height: 0;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
  overflow: auto;
  color: var(--chips-sys-color-on-surface, #111827);
}

.chips-webpage-editor__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--chips-sys-color-outline, #d7dde7) 82%, transparent 18%);
  background: color-mix(in srgb, var(--chips-sys-color-surface, #f7f9fc) 97%, white 3%);
}

.chips-webpage-editor__group--summary {
  gap: 14px;
}

.chips-webpage-editor__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chips-webpage-editor__section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.chips-webpage-editor__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: color-mix(in srgb, var(--chips-sys-color-on-surface, #111827) 72%, transparent 28%);
}

.chips-webpage-editor__segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--chips-sys-color-surface, #ffffff) 92%, var(--chips-sys-color-outline, #d7dde7) 8%);
  width: fit-content;
  max-width: 100%;
}

.chips-webpage-editor__segmented-button {
  appearance: none;
  min-width: 88px;
  padding: 10px 16px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, transform 120ms ease;
}

.chips-webpage-editor__segmented-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--chips-sys-color-primary, #1166ff) 10%, transparent 90%);
}

.chips-webpage-editor__segmented-button--active {
  background: color-mix(in srgb, var(--chips-sys-color-primary, #1166ff) 88%, white 12%);
  color: white;
}

.chips-webpage-editor__segmented-button:disabled {
  cursor: default;
}

.chips-webpage-editor__segmented-button-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
}

.chips-webpage-editor__segmented-button-meta {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.45;
  opacity: 0.82;
}

.chips-webpage-editor__input-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chips-webpage-editor__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chips-webpage-editor__field-label {
  font-size: 12px;
  font-weight: 600;
  color: color-mix(in srgb, var(--chips-sys-color-on-surface, #111827) 84%, transparent 16%);
}

.chips-webpage-editor__input {
  width: 100%;
  padding: 11px 13px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--chips-sys-color-outline, #d7dde7) 84%, transparent 16%);
  background: color-mix(in srgb, var(--chips-sys-color-surface, #ffffff) 98%, white 2%);
  color: inherit;
  box-sizing: border-box;
  font: inherit;
}

.chips-webpage-editor__input:focus {
  outline: 2px solid color-mix(in srgb, var(--chips-sys-color-primary, #1166ff) 26%, transparent 74%);
  outline-offset: 1px;
}

.chips-webpage-editor__dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border-radius: 16px;
  border: 1px dashed color-mix(in srgb, var(--chips-sys-color-outline, #d7dde7) 88%, transparent 12%);
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--chips-sys-color-primary, #1166ff) 6%, var(--chips-sys-color-surface, #ffffff) 94%),
      color-mix(in srgb, var(--chips-sys-color-surface, #ffffff) 96%, var(--chips-sys-color-outline, #d7dde7) 4%)
    );
  cursor: pointer;
  transition: border-color 120ms ease, transform 120ms ease, background-color 120ms ease;
}

.chips-webpage-editor__dropzone:hover {
  border-color: color-mix(in srgb, var(--chips-sys-color-primary, #1166ff) 44%, var(--chips-sys-color-outline, #d7dde7) 56%);
}

.chips-webpage-editor__dropzone--active {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--chips-sys-color-primary, #1166ff) 74%, white 26%);
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--chips-sys-color-primary, #1166ff) 12%, var(--chips-sys-color-surface, #ffffff) 88%),
      color-mix(in srgb, var(--chips-sys-color-primary, #1166ff) 6%, var(--chips-sys-color-surface, #ffffff) 94%)
    );
}

.chips-webpage-editor__dropzone[aria-disabled="true"] {
  opacity: 0.68;
  cursor: default;
}

.chips-webpage-editor__dropzone-title {
  font-size: 14px;
  font-weight: 700;
}

.chips-webpage-editor__dropzone-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: color-mix(in srgb, var(--chips-sys-color-on-surface, #111827) 72%, transparent 28%);
}

.chips-webpage-editor__file-input {
  display: none;
}

.chips-webpage-editor__current {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chips-webpage-editor__current-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.chips-webpage-editor__meta {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: color-mix(in srgb, var(--chips-sys-color-on-surface, #111827) 74%, transparent 26%);
  word-break: break-word;
}

.chips-webpage-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chips-webpage-editor__button {
  appearance: none;
  padding: 9px 14px;
  border: 0;
  border-radius: 10px;
  background: color-mix(in srgb, var(--chips-sys-color-outline, #d7dde7) 72%, var(--chips-sys-color-surface, #ffffff) 28%);
  color: var(--chips-sys-color-on-surface, #111827);
  font: inherit;
  cursor: pointer;
}

.chips-webpage-editor__button:disabled {
  opacity: 0.6;
  cursor: default;
}

.chips-webpage-editor__status {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: color-mix(in srgb, var(--chips-sys-color-on-surface, #111827) 76%, transparent 24%);
}

.chips-webpage-editor__status--error {
  color: var(--chips-sys-color-error, #d92d20);
}
`;

function removeAllBundleResources(
  resourcePaths: readonly string[],
  deleteResource?: (resourcePath: string) => Promise<void>,
): Promise<void> {
  if (!deleteResource) {
    return Promise.resolve();
  }

  return dedupeResourcePaths(resourcePaths).reduce(
    (task, resourcePath) => task.then(() => deleteResource(resourcePath)),
    Promise.resolve(),
  );
}

function createClearedConfig(config: BasecardConfig): BasecardConfig {
  return normalizeBasecardConfig({
    ...config,
    source_type: "url",
    source_url: "",
    bundle_root: "",
    entry_file: "index.html",
    resource_paths: [],
  });
}

function WebpageCardEditor(props: BasecardEditorProps) {
  const t = useMemo(
    () => createTranslator(typeof navigator !== "undefined" ? navigator.language : "zh-CN"),
    [],
  );
  const [config, setConfig] = useState<BasecardConfig>(
    () => normalizeBasecardConfig(cloneConfig(props.initialConfig as unknown as Record<string, unknown>)),
  );
  const [sourceMode, setSourceMode] = useState<WebpageSourceType>(config.source_type);
  const [urlInput, setUrlInput] = useState(config.source_url ?? "");
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const configRef = useRef(config);
  const mutationIdRef = useRef(0);
  const applyUrlSourceRef = useRef<(inputValue: string) => void>(() => undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputId = useId();

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const emitChange = (nextConfig: BasecardConfig) => {
    setConfig(nextConfig);
    props.onChange(nextConfig);
  };

  const applyDisplayMode = (nextMode: WebpageDisplayMode) => {
    if (configRef.current.display_mode === nextMode) {
      return;
    }

    const nextConfig = normalizeBasecardConfig({
      ...configRef.current,
      display_mode: nextMode,
      fixed_ratio: "7:16",
      max_height_ratio: 20,
    });
    emitChange(nextConfig);
    setErrorText("");
    setStatusText("");
  };

  const beginMutation = (): number => {
    mutationIdRef.current += 1;
    return mutationIdRef.current;
  };

  const isLatestMutation = (mutationId: number): boolean => mutationIdRef.current === mutationId;

  const switchSourceMode = (nextMode: WebpageSourceType) => {
    setSourceMode(nextMode);
    setErrorText("");
    setStatusText("");
  };

  const applyUrlSource = async (inputValue: string) => {
    const mutationId = beginMutation();
    const nextUrl = inputValue.trim();
    if (!validateWebpageUrl(nextUrl)) {
      if (isLatestMutation(mutationId)) {
        setErrorText(t("editor.invalid_url"));
        setStatusText("");
      }
      return;
    }

    const currentConfig = configRef.current;
    if (currentConfig.source_type === "url" && currentConfig.source_url === nextUrl) {
      if (isLatestMutation(mutationId)) {
        setErrorText("");
        setStatusText("");
      }
      return;
    }

    try {
      if (currentConfig.source_type === "bundle" && currentConfig.resource_paths.length > 0) {
        await removeAllBundleResources(currentConfig.resource_paths, props.deleteResource);
      }
      if (!isLatestMutation(mutationId)) {
        return;
      }

      const nextConfig = normalizeBasecardConfig({
        ...currentConfig,
        source_type: "url",
        source_url: nextUrl,
        bundle_root: "",
        entry_file: "index.html",
        resource_paths: [],
      });
      emitChange(nextConfig);
      setErrorText("");
      setStatusText(t("editor.url_updated"));
    } catch (error) {
      if (!isLatestMutation(mutationId)) {
        return;
      }
      setErrorText(error instanceof Error ? error.message : t("editor.clear_failed"));
      setStatusText("");
    }
  };

  const clearSource = async () => {
    const mutationId = beginMutation();
    const currentConfig = configRef.current;

    try {
      if (currentConfig.source_type === "bundle" && currentConfig.resource_paths.length > 0) {
        await removeAllBundleResources(currentConfig.resource_paths, props.deleteResource);
      }
      if (!isLatestMutation(mutationId)) {
        return;
      }

      const clearedConfig = createClearedConfig(currentConfig);
      emitChange(clearedConfig);
      setUrlInput("");
      setErrorText("");
      setStatusText(t("editor.source_cleared"));
    } catch (error) {
      if (!isLatestMutation(mutationId)) {
        return;
      }
      setErrorText(error instanceof Error ? error.message : t("editor.clear_failed"));
      setStatusText("");
    }
  };

  const importBundleFile = async (file: File) => {
    if (!props.importArchiveBundle) {
      setErrorText(t("editor.import_unsupported"));
      setStatusText("");
      return;
    }

    const mutationId = beginMutation();
    setIsImporting(true);
    setErrorText("");
    setStatusText("");

    try {
      const result = await props.importArchiveBundle({
        file,
        preferredRootDir: "webpage-bundle",
        entryFile: "index.html",
      });
      const currentConfig = configRef.current;

      if (currentConfig.source_type === "bundle" && currentConfig.resource_paths.length > 0) {
        await removeAllBundleResources(currentConfig.resource_paths, props.deleteResource);
      }
      if (!isLatestMutation(mutationId)) {
        return;
      }

      const nextConfig = normalizeBasecardConfig({
        ...currentConfig,
        source_type: "bundle",
        source_url: "",
        bundle_root: result.rootDir,
        entry_file: result.entryFile,
        resource_paths: result.resourcePaths,
      });
      emitChange(nextConfig);
      setSourceMode("bundle");
      setErrorText("");
      setStatusText(t("editor.import_success"));
    } catch (error) {
      if (!isLatestMutation(mutationId)) {
        return;
      }
      setErrorText(error instanceof Error ? error.message : t("editor.import_failed"));
      setStatusText("");
    } finally {
      if (isLatestMutation(mutationId)) {
        setIsImporting(false);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  applyUrlSourceRef.current = (inputValue: string) => {
    void applyUrlSource(inputValue);
  };

  useEffect(() => {
    if (sourceMode !== "url") {
      return;
    }

    const nextUrl = urlInput.trim();
    if (nextUrl.length === 0) {
      setErrorText("");
      setStatusText("");
      return;
    }

    const timerId = window.setTimeout(() => {
      applyUrlSourceRef.current(nextUrl);
    }, AUTO_URL_SYNC_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [sourceMode, urlInput]);

  const currentSourceDescription = config.source_type === "bundle" && config.bundle_root
    ? t("editor.current_bundle")
    : config.source_type === "url" && config.source_url
      ? t("editor.current_url")
      : t("editor.current_empty");
  const currentDisplayDescription = config.display_mode === "fixed"
    ? t("editor.ratio_fixed_current")
    : t("editor.ratio_free_current");

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void importBundleFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (isImporting) {
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    void importBundleFile(file);
  };

  return (
    <div className="chips-webpage-editor">
      <style>{EDITOR_STYLE_TEXT}</style>

      <section className="chips-webpage-editor__group">
        <div className="chips-webpage-editor__header">
          <h2 className="chips-webpage-editor__section-title">{t("editor.ratio_title")}</h2>
          <p className="chips-webpage-editor__hint">{t("editor.ratio_hint")}</p>
        </div>
        <div className="chips-webpage-editor__segmented" role="group" aria-label={t("editor.ratio_title")}>
          <button
            type="button"
            className={`chips-webpage-editor__segmented-button ${config.display_mode === "fixed" ? "chips-webpage-editor__segmented-button--active" : ""}`}
            aria-pressed={config.display_mode === "fixed"}
            data-display-mode="fixed"
            onClick={() => applyDisplayMode("fixed")}
          >
            <span className="chips-webpage-editor__segmented-button-label">{t("editor.ratio_fixed")}</span>
            <span className="chips-webpage-editor__segmented-button-meta">{t("editor.ratio_fixed_hint")}</span>
          </button>
          <button
            type="button"
            className={`chips-webpage-editor__segmented-button ${config.display_mode === "free" ? "chips-webpage-editor__segmented-button--active" : ""}`}
            aria-pressed={config.display_mode === "free"}
            data-display-mode="free"
            onClick={() => applyDisplayMode("free")}
          >
            <span className="chips-webpage-editor__segmented-button-label">{t("editor.ratio_free")}</span>
            <span className="chips-webpage-editor__segmented-button-meta">{t("editor.ratio_free_hint")}</span>
          </button>
        </div>
      </section>

      <section className="chips-webpage-editor__group">
        <div className="chips-webpage-editor__header">
          <h2 className="chips-webpage-editor__section-title">{t("editor.mode_title")}</h2>
          <p className="chips-webpage-editor__hint">{t("editor.mode_hint")}</p>
        </div>
        <div className="chips-webpage-editor__segmented" role="group" aria-label={t("editor.mode_title")}>
          <button
            type="button"
            className={`chips-webpage-editor__segmented-button ${sourceMode === "url" ? "chips-webpage-editor__segmented-button--active" : ""}`}
            aria-pressed={sourceMode === "url"}
            data-source-mode="url"
            onClick={() => switchSourceMode("url")}
          >
            {t("editor.mode_url")}
          </button>
          <button
            type="button"
            className={`chips-webpage-editor__segmented-button ${sourceMode === "bundle" ? "chips-webpage-editor__segmented-button--active" : ""}`}
            aria-pressed={sourceMode === "bundle"}
            data-source-mode="bundle"
            onClick={() => switchSourceMode("bundle")}
          >
            {t("editor.mode_bundle")}
          </button>
        </div>
      </section>

      <section className="chips-webpage-editor__group">
        {sourceMode === "url" ? (
          <div className="chips-webpage-editor__input-card">
            <label className="chips-webpage-editor__field" htmlFor={`${fileInputId}-url`}>
              <span className="chips-webpage-editor__field-label">{t("editor.url_title")}</span>
              <input
                id={`${fileInputId}-url`}
                className="chips-webpage-editor__input chips-webpage-editor__url-field"
                type="url"
                value={urlInput}
                onChange={(event) => {
                  setUrlInput(event.target.value);
                }}
                placeholder={t("editor.url_placeholder")}
              />
            </label>
            <p className="chips-webpage-editor__hint">{t("editor.url_hint")}</p>
          </div>
        ) : (
          <div
            className={`chips-webpage-editor__dropzone ${isDragActive ? "chips-webpage-editor__dropzone--active" : ""}`}
            data-drop-active={isDragActive ? "true" : "false"}
            role="button"
            tabIndex={isImporting ? -1 : 0}
            aria-disabled={isImporting ? "true" : "false"}
            onClick={() => {
              if (!isImporting) {
                fileInputRef.current?.click();
              }
            }}
            onKeyDown={(event) => {
              if (isImporting) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!isImporting) {
                setIsDragActive(true);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isImporting) {
                event.dataTransfer.dropEffect = "copy";
                setIsDragActive(true);
              }
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                return;
              }
              setIsDragActive(false);
            }}
            onDrop={handleDrop}
          >
            <input
              id={fileInputId}
              ref={fileInputRef}
              className="chips-webpage-editor__file-input"
              type="file"
              accept=".zip,application/zip"
              disabled={isImporting}
              onChange={handleFileInputChange}
            />
            <strong className="chips-webpage-editor__dropzone-title">
              {isImporting ? t("editor.importing") : t("editor.bundle_upload_title")}
            </strong>
            <p className="chips-webpage-editor__dropzone-text">{t("editor.bundle_hint")}</p>
            <p className="chips-webpage-editor__dropzone-text">{t("editor.bundle_upload_action")}</p>
          </div>
        )}
      </section>

      <section className="chips-webpage-editor__group chips-webpage-editor__group--summary">
        <div className="chips-webpage-editor__current">
          <h2 className="chips-webpage-editor__section-title">{t("editor.current_title")}</h2>
          <p className="chips-webpage-editor__meta">{currentDisplayDescription}</p>
          <p className="chips-webpage-editor__current-text">{currentSourceDescription}</p>
          {config.source_type === "url" && config.source_url && (
            <p className="chips-webpage-editor__meta">{config.source_url}</p>
          )}
          {config.source_type === "bundle" && config.bundle_root && (
            <>
              <p className="chips-webpage-editor__meta">
                {t("editor.bundle_root", { rootDir: config.bundle_root })}
              </p>
              <p className="chips-webpage-editor__meta">
                {t("editor.bundle_entry", { entryFile: config.entry_file ?? "index.html" })}
              </p>
              <p className="chips-webpage-editor__meta">
                {t("editor.bundle_files", { count: config.resource_paths.length })}
              </p>
            </>
          )}
        </div>
        <div className="chips-webpage-editor__actions">
          <button
            type="button"
            className="chips-webpage-editor__button"
            disabled={isImporting}
            onClick={() => {
              void clearSource();
            }}
          >
            {t("editor.clear_source")}
          </button>
        </div>
      </section>

      {statusText && !errorText && (
        <p className="chips-webpage-editor__status" aria-live="polite">{statusText}</p>
      )}
      {errorText && (
        <p className="chips-webpage-editor__status chips-webpage-editor__status--error" aria-live="polite">
          {errorText}
        </p>
      )}
    </div>
  );
}

export function createBasecardEditorRoot(props: BasecardEditorProps): EditorRoot {
  const container = document.createElement("div") as EditorRoot;
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.minHeight = "0";
  container.style.display = "flex";

  const root: Root = createRoot(container);
  flushSync(() => {
    root.render(
      React.createElement(WebpageCardEditor, {
        ...props,
        initialConfig: normalizeBasecardConfig(props.initialConfig ?? defaultBasecardConfig),
      }),
    );
  });

  container.__chipsDispose = () => {
    root.unmount();
  };

  return container;
}

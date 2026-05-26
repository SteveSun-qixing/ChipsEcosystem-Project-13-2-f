import React, { useEffect, useRef, useState } from "react";
import {
  ChipsButton,
  ChipsErrorState,
  ChipsForm,
  ChipsIcon,
  ChipsText,
  ChipsTextField,
  ChipsVirtualList,
  type StandardErrorLike,
} from "@chips/component-library";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type {
  BasecardArchiveImportedEntry,
  BasecardArchiveImportResult,
  BasecardResourceImportRequest,
  BasecardResourceImportResult,
} from "../index";
import {
  normalizeBasecardConfig,
  validateBasecardConfig,
  type BasecardConfig,
  type BookImageItem,
  type ImageSortBasis,
} from "../schema/card-config";
import { parseEpubMetadata } from "../shared/epub";
import { createTranslator } from "../shared/i18n";
import {
  createResourcePathsForConfig,
  detectImageMimeType,
  generateStableId,
  getRemovedInternalResourcePaths,
  inferBookFormatFromFileName,
  isArchiveFormat,
  isNonEmptyString,
  isSupportedEbookFormat,
  normalizeBookFormat,
  resolveFileExtension,
  resolveFileName,
  resolveResourceUrlWithRetry,
  sanitizeImportedFileName,
  sortImageItems,
  stripFileExtension,
} from "../shared/utils";

export interface BasecardEditorProps {
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  importResource?: (
    input: BasecardResourceImportRequest,
  ) => Promise<BasecardResourceImportResult>;
  importArchiveBundle?: (input: {
    file: File;
    preferredRootDir?: string;
    entryFile?: string;
    include?: {
      mimeTypes?: string[];
      extensions?: string[];
    };
    stripSingleRootDir?: boolean;
    excludeSystemArtifacts?: boolean;
  }) => Promise<BasecardArchiveImportResult>;
  deleteResource?: (resourcePath: string) => Promise<void>;
}

type EditorRoot = HTMLElement & {
  __chipsDispose?: () => void;
};

type BusyState = "main" | "cover" | null;
type DropzoneKind = "main" | "cover";

function toStandardError(message: string): StandardErrorLike {
  return {
    code: "BOOK_BASECARD_VALIDATION",
    message,
  };
}

function firstValidationError(errors: Record<string, string>): StandardErrorLike | null {
  const message = Object.values(errors)[0];
  return message ? toStandardError(message) : null;
}

const MAIN_ACCEPT = [
  ".epub",
  ".pdf",
  ".txt",
  ".md",
  ".markdown",
  ".mobi",
  ".azw",
  ".azw3",
  ".fb2",
  ".djvu",
  ".djv",
  ".rtf",
  ".doc",
  ".docx",
  ".zip",
  ".cbz",
  "application/epub+zip",
  "application/pdf",
  "text/plain",
  "text/markdown",
].join(",");

const COVER_ACCEPT = "image/*";

const EDITOR_STYLE_TEXT = `
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--chips-sys-color-surface, #ffffff);
}

.chips-book-editor {
  --chips-book-editor-border-color: var(--chips-comp-card-shell-border-color, var(--chips-sys-color-outline-variant, rgba(15, 23, 42, 0.14)));
  --chips-book-editor-separator-color: var(--chips-sys-color-outline-variant, rgba(15, 23, 42, 0.08));
  --chips-book-editor-subtle-separator-color: var(--chips-sys-color-outline-variant, rgba(15, 23, 42, 0.06));
  --chips-book-editor-focus-ring: var(--chips-sys-color-primary-container, rgba(17, 102, 255, 0.12));
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 12px clamp(12px, 3vw, 18px) 24px;
  color: var(--chips-sys-color-on-surface, #172033);
  background: var(--chips-sys-color-surface, #ffffff);
  font: 14px/1.55 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-book-editor,
.chips-book-editor * {
  box-sizing: border-box;
}

.chips-book-editor__shell {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}

.chips-book-editor [data-scope="form"][data-part="root"] {
  display: grid;
  gap: 14px;
}

.chips-book-editor__group {
  padding: 4px 0 0;
}

.chips-book-editor__group + .chips-book-editor__group {
  margin-top: 14px;
  border-top: 1px solid var(--chips-book-editor-separator-color);
}

.chips-book-editor__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 4px;
}

.chips-book-editor__group-title {
  margin: 0;
  color: var(--chips-sys-color-on-surface, #172033);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.chips-book-editor__status {
  margin: 0 0 10px;
  min-height: 20px;
  color: var(--chips-sys-color-on-surface-variant, #516074);
  font-size: 12px;
  font-weight: 650;
}

.chips-book-editor__status--error {
  color: var(--chips-sys-color-error, #b42318);
}

.chips-book-editor__status:empty {
  display: none;
}

.chips-book-editor__row {
  display: grid;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--chips-book-editor-subtle-separator-color);
}

.chips-book-editor__field-row {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--chips-book-editor-subtle-separator-color);
}

.chips-book-editor__label {
  margin: 0;
  padding-top: 8px;
  color: var(--chips-sys-color-on-surface-variant, #334155);
  font-size: 13px;
  font-weight: 650;
}

.chips-book-editor__control {
  min-width: 0;
}

.chips-book-editor__input,
.chips-book-editor__select {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--chips-book-editor-border-color);
  border-radius: 8px;
  background: var(--chips-sys-color-surface, #ffffff);
  color: inherit;
  font: inherit;
  outline: none;
}

.chips-book-editor__input:focus,
.chips-book-editor__select:focus {
  border-color: var(--chips-sys-color-primary, #1166ff);
  box-shadow: 0 0 0 3px var(--chips-book-editor-focus-ring);
}

.chips-book-editor__dropzone {
  position: relative;
  display: grid;
  gap: 6px;
  min-height: 72px;
  padding: 12px 14px;
  border: 1.5px dashed var(--chips-book-editor-border-color);
  border-radius: 8px;
  background: var(--chips-sys-color-surface-container-low, #f7f9fc);
  color: inherit;
  cursor: pointer;
}

.chips-book-editor__dropzone[data-state="busy"] {
  cursor: progress;
  opacity: 0.72;
}

.chips-book-editor__dropzone:hover,
.chips-book-editor__dropzone:focus-within {
  border-color: var(--chips-sys-color-primary, #1166ff);
}

.chips-book-editor__file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.chips-book-editor__dropzone-title {
  font-size: 14px;
  font-weight: 700;
}

.chips-book-editor__dropzone-meta,
.chips-book-editor__resource-meta {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.chips-book-editor__cover-row {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.chips-book-editor__cover {
  width: 76px;
  height: 104px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid var(--chips-book-editor-border-color);
  background: var(--chips-sys-color-surface-container, #edf2f8);
}

.chips-book-editor__cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-book-editor__cover-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.chips-book-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chips-book-editor__button {
  appearance: none;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--chips-book-editor-border-color);
  border-radius: 8px;
  background: var(--chips-sys-color-surface, #ffffff);
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.chips-book-editor__button:disabled {
  cursor: default;
  opacity: 0.58;
}

.chips-book-editor__button--danger {
  color: var(--chips-sys-color-error, #b42318);
}

.chips-book-editor__actions [data-scope="button"][data-part="root"] {
  min-height: 34px;
}

.chips-book-editor__validation {
  margin-top: 12px;
}

.chips-book-editor__image-list {
  margin-top: 10px;
  border: 1px solid var(--chips-book-editor-border-color);
  border-radius: 8px;
  overflow: hidden;
}

.chips-book-editor__image-list-item {
  display: grid;
  gap: 2px;
  padding: 6px 10px;
  min-width: 0;
}

.chips-book-editor__image-list-path {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .chips-book-editor__field-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .chips-book-editor__label {
    padding-top: 0;
  }
}
`;

function getPrimaryFileLabel(config: BasecardConfig, fallback: string): string {
  if (config.source_type === "image-sequence") {
    return config.image_sequence.length > 0
      ? `${config.image_sequence.length} ${fallback}`
      : "";
  }

  return config.book_file ? resolveFileName(config.book_file) : "";
}

async function deleteRemovedResources(
  previous: BasecardConfig,
  next: BasecardConfig,
  deleteResource?: (resourcePath: string) => Promise<void>,
): Promise<void> {
  if (!deleteResource) {
    return;
  }

  const removed = getRemovedInternalResourcePaths(previous, next);
  await Promise.all(removed.map((resourcePath) => deleteResource(resourcePath)));
}

function getFirstDroppedFile(event: React.DragEvent<HTMLElement>): File | null {
  const files = Array.from(event.dataTransfer.files ?? []);
  if (files[0]) {
    return files[0];
  }

  const items = Array.from(event.dataTransfer.items ?? []);
  for (const item of items) {
    if (item.kind !== "file") {
      continue;
    }

    const file = item.getAsFile();
    if (file) {
      return file;
    }
  }

  return null;
}

function useResolvedPreview(
  resourcePath: string,
  resolveResourceUrl?: (resourcePath: string) => Promise<string>,
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void,
): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!resourcePath) {
      setUrl("");
      return undefined;
    }

    if (!resolveResourceUrl) {
      setUrl(resourcePath);
      return undefined;
    }

    void resolveResourceUrlWithRetry(resolveResourceUrl, resourcePath)
      .then((resolvedUrl) => {
        if (!cancelled) {
          setUrl(resolvedUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl("");
        }
      });

    return () => {
      cancelled = true;
      void releaseResourceUrl?.(resourcePath);
    };
  }, [releaseResourceUrl, resolveResourceUrl, resourcePath]);

  return url;
}

function BasecardEditor(props: BasecardEditorProps) {
  const [config, setConfig] = useState(() => normalizeBasecardConfig(props.initialConfig));
  const [busy, setBusy] = useState<BusyState>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const mainInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const locale = typeof navigator !== "undefined" ? navigator.language : "zh-CN";
  const t = createTranslator(locale);
  const coverPreview = useResolvedPreview(
    config.cover_image || config.image_sequence[0]?.file_path || "",
    props.resolveResourceUrl,
    props.releaseResourceUrl,
  );
  const validation = validateBasecardConfig(config);
  const validationError = firstValidationError(validation.errors);
  const i18n = {
    translate(input: string | { key: string; params?: Record<string, string | number> }, params?: Record<string, string | number>) {
      return typeof input === "string" ? t(input, params) : t(input.key, input.params);
    },
  };

  useEffect(() => {
    setConfig(normalizeBasecardConfig(props.initialConfig));
  }, [props.initialConfig]);

  async function commit(nextConfig: BasecardConfig) {
    const normalized = normalizeBasecardConfig(nextConfig);
    const previous = config;
    setConfig(normalized);
    props.onChange(normalized);
    await deleteRemovedResources(previous, normalized, props.deleteResource);
  }

  function updateFields(patch: Partial<BasecardConfig>) {
    const next = normalizeBasecardConfig({
      ...config,
      ...patch,
    });
    setConfig(next);
    props.onChange(next);
  }

  async function replaceWithEbook(file: File, format: string) {
    if (!props.importResource) {
      throw new Error(t("editor.error.import_unavailable"));
    }

    let metadataTitle = "";
    let metadataAuthor = "";
    let metadataCoverFile: File | undefined;
    let metadataCoverSuggestedPath = "";

    if (format === "epub" || format === "epub3") {
      try {
        const epubMetadata = await parseEpubMetadata(file);
        metadataTitle = epubMetadata.title;
        metadataAuthor = epubMetadata.author;
        metadataCoverFile = epubMetadata.cover?.file;
        metadataCoverSuggestedPath = epubMetadata.cover?.suggestedFileName ?? "";
      } catch {
        metadataTitle = "";
        metadataAuthor = "";
        metadataCoverFile = undefined;
        metadataCoverSuggestedPath = "";
      }
    }

    const importedBook = await props.importResource({
      file,
      preferredPath: sanitizeImportedFileName(file.name, "ebook"),
    });
    let coverPath = "";
    if (metadataCoverFile) {
      try {
        const importedCover = await props.importResource({
          file: metadataCoverFile,
          preferredPath: metadataCoverSuggestedPath || metadataCoverFile.name,
        });
        coverPath = importedCover.path;
      } catch {
        coverPath = "";
      }
    }
    const next = normalizeBasecardConfig({
      card_type: "base.book",
      theme: config.theme,
      source_type: "ebook",
      book_file: importedBook.path,
      book_format: format,
      book_name: metadataTitle,
      book_author: metadataAuthor,
      cover_image: coverPath,
      image_sequence: [],
      image_sort_basis: config.image_sort_basis,
      resource_paths: createResourcePathsForConfig({
        sourceType: "ebook",
        bookFile: importedBook.path,
        coverImage: coverPath,
      }),
    });

    await commit(next);
    setStatus(t("editor.status.ebook_imported"));
  }

  async function replaceWithArchive(file: File, format: string) {
    if (!props.importArchiveBundle) {
      throw new Error(t("editor.error.archive_import_unavailable"));
    }

    const result = await props.importArchiveBundle({
      file,
      preferredRootDir: stripFileExtension(file.name),
      include: {
        mimeTypes: ["image/*"],
        extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".avif", ".svg", ".tif", ".tiff"],
      },
      stripSingleRootDir: true,
      excludeSystemArtifacts: true,
    });
    const imageEntries = result.entries.filter((entry): entry is BasecardArchiveImportedEntry => (
      !entry.isDirectory &&
      typeof entry.resourcePath === "string" &&
      entry.resourcePath.length > 0 &&
      typeof entry.sourcePath === "string" &&
      entry.sourcePath.length > 0
    ));
    if (imageEntries.length === 0) {
      throw new Error(t("editor.error.archive_empty"));
    }

    const importedImages: BookImageItem[] = imageEntries.map((entry) => ({
      id: `image-${generateStableId()}`,
      file_path: entry.resourcePath,
      file_name: entry.fileName || resolveFileName(entry.resourcePath),
      mime_type: entry.mimeType,
      sort_key: entry.sourcePath,
      source_entry_path: entry.sourcePath,
      entry_time: entry.modifiedTime,
    }));

    const sortedImages = sortImageItems(importedImages, config.image_sort_basis);
    const coverImage = sortedImages[0]?.file_path ?? "";
    const next = normalizeBasecardConfig({
      card_type: "base.book",
      theme: config.theme,
      source_type: "image-sequence",
      book_file: "",
      book_format: normalizeBookFormat(format),
      book_name: stripFileExtension(file.name),
      book_author: "",
      cover_image: coverImage,
      image_sequence: sortedImages,
      image_sort_basis: config.image_sort_basis,
      resource_paths: createResourcePathsForConfig({
        sourceType: "image-sequence",
        coverImage,
        images: sortedImages,
      }),
    });

    await commit(next);
    setStatus(t("editor.status.archive_imported", { count: sortedImages.length }));
  }

  async function handleMainFile(file: File) {
    setBusy("main");
    setError("");
    setStatus("");

    try {
      const format = inferBookFormatFromFileName(file.name);
      if (isArchiveFormat(format)) {
        await replaceWithArchive(file, format);
      } else if (isSupportedEbookFormat(format)) {
        await replaceWithEbook(file, format);
      } else {
        throw new Error(t("editor.error.unsupported_format"));
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("editor.error.import_failed"));
    } finally {
      setBusy(null);
      if (mainInputRef.current) {
        mainInputRef.current.value = "";
      }
    }
  }

  async function handleCoverFile(file: File) {
    if (!props.importResource) {
      setError(t("editor.error.import_unavailable"));
      return;
    }

    setBusy("cover");
    setError("");
    setStatus("");

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mimeType = detectImageMimeType(bytes, file.name);
      if (!mimeType) {
        throw new Error(t("editor.error.cover_not_image"));
      }

      const sourceName = config.book_file
        ? `${stripFileExtension(resolveFileName(config.book_file))}-cover.${resolveFileExtension(file.name) || mimeType.split("/")[1] || "jpg"}`
        : sanitizeImportedFileName(file.name, "book-cover");
      const coverFile = new File([bytes], sanitizeImportedFileName(sourceName, "book-cover"), {
        type: mimeType,
        lastModified: file.lastModified,
      });
      const imported = await props.importResource({
        file: coverFile,
        preferredPath: sanitizeImportedFileName(sourceName, "book-cover"),
      });
      const next = normalizeBasecardConfig({
        ...config,
        cover_image: imported.path,
        resource_paths: createResourcePathsForConfig({
          sourceType: config.source_type,
          bookFile: config.book_file,
          coverImage: imported.path,
          images: config.image_sequence,
        }),
      });

      await commit(next);
      setStatus(t("editor.status.cover_imported"));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("editor.error.import_failed"));
    } finally {
      setBusy(null);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  }

  async function clearMainResource() {
    const next = normalizeBasecardConfig({
      ...config,
      source_type: "ebook",
      book_file: "",
      book_format: "",
      book_name: "",
      book_author: "",
      cover_image: "",
      image_sequence: [],
      resource_paths: [],
    });
    await commit(next);
    setStatus(t("editor.status.cleared"));
  }

  async function clearCover() {
    const next = normalizeBasecardConfig({
      ...config,
      cover_image: "",
      resource_paths: createResourcePathsForConfig({
        sourceType: config.source_type,
        bookFile: config.book_file,
        images: config.image_sequence,
      }),
    });
    await commit(next);
    setStatus(t("editor.status.cover_cleared"));
  }

  function changeSortBasis(nextBasis: ImageSortBasis) {
    const sortedImages = sortImageItems(config.image_sequence, nextBasis);
    const imagePaths = new Set(sortedImages.map((image) => image.file_path));
    const coverImage = imagePaths.has(config.cover_image)
      ? sortedImages[0]?.file_path ?? ""
      : config.cover_image;
    updateFields({
      image_sort_basis: nextBasis,
      image_sequence: sortedImages,
      cover_image: coverImage,
      resource_paths: createResourcePathsForConfig({
        sourceType: "image-sequence",
        coverImage,
        images: sortedImages,
      }),
    });
  }

  function prepareDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = busy === null ? "copy" : "none";
  }

  function handleDrop(event: React.DragEvent<HTMLElement>, kind: DropzoneKind) {
    prepareDrop(event);
    if (busy !== null) {
      return;
    }

    const file = getFirstDroppedFile(event);
    if (!file) {
      return;
    }

    if (kind === "main") {
      void handleMainFile(file);
      return;
    }

    void handleCoverFile(file);
  }

  const primaryLabel = getPrimaryFileLabel(config, t("editor.images_unit"));
  const hasResource = isNonEmptyString(config.book_file) || config.image_sequence.length > 0;
  const imageListItems = config.image_sequence.map((image) => ({
    value: image.id,
    label: image.file_name,
    resourcePath: image.file_path,
  }));

  return (
    <div className="chips-book-editor">
      <div className="chips-book-editor__shell">
        <ChipsForm.Root
          aria-label={t("editor.form_aria_label")}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          {error || status ? (
            <p className={`chips-book-editor__status${error ? " chips-book-editor__status--error" : ""}`}>
              {error || status}
            </p>
          ) : null}

          <section className="chips-book-editor__group">
            <div className="chips-book-editor__group-head">
              <ChipsText
                as="div"
                className="chips-book-editor__group-title"
                text={t("editor.group.resource")}
                emphasis="strong"
              />
            </div>
            <div className="chips-book-editor__row">
            <label
              className="chips-book-editor__dropzone"
              data-role="main-dropzone"
              data-state={busy === "main" ? "busy" : "idle"}
              onDragEnter={prepareDrop}
              onDragOver={prepareDrop}
              onDrop={(event) => {
                handleDrop(event, "main");
              }}
            >
              <span className="chips-book-editor__dropzone-title">
                <ChipsIcon descriptor={{ name: "upload_file", decorative: true }} tone="accent" />
                {t("editor.upload_main")}
              </span>
              <span className="chips-book-editor__dropzone-meta">
                {primaryLabel || t("editor.no_resource")}
              </span>
              <input
                ref={mainInputRef}
                data-role="main-file-input"
                className="chips-book-editor__file-input"
                type="file"
                accept={MAIN_ACCEPT}
                disabled={busy !== null}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) {
                    void handleMainFile(file);
                  }
                }}
              />
            </label>
            <div className="chips-book-editor__actions">
              <ChipsButton
                type="button"
                disabled={!hasResource || busy !== null}
                onPress={() => {
                  void clearMainResource();
                }}
              >
                {t("editor.clear_resource")}
              </ChipsButton>
            </div>
            {imageListItems.length > 0 ? (
              <div className="chips-book-editor__image-list">
                <ChipsVirtualList
                  items={imageListItems}
                  itemHeight={54}
                  height={Math.min(220, Math.max(54, imageListItems.length * 54))}
                  ariaLabel={t("editor.image_list_aria_label")}
                  renderItem={(item) => (
                    <div className="chips-book-editor__image-list-item">
                      <strong>{item.label}</strong>
                      <span className="chips-book-editor__image-list-path">
                        {String(item.resourcePath ?? "")}
                      </span>
                    </div>
                  )}
                />
              </div>
            ) : null}
            </div>
          </section>

          <section className="chips-book-editor__group">
            <div className="chips-book-editor__group-head">
              <ChipsText
                as="div"
                className="chips-book-editor__group-title"
                text={t("editor.group.cover")}
                emphasis="strong"
              />
            </div>
            <div className="chips-book-editor__row">
            <div className="chips-book-editor__cover-row">
              <div className="chips-book-editor__cover">
                {coverPreview ? (
                  <img src={coverPreview} alt={t("editor.cover_alt")} />
                ) : (
                  <div className="chips-book-editor__cover-placeholder">{t("editor.no_cover")}</div>
                )}
              </div>
              <label
                className="chips-book-editor__dropzone"
                data-role="cover-dropzone"
                data-state={busy === "cover" ? "busy" : "idle"}
                onDragEnter={prepareDrop}
                onDragOver={prepareDrop}
                onDrop={(event) => {
                  handleDrop(event, "cover");
                }}
              >
                <span className="chips-book-editor__dropzone-title">
                  <ChipsIcon descriptor={{ name: "add_photo_alternate", decorative: true }} tone="accent" />
                  {t("editor.upload_cover")}
                </span>
                <span className="chips-book-editor__dropzone-meta">
                  {config.cover_image ? resolveFileName(config.cover_image) : t("editor.no_cover")}
                </span>
                <input
                  ref={coverInputRef}
                  data-role="cover-file-input"
                  className="chips-book-editor__file-input"
                  type="file"
                  accept={COVER_ACCEPT}
                  disabled={busy !== null}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) {
                      void handleCoverFile(file);
                    }
                  }}
                />
              </label>
            </div>
            <div className="chips-book-editor__actions">
              <ChipsButton
                type="button"
                disabled={!config.cover_image || busy !== null}
                onPress={() => {
                  void clearCover();
                }}
              >
                {t("editor.clear_cover")}
              </ChipsButton>
            </div>
            </div>
          </section>

          <section className="chips-book-editor__group">
            <div className="chips-book-editor__group-head">
              <ChipsText
                as="div"
                className="chips-book-editor__group-title"
                text={t("editor.group.metadata")}
                emphasis="strong"
              />
            </div>
            <ChipsForm.Field name="book_name">
              <ChipsTextField
                data-role="book-name-input"
                value={config.book_name}
                label={t("editor.book_name")}
                ariaLabel={t("editor.book_name")}
                placeholder={t("editor.placeholder.book_name")}
                i18n={i18n}
                onValueChange={(value) => {
                  updateFields({ book_name: value });
                }}
              />
            </ChipsForm.Field>
            <ChipsForm.Field name="book_author">
              <ChipsTextField
                data-role="book-author-input"
                value={config.book_author}
                label={t("editor.book_author")}
                ariaLabel={t("editor.book_author")}
                placeholder={t("editor.placeholder.book_author")}
                i18n={i18n}
                onValueChange={(value) => {
                  updateFields({ book_author: value });
                }}
              />
            </ChipsForm.Field>
            {config.source_type === "image-sequence" ? (
              <label className="chips-book-editor__field-row">
              <span className="chips-book-editor__label">{t("editor.image_sort_basis")}</span>
              <span className="chips-book-editor__control">
                <select
                  data-role="image-sort-select"
                  className="chips-book-editor__select"
                  value={config.image_sort_basis}
                  onChange={(event) => {
                    changeSortBasis(event.currentTarget.value as ImageSortBasis);
                  }}
                >
                  <option value="filename">{t("editor.sort.filename")}</option>
                  <option value="entry-time">{t("editor.sort.entry_time")}</option>
                </select>
              </span>
              </label>
            ) : null}
          </section>

          {validationError ? (
            <ChipsErrorState
              className="chips-book-editor__validation"
              error={validationError}
              title={t("editor.validation_title")}
              description={validationError.message}
              ariaLabel={t("editor.validation_title")}
            />
          ) : null}
        </ChipsForm.Root>
      </div>
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

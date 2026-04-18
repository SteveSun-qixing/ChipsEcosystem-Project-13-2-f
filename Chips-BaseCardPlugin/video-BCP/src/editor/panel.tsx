import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  cloneConfig,
  dedupeResourcePaths,
  normalizeRelativeCardResourcePath,
  resolveFileName,
  sanitizeImportedFileName,
  stripFileExtension,
} from "../shared/utils";
import { extractVideoCoverFile } from "../shared/video-cover";

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

type ResourceField = "video" | "cover";
type BusyField = ResourceField | null;

const VIDEO_ACCEPT = ".mp4,.webm,.mov,.m4v,.ogv,.ogg,video/*";
const COVER_ACCEPT = "image/*";
const SUPPORTED_URL_PROTOCOLS = new Set(["http:", "https:"]);

const EDITOR_STYLE_TEXT = `
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--chips-sys-color-surface, #ffffff);
}

.chips-video-editor {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 18px clamp(12px, 3vw, 20px) 28px;
  color: var(--chips-sys-color-on-surface, #0f172a);
  background: var(--chips-sys-color-surface, #ffffff);
  font: 14px/1.55 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-video-editor,
.chips-video-editor * {
  box-sizing: border-box;
}

.chips-video-editor__shell {
  display: grid;
  gap: 22px;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.chips-video-editor__alert {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.92);
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-video-editor__errors-list {
  margin: 0;
  padding-left: 18px;
}

.chips-video-editor__group {
  display: grid;
  gap: 10px;
}

.chips-video-editor__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.chips-video-editor__group-title {
  margin: 0;
  font-size: 15px;
  font-weight: 720;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.chips-video-editor__status {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}

.chips-video-editor__list {
  display: grid;
}

.chips-video-editor__row,
.chips-video-editor__field-row {
  display: grid;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}

.chips-video-editor__row-label,
.chips-video-editor__field-label {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-video-editor__row-body {
  display: grid;
  gap: 10px;
}

.chips-video-editor__dropzone {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 116px;
  padding: 18px;
  border: 1.5px dashed rgba(15, 23, 42, 0.12);
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.64);
  color: var(--chips-sys-color-on-surface, #0f172a);
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.chips-video-editor__dropzone[data-state="dragover"] {
  border-color: rgba(37, 99, 235, 0.34);
  background: rgba(239, 246, 255, 0.9);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.chips-video-editor__dropzone[data-state="busy"] {
  cursor: progress;
}

.chips-video-editor__dropzone:hover,
.chips-video-editor__dropzone:focus-within {
  border-color: rgba(37, 99, 235, 0.28);
}

.chips-video-editor__dropzone-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.chips-video-editor__dropzone-text {
  font-size: 14px;
  font-weight: 650;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-video-editor__url-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.chips-video-editor__resource-tile {
  position: relative;
  display: grid;
  align-items: stretch;
  min-height: 144px;
  padding: 0;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.7);
  overflow: hidden;
}

.chips-video-editor__resource-tile-body {
  min-width: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
}

.chips-video-editor__resource-preview {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: rgba(226, 232, 240, 0.76);
}

.chips-video-editor__resource-meta {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.96);
}

.chips-video-editor__resource-tile-name {
  display: block;
  font-size: 14px;
  font-weight: 650;
  color: var(--chips-sys-color-on-surface, #0f172a);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.chips-video-editor__resource-delete {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  font: inherit;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease;
  cursor: pointer;
}

.chips-video-editor__resource-tile:hover .chips-video-editor__resource-delete,
.chips-video-editor__resource-tile:focus-within .chips-video-editor__resource-delete {
  opacity: 1;
  pointer-events: auto;
}

.chips-video-editor__button,
.chips-video-editor__input {
  width: 100%;
  min-height: 40px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  color: inherit;
  font: inherit;
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.chips-video-editor__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  font-weight: 650;
  cursor: pointer;
}

.chips-video-editor__button:hover,
.chips-video-editor__button:focus-visible,
.chips-video-editor__input:hover,
.chips-video-editor__input:focus {
  border-color: rgba(37, 99, 235, 0.42);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.chips-video-editor__button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
  box-shadow: none;
}

.chips-video-editor__input {
  padding: 0 14px;
}

.chips-video-editor__field-row {
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
}

@media (max-width: 560px) {
  .chips-video-editor {
    padding-inline: 12px;
  }

  .chips-video-editor__field-row,
  .chips-video-editor__url-row {
    grid-template-columns: 1fr;
  }

  .chips-video-editor__field-row {
    gap: 8px;
  }

  .chips-video-editor__resource-delete {
    opacity: 1;
    pointer-events: auto;
  }
}
`;

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `${fallback} ${error.message.trim()}`.trim();
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return `${fallback} ${error.trim()}`.trim();
  }

  return fallback;
}

function hasMetadataChanged(a: BasecardConfig, b: BasecardConfig): boolean {
  return a.video_title !== b.video_title
    || a.creator !== b.creator
    || a.publish_time !== b.publish_time;
}

function mergePendingMetadata(
  incomingConfig: BasecardConfig,
  draftConfig: BasecardConfig,
): BasecardConfig {
  return normalizeBasecardConfig({
    ...incomingConfig,
    video_title: draftConfig.video_title,
    creator: draftConfig.creator,
    publish_time: draftConfig.publish_time,
  });
}

function isSameConfig(a: BasecardConfig, b: BasecardConfig): boolean {
  return a.card_type === b.card_type
    && a.theme === b.theme
    && a.video_file === b.video_file
    && a.cover_image === b.cover_image
    && a.video_title === b.video_title
    && a.publish_time === b.publish_time
    && a.creator === b.creator;
}

function getVisibleErrors(errors: Record<string, string>): string[] {
  return Object.entries(errors)
    .filter(([field]) => field !== "video_file")
    .map(([, message]) => message);
}

async function resolveResourceUrlWithRetry(
  resolveResourceUrl: ((resourcePath: string) => Promise<string>) | undefined,
  resourcePath: string,
): Promise<string> {
  if (!resolveResourceUrl) {
    return "";
  }

  try {
    return await resolveResourceUrl(resourcePath);
  } catch (firstError) {
    await new Promise((resolve) => setTimeout(resolve, 16));
    return resolveResourceUrl(resourcePath).catch(() => {
      throw firstError;
    });
  }
}

function getImmediateResourceUrl(
  resourcePath: string,
  resolveResourceUrl?: (resourcePath: string) => Promise<string>,
): string {
  const normalizedPath = normalizeRelativeCardResourcePath(resourcePath);
  if (!normalizedPath) {
    return "";
  }

  return resolveResourceUrl ? "" : normalizedPath;
}

function useResolvedEditorResourceUrl(
  resourcePath: string,
  resolveResourceUrl?: (resourcePath: string) => Promise<string>,
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void,
): string {
  const [resolvedUrl, setResolvedUrl] = useState(() => getImmediateResourceUrl(resourcePath, resolveResourceUrl));

  useEffect(() => {
    let cancelled = false;
    const normalizedPath = normalizeRelativeCardResourcePath(resourcePath);

    if (!normalizedPath) {
      setResolvedUrl("");
      return undefined;
    }

    if (!resolveResourceUrl) {
      setResolvedUrl(normalizedPath);
      return undefined;
    }

    setResolvedUrl("");

    void resolveResourceUrlWithRetry(resolveResourceUrl, normalizedPath)
      .then((nextUrl) => {
        if (!cancelled) {
          setResolvedUrl(nextUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUrl("");
        }
      });

    return () => {
      cancelled = true;
      void Promise.resolve(releaseResourceUrl?.(normalizedPath)).catch(() => undefined);
    };
  }, [releaseResourceUrl, resolveResourceUrl, resourcePath]);

  return resolvedUrl;
}

function isSupportedImportUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return SUPPORTED_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function inferExtensionFromMimeType(mimeType: string, fallbackExtension: string): string {
  const lower = mimeType.toLowerCase();

  if (lower.includes("mp4")) {
    return "mp4";
  }
  if (lower.includes("webm")) {
    return "webm";
  }
  if (lower.includes("quicktime")) {
    return "mov";
  }
  if (lower.includes("ogg")) {
    return "ogv";
  }
  if (lower.includes("png")) {
    return "png";
  }
  if (lower.includes("webp")) {
    return "webp";
  }
  if (lower.includes("gif")) {
    return "gif";
  }
  if (lower.includes("jpeg") || lower.includes("jpg")) {
    return "jpg";
  }

  return fallbackExtension;
}

function parseFileNameFromContentDisposition(headerValue: string | null): string | undefined {
  if (!headerValue) {
    return undefined;
  }

  const utf8Match = headerValue.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = headerValue.match(/filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i);
  const candidate = plainMatch?.[1] ?? plainMatch?.[2];
  return candidate?.trim();
}

function buildImportedFileName(options: {
  sourceUrl: string;
  contentDisposition: string | null;
  mimeType: string;
  fallbackStem: string;
  fallbackExtension: string;
}): string {
  const {
    sourceUrl,
    contentDisposition,
    mimeType,
    fallbackStem,
    fallbackExtension,
  } = options;

  const fromHeader = parseFileNameFromContentDisposition(contentDisposition);
  if (fromHeader) {
    return sanitizeImportedFileName(fromHeader, `${fallbackStem}.${inferExtensionFromMimeType(mimeType, fallbackExtension)}`);
  }

  try {
    const parsed = new URL(sourceUrl);
    const fromPath = decodeURIComponent(parsed.pathname.split("/").pop() ?? "").trim();
    if (fromPath) {
      const sanitized = sanitizeImportedFileName(fromPath, fallbackStem);
      if (/\.[^.]+$/u.test(sanitized)) {
        return sanitized;
      }
      return `${sanitizeImportedFileName(sanitized, fallbackStem)}.${inferExtensionFromMimeType(mimeType, fallbackExtension)}`;
    }
  } catch {
    return `${fallbackStem}.${inferExtensionFromMimeType(mimeType, fallbackExtension)}`;
  }

  return `${fallbackStem}.${inferExtensionFromMimeType(mimeType, fallbackExtension)}`;
}

async function downloadFileFromUrl(options: {
  sourceUrl: string;
  fallbackStem: string;
  fallbackExtension: string;
}): Promise<File> {
  const {
    sourceUrl,
    fallbackStem,
    fallbackExtension,
  } = options;

  if (!isSupportedImportUrl(sourceUrl)) {
    throw new Error("URL 不合法。");
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`请求失败（${response.status}）`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || "";
  const fileName = buildImportedFileName({
    sourceUrl,
    contentDisposition: response.headers.get("content-disposition"),
    mimeType,
    fallbackStem,
    fallbackExtension,
  });

  return new File([blob], fileName, {
    type: blob.type || undefined,
  });
}

function VideoResourcePreview(props: { src: string }) {
  const { src } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !src) {
      return;
    }

    const handleLoadedMetadata = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : 0;
      const targetTime = duration > 0.08 ? Math.min(0.08, duration / 2) : 0;

      if (targetTime <= 0) {
        element.pause();
        return;
      }

      try {
        element.currentTime = targetTime;
      } catch {
        element.pause();
      }
    };

    const handleSeeked = () => {
      element.pause();
    };

    element.addEventListener("loadedmetadata", handleLoadedMetadata);
    element.addEventListener("seeked", handleSeeked);

    return () => {
      element.removeEventListener("loadedmetadata", handleLoadedMetadata);
      element.removeEventListener("seeked", handleSeeked);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="chips-video-editor__resource-preview"
      src={src}
      preload="metadata"
      muted
      playsInline
      aria-hidden="true"
    />
  );
}

function BasecardEditor(props: BasecardEditorProps) {
  const [config, setConfig] = useState(() => normalizeBasecardConfig(props.initialConfig));
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    validateBasecardConfig(normalizeBasecardConfig(props.initialConfig)).errors,
  );
  const [panelError, setPanelError] = useState("");
  const [busyField, setBusyField] = useState<BusyField>(null);
  const [dragField, setDragField] = useState<ResourceField | null>(null);
  const [urlDrafts, setUrlDrafts] = useState({
    video: "",
    cover: "",
  });
  const configRef = useRef(config);
  const committedConfigRef = useRef(config);
  const onChangeRef = useRef(props.onChange);
  const t = createTranslator(typeof navigator !== "undefined" ? navigator.language : "zh-CN");

  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);

  useEffect(() => {
    const nextCommittedConfig = normalizeBasecardConfig(props.initialConfig);
    const currentDraftConfig = configRef.current;
    const shouldPreserveDraftMetadata = hasMetadataChanged(currentDraftConfig, committedConfigRef.current);
    const nextLocalConfig = shouldPreserveDraftMetadata
      ? mergePendingMetadata(nextCommittedConfig, currentDraftConfig)
      : nextCommittedConfig;

    committedConfigRef.current = nextCommittedConfig;
    configRef.current = nextLocalConfig;
    setConfig(nextLocalConfig);
    setErrors(validateBasecardConfig(nextLocalConfig).errors);
  }, [props.initialConfig]);

  useEffect(() => {
    return () => {
      const currentConfig = normalizeBasecardConfig(configRef.current);
      const validation = validateBasecardConfig(currentConfig);

      if (validation.valid && hasMetadataChanged(currentConfig, committedConfigRef.current)) {
        onChangeRef.current(cloneConfig(currentConfig));
      }
    };
  }, []);

  const flattenedErrors = useMemo(
    () => getVisibleErrors(errors),
    [errors],
  );
  const videoPreviewUrl = useResolvedEditorResourceUrl(config.video_file, props.resolveResourceUrl, props.releaseResourceUrl);
  const coverPreviewUrl = useResolvedEditorResourceUrl(config.cover_image, props.resolveResourceUrl, props.releaseResourceUrl);

  function applyLocalConfig(nextConfig: BasecardConfig) {
    const normalized = normalizeBasecardConfig(nextConfig);
    const validation = validateBasecardConfig(normalized);

    configRef.current = normalized;
    setConfig(normalized);
    setErrors(validation.errors);

    return {
      normalized,
      validation,
    };
  }

  function emitIfValid(normalizedConfig: BasecardConfig, validation: ReturnType<typeof validateBasecardConfig>): void {
    if (!validation.valid || isSameConfig(normalizedConfig, committedConfigRef.current)) {
      return;
    }

    committedConfigRef.current = normalizedConfig;
    onChangeRef.current(cloneConfig(normalizedConfig));
  }

  function commitConfig(nextConfig: BasecardConfig): void {
    const { normalized, validation } = applyLocalConfig(nextConfig);
    emitIfValid(normalized, validation);
  }

  function updateLocalConfig(patch: Partial<BasecardConfig>): void {
    applyLocalConfig({
      ...configRef.current,
      ...patch,
    });
  }

  function flushMetadataDraft(): void {
    if (!hasMetadataChanged(configRef.current, committedConfigRef.current)) {
      return;
    }

    const currentConfig = normalizeBasecardConfig(configRef.current);
    const validation = validateBasecardConfig(currentConfig);
    setErrors(validation.errors);
    emitIfValid(currentConfig, validation);
  }

  function updateUrlDraft(field: ResourceField, value: string): void {
    setUrlDrafts((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function clearUrlDraft(field: ResourceField): void {
    updateUrlDraft(field, "");
  }

  async function importRequiredResource(file: File, preferredPath: string): Promise<BasecardResourceImportResult> {
    if (!props.importResource) {
      throw new Error(t("video.editor.errors.import_unavailable"));
    }

    return props.importResource({
      file,
      preferredPath,
    });
  }

  async function deleteResourceQuietly(resourcePath: string): Promise<void> {
    const normalizedPath = normalizeRelativeCardResourcePath(resourcePath);
    if (!normalizedPath || !props.deleteResource) {
      return;
    }

    try {
      await props.deleteResource(normalizedPath);
    } catch (error) {
      setPanelError(resolveErrorMessage(error, t("video.editor.errors.delete_failed")));
    }
  }

  async function importVideoFile(file: File): Promise<void> {
    const currentConfig = configRef.current;
    const preferredVideoPath = sanitizeImportedFileName(file.name, "video.mp4");
    const importedVideo = await importRequiredResource(file, preferredVideoPath);
    const nextStem = stripFileExtension(resolveFileName(importedVideo.path) || file.name || "video");
    let nextCoverPath = "";

    try {
      const generatedCoverFile = await extractVideoCoverFile({
        file,
        fileName: `${nextStem}-cover.jpg`,
      });

      if (generatedCoverFile) {
        const importedCover = await importRequiredResource(generatedCoverFile, `${nextStem}-cover.jpg`);
        nextCoverPath = importedCover.path;
      }
    } catch {
      setPanelError(t("video.editor.errors.cover_generate_failed"));
    }

    commitConfig({
      ...currentConfig,
      video_file: importedVideo.path,
      cover_image: nextCoverPath,
    });

    const deletions = dedupeResourcePaths([
      currentConfig.video_file && currentConfig.video_file !== importedVideo.path ? currentConfig.video_file : "",
      currentConfig.cover_image && currentConfig.cover_image !== nextCoverPath ? currentConfig.cover_image : "",
    ]);

    await Promise.all(deletions.map((resourcePath) => deleteResourceQuietly(resourcePath)));
  }

  async function importCoverFile(file: File): Promise<void> {
    const currentConfig = configRef.current;
    const baseName = stripFileExtension(resolveFileName(currentConfig.video_file) || file.name || "video");
    const importedCover = await importRequiredResource(
      file,
      sanitizeImportedFileName(file.name, `${baseName}-cover.jpg`),
    );

    commitConfig({
      ...currentConfig,
      cover_image: importedCover.path,
    });

    if (currentConfig.cover_image && currentConfig.cover_image !== importedCover.path) {
      await deleteResourceQuietly(currentConfig.cover_image);
    }
  }

  async function withBusyField(field: ResourceField, task: () => Promise<void>): Promise<void> {
    setBusyField(field);
    setPanelError("");

    try {
      await task();
    } finally {
      setBusyField((current) => (current === field ? null : current));
      setDragField((current) => (current === field ? null : current));
    }
  }

  async function handleVideoUpload(file: File): Promise<void> {
    await withBusyField("video", async () => {
      try {
        await importVideoFile(file);
      } catch (error) {
        setPanelError(resolveErrorMessage(error, t("video.editor.errors.video_import_failed")));
      }
    });
  }

  async function handleCoverUpload(file: File): Promise<void> {
    await withBusyField("cover", async () => {
      try {
        await importCoverFile(file);
      } catch (error) {
        setPanelError(resolveErrorMessage(error, t("video.editor.errors.cover_import_failed")));
      }
    });
  }

  async function handleUrlImport(field: ResourceField): Promise<void> {
    const sourceUrl = urlDrafts[field].trim();
    if (!sourceUrl) {
      return;
    }

    await withBusyField(field, async () => {
      try {
        const file = await downloadFileFromUrl({
          sourceUrl,
          fallbackStem: field === "video" ? "video-from-url" : "cover-from-url",
          fallbackExtension: field === "video" ? "mp4" : "jpg",
        });

        if (field === "video") {
          await importVideoFile(file);
        } else {
          await importCoverFile(file);
        }

        clearUrlDraft(field);
      } catch (error) {
        setPanelError(resolveErrorMessage(error, t("video.editor.errors.url_import_failed")));
      }
    });
  }

  async function handleRemoveVideo(): Promise<void> {
    const currentConfig = configRef.current;
    commitConfig({
      ...currentConfig,
      video_file: "",
      cover_image: "",
    });
    await Promise.all([
      deleteResourceQuietly(currentConfig.video_file),
      deleteResourceQuietly(currentConfig.cover_image),
    ]);
  }

  async function handleRemoveCover(): Promise<void> {
    const currentPath = configRef.current.cover_image;
    commitConfig({
      ...configRef.current,
      cover_image: "",
    });
    await deleteResourceQuietly(currentPath);
  }

  function renderUploadSurface(options: {
    field: ResourceField;
    accept: string;
    inputRole: string;
    placeholder: string;
    uploadLabel: string;
    urlValue: string;
    inputValue: string;
    onFileSelected: (file: File) => Promise<void>;
  }) {
    const {
      field,
      accept,
      inputRole,
      placeholder,
      uploadLabel,
      urlValue,
      inputValue,
      onFileSelected,
    } = options;
    const isBusy = busyField !== null;
    const dropState = busyField === field ? "busy" : dragField === field ? "dragover" : "idle";

    return (
      <div className="chips-video-editor__row-body">
        <label
          className="chips-video-editor__dropzone"
          data-state={dropState}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!isBusy) {
              setDragField(field);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isBusy) {
              event.dataTransfer.dropEffect = "copy";
              setDragField(field);
            }
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
              return;
            }
            setDragField((current) => (current === field ? null : current));
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragField((current) => (current === field ? null : current));
            if (isBusy) {
              return;
            }
            const file = event.dataTransfer.files?.[0];
            if (file) {
              void onFileSelected(file);
            }
          }}
        >
          <input
            data-role={inputRole}
            className="chips-video-editor__dropzone-input"
            type="file"
            accept={accept}
            disabled={isBusy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) {
                void onFileSelected(file);
              }
              event.currentTarget.value = "";
            }}
          />
          <span className="chips-video-editor__dropzone-text">
            {busyField === field ? t("video.editor.status.uploading") : uploadLabel}
          </span>
        </label>

        <div className="chips-video-editor__url-row">
          <input
            data-role={`${field}-url-input`}
            className="chips-video-editor__input"
            type="text"
            value={urlValue}
            placeholder={placeholder}
            disabled={isBusy}
            onInput={(event) => {
              updateUrlDraft(field, event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleUrlImport(field);
              }
            }}
          />
          <button
            type="button"
            data-role={`${field}-url-submit`}
            className="chips-video-editor__button"
            disabled={isBusy || inputValue.trim().length === 0}
            onClick={() => {
              void handleUrlImport(field);
            }}
          >
            {t("video.editor.actions.import_url")}
          </button>
        </div>
      </div>
    );
  }

  const isBusy = busyField !== null;

  return (
    <div className="chips-video-editor">
      <div className="chips-video-editor__shell">
        {panelError ? (
          <div className="chips-video-editor__alert">{panelError}</div>
        ) : null}

        {flattenedErrors.length > 0 ? (
          <div className="chips-video-editor__alert">
            <ul className="chips-video-editor__errors-list">
              {flattenedErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="chips-video-editor__group">
          <div className="chips-video-editor__group-head">
            <h2 className="chips-video-editor__group-title">{t("video.editor.resources.title")}</h2>
            <span className="chips-video-editor__status">
              {busyField === "video"
                ? t("video.editor.status.video")
                : busyField === "cover"
                  ? t("video.editor.status.cover")
                  : t("video.editor.status.ready")}
            </span>
          </div>

          <div className="chips-video-editor__list">
            <div className="chips-video-editor__row">
              <p className="chips-video-editor__row-label">{t("video.editor.resources.video")}</p>
              {config.video_file ? (
                <div className="chips-video-editor__resource-tile" data-role="video-resource">
                  <div className="chips-video-editor__resource-tile-body">
                    <VideoResourcePreview src={videoPreviewUrl} />
                    <div className="chips-video-editor__resource-meta">
                      <span className="chips-video-editor__resource-tile-name">{resolveFileName(config.video_file)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="chips-video-editor__resource-delete"
                    data-role="remove-video"
                    disabled={isBusy}
                    onClick={() => {
                      void handleRemoveVideo();
                    }}
                  >
                    {t("video.editor.actions.remove")}
                  </button>
                </div>
              ) : renderUploadSurface({
                field: "video",
                accept: VIDEO_ACCEPT,
                inputRole: "video-input",
                placeholder: t("video.editor.placeholders.video_url"),
                uploadLabel: t("video.editor.actions.upload_video"),
                urlValue: urlDrafts.video,
                inputValue: urlDrafts.video,
                onFileSelected: handleVideoUpload,
              })}
            </div>

            <div className="chips-video-editor__row">
              <p className="chips-video-editor__row-label">{t("video.editor.resources.cover")}</p>
              {config.cover_image ? (
                <div className="chips-video-editor__resource-tile" data-role="cover-resource">
                  <div className="chips-video-editor__resource-tile-body">
                    <img
                      className="chips-video-editor__resource-preview"
                      src={coverPreviewUrl}
                      alt=""
                      draggable={false}
                    />
                    <div className="chips-video-editor__resource-meta">
                      <span className="chips-video-editor__resource-tile-name">{resolveFileName(config.cover_image)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="chips-video-editor__resource-delete"
                    data-role="remove-cover"
                    disabled={isBusy}
                    onClick={() => {
                      void handleRemoveCover();
                    }}
                  >
                    {t("video.editor.actions.remove")}
                  </button>
                </div>
              ) : renderUploadSurface({
                field: "cover",
                accept: COVER_ACCEPT,
                inputRole: "cover-input",
                placeholder: t("video.editor.placeholders.cover_url"),
                uploadLabel: t("video.editor.actions.upload_cover"),
                urlValue: urlDrafts.cover,
                inputValue: urlDrafts.cover,
                onFileSelected: handleCoverUpload,
              })}
            </div>
          </div>
        </section>

        <section className="chips-video-editor__group">
          <div className="chips-video-editor__group-head">
            <h2 className="chips-video-editor__group-title">{t("video.editor.meta.title")}</h2>
          </div>

          <form
            className="chips-video-editor__list"
            onSubmit={(event) => {
              event.preventDefault();
              flushMetadataDraft();
            }}
            onBlur={(event) => {
              const nextFocused = event.relatedTarget instanceof Node ? event.relatedTarget : null;
              if (!event.currentTarget.contains(nextFocused)) {
                flushMetadataDraft();
              }
            }}
          >
            <label className="chips-video-editor__field-row">
              <span className="chips-video-editor__field-label">{t("video.editor.fields.video_title")}</span>
              <input
                data-role="video-title-input"
                type="text"
                className="chips-video-editor__input"
                value={config.video_title}
                placeholder={t("video.editor.placeholders.video_title")}
                onInput={(event) => {
                  updateLocalConfig({ video_title: event.currentTarget.value });
                }}
              />
            </label>

            <label className="chips-video-editor__field-row">
              <span className="chips-video-editor__field-label">{t("video.editor.fields.creator")}</span>
              <input
                data-role="creator-input"
                type="text"
                className="chips-video-editor__input"
                value={config.creator}
                placeholder={t("video.editor.placeholders.creator")}
                onInput={(event) => {
                  updateLocalConfig({ creator: event.currentTarget.value });
                }}
              />
            </label>

            <label className="chips-video-editor__field-row">
              <span className="chips-video-editor__field-label">{t("video.editor.fields.publish_time")}</span>
              <input
                data-role="publish-time-input"
                type="text"
                className="chips-video-editor__input"
                value={config.publish_time}
                placeholder={t("video.editor.placeholders.publish_time")}
                onInput={(event) => {
                  updateLocalConfig({ publish_time: event.currentTarget.value });
                }}
              />
            </label>
          </form>
        </section>
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChipsBadge,
  ChipsButton,
  ChipsErrorState,
  ChipsForm,
  ChipsImage,
  ChipsMedia,
  ChipsNumberInput,
  ChipsProgress,
  ChipsSwitch,
  ChipsTextField,
} from "@chips/component-library";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type {
  BasecardResourceImportRequest,
  BasecardResourceImportResult,
  BasecardVideoThumbnailRequest,
  BasecardVideoThumbnailResult,
} from "../index";
import {
  normalizeBasecardConfig,
  validateBasecardConfig,
  type BasecardConfig,
  type SubtitleKind,
  type SubtitleTrackConfig,
} from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import {
  cloneConfig,
  dedupeResourcePaths,
  generateStableId,
  normalizeRelativeCardResourcePath,
  resolveFileName,
  sanitizeImportedFileName,
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
  deleteResource?: (resourcePath: string) => Promise<void>;
  extractVideoThumbnail?: (
    input: BasecardVideoThumbnailRequest,
  ) => Promise<BasecardVideoThumbnailResult>;
}

type EditorRoot = HTMLElement & {
  __chipsDispose?: () => void;
};

type ResourceField = "video" | "cover";
type SubtitleBusyField = `subtitle:${string}`;
type BusyField = ResourceField | SubtitleBusyField | null;

const VIDEO_ACCEPT = ".mp4,.webm,.mov,.m4v,.ogv,.ogg,video/*";
const COVER_ACCEPT = "image/*";
const SUBTITLE_ACCEPT = ".vtt,.srt,.ass,.ssa,text/vtt,text/plain,application/x-subrip";
const SUPPORTED_URL_PROTOCOLS = new Set(["http:", "https:"]);
const DEFAULT_THUMBNAIL_OPTIONS = {
  timeSeconds: 0,
  format: "png",
  width: 1280,
  height: 720,
  fit: "cover",
} as const;

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
  border-radius: 8px;
  background: var(--chips-sys-color-surface-container-low, rgba(248, 250, 252, 0.92));
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-video-editor__alert [data-scope="error-state"][data-part="root"] {
  border: 0;
  background: transparent;
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
  letter-spacing: 0;
}

.chips-video-editor__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  background: var(--chips-sys-color-primary-container, rgba(37, 99, 235, 0.1));
  color: var(--chips-sys-color-on-primary-container, #1d4ed8);
}

.chips-video-editor__status [data-scope="progress"][data-part="root"] {
  width: 44px;
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

.chips-video-editor__row--compact {
  gap: 8px;
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
  border-radius: 8px;
  background: var(--chips-sys-color-surface-container-low, rgba(248, 250, 252, 0.64));
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
  border-radius: 8px;
  background: var(--chips-sys-color-surface-container-low, rgba(248, 250, 252, 0.7));
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
  background: var(--chips-sys-color-surface-container, rgba(226, 232, 240, 0.76));
}

.chips-video-editor__resource-preview[data-scope="image"][data-part="root"],
.chips-video-editor__resource-preview[data-scope="media"][data-part="root"] {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.chips-video-editor__resource-preview [data-scope="image"][data-part="media"],
.chips-video-editor__resource-preview [data-scope="media"][data-part="content"] {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-video-editor__resource-meta {
  padding: 10px 12px;
  background: var(--chips-sys-color-surface, rgba(255, 255, 255, 0.96));
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

.chips-video-editor__resource-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px 12px;
  background: var(--chips-sys-color-surface, rgba(255, 255, 255, 0.96));
}

.chips-video-editor__resource-actions [data-scope="button"][data-part="root"] {
  min-height: 34px;
}

.chips-video-editor__button,
.chips-video-editor__input {
  width: 100%;
  min-height: 40px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 8px;
  background: var(--chips-sys-color-surface, rgba(255, 255, 255, 0.98));
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

.chips-video-editor__input[data-scope="text-field"][data-part="root"] {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 0;
}

.chips-video-editor__input [data-scope="text-field"][data-part="control"] {
  width: 100%;
  min-height: 38px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;
  padding: 0 14px;
}

.chips-video-editor__button [data-scope="button"][data-part="root"] {
  min-height: 40px;
  border-radius: 8px;
}

.chips-video-editor__field-row {
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
}

.chips-video-editor__field-row [data-scope="text-field"][data-part="root"],
.chips-video-editor__field-row [data-scope="number-input"][data-part="root"] {
  width: 100%;
}

.chips-video-editor__field-row [data-scope="text-field"][data-part="label"],
.chips-video-editor__field-row [data-scope="number-input"][data-part="label"] {
  display: none;
}

.chips-video-editor__switch-grid {
  display: grid;
  gap: 10px;
}

.chips-video-editor__switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}

.chips-video-editor__subtitle-list {
  display: grid;
  gap: 10px;
}

.chips-video-editor__subtitle-item {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: var(--chips-sys-color-surface-container-low, rgba(248, 250, 252, 0.76));
}

.chips-video-editor__subtitle-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.chips-video-editor__subtitle-item-title {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.chips-video-editor__subtitle-item-title strong,
.chips-video-editor__subtitle-item-title span {
  overflow-wrap: anywhere;
}

.chips-video-editor__subtitle-fields {
  display: grid;
  gap: 8px;
}

.chips-video-editor__subtitle-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
    || a.publish_time !== b.publish_time
    || a.playback.autoplay !== b.playback.autoplay
    || a.playback.loop !== b.playback.loop
    || a.playback.muted !== b.playback.muted
    || a.playback.playback_rate !== b.playback.playback_rate
    || a.playback.start_time !== b.playback.start_time;
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
    playback: draftConfig.playback,
  });
}

function isSameConfig(a: BasecardConfig, b: BasecardConfig): boolean {
  return a.card_type === b.card_type
    && a.theme === b.theme
    && a.video_file === b.video_file
    && a.cover_image === b.cover_image
    && JSON.stringify(a.subtitles) === JSON.stringify(b.subtitles)
    && JSON.stringify(a.playback) === JSON.stringify(b.playback)
    && a.video_title === b.video_title
    && a.publish_time === b.publish_time
    && a.creator === b.creator;
}

function getVisibleErrors(errors: Record<string, string>): string[] {
  return Object.entries(errors)
    .filter(([field]) => field !== "video_file")
    .map(([, message]) => message);
}

function translateErrorMessages(
  errors: Record<string, string>,
  t: (key: string, params?: Record<string, string | number>) => string,
): string[] {
  return getVisibleErrors(errors).map((message) => t(message));
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

function isSubtitleBusyField(value: BusyField, subtitleId: string): boolean {
  return value === `subtitle:${subtitleId}`;
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
  if (lower.includes("vtt")) {
    return "vtt";
  }
  if (lower.includes("subrip") || lower.includes("srt")) {
    return "srt";
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
  invalidUrlMessage: string;
  requestFailedMessage(status: number): string;
}): Promise<File> {
  const {
    sourceUrl,
    fallbackStem,
    fallbackExtension,
    invalidUrlMessage,
    requestFailedMessage,
  } = options;

  if (!isSupportedImportUrl(sourceUrl)) {
    throw new Error(invalidUrlMessage);
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(requestFailedMessage(response.status));
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

function createSubtitleTrackFromResource(path: string, fileName: string, index: number): SubtitleTrackConfig {
  const baseName = stripFileExtension(resolveFileName(path) || fileName || `subtitle-${index + 1}`);

  return {
    id: generateStableId("subtitle"),
    label: baseName,
    language: "",
    kind: "subtitles",
    file_path: path,
    default: index === 0,
  };
}

function getSubtitleLabel(
  track: SubtitleTrackConfig,
  index: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  return track.label
    || track.language
    || resolveFileName(track.file_path)
    || t("video.editor.subtitles.fallback_label", { index: index + 1 });
}

function getSubtitleKindLabel(
  kind: SubtitleKind,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  return kind === "captions"
    ? t("video.editor.subtitles.kind_captions")
    : t("video.editor.subtitles.kind_subtitles");
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
    subtitle: "",
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
    () => translateErrorMessages(errors, t),
    [errors, t],
  );
  const videoPreviewUrl = useResolvedEditorResourceUrl(config.video_file, props.resolveResourceUrl, props.releaseResourceUrl);
  const coverPreviewUrl = useResolvedEditorResourceUrl(config.cover_image, props.resolveResourceUrl, props.releaseResourceUrl);
  const componentI18n = {
    t,
  };

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

  function updateSubtitleUrlDraft(value: string): void {
    setUrlDrafts((current) => ({
      ...current,
      subtitle: value,
    }));
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

  async function extractVideoThumbnail(
    resourcePath: string,
    preferredPath: string,
  ): Promise<BasecardVideoThumbnailResult | null> {
    const normalizedResourcePath = normalizeRelativeCardResourcePath(resourcePath);
    const normalizedOutputPath = normalizeRelativeCardResourcePath(preferredPath);
    if (!normalizedResourcePath || !normalizedOutputPath || !props.extractVideoThumbnail) {
      return null;
    }

    return props.extractVideoThumbnail({
      resourcePath: normalizedResourcePath,
      outputPath: normalizedOutputPath,
      overwrite: true,
      options: DEFAULT_THUMBNAIL_OPTIONS,
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
    const baseName = stripFileExtension(resolveFileName(importedVideo.path) || file.name || "video");
    const preferredCoverPath = sanitizeImportedFileName(`${baseName}-cover.png`, "video-cover.png");
    let extractedCoverPath = "";
    let thumbnailErrorMessage = "";

    try {
      const thumbnail = await extractVideoThumbnail(importedVideo.path, preferredCoverPath);
      extractedCoverPath = thumbnail?.path ?? "";
    } catch (error) {
      thumbnailErrorMessage = resolveErrorMessage(error, t("video.editor.errors.thumbnail_failed"));
    }

    commitConfig({
      ...currentConfig,
      video_file: importedVideo.path,
      cover_image: extractedCoverPath,
    });

    const deletions = dedupeResourcePaths([
      currentConfig.video_file && currentConfig.video_file !== importedVideo.path ? currentConfig.video_file : "",
      currentConfig.cover_image && currentConfig.cover_image !== extractedCoverPath ? currentConfig.cover_image : "",
    ]);

    await Promise.all(deletions.map((resourcePath) => deleteResourceQuietly(resourcePath)));

    if (thumbnailErrorMessage) {
      setPanelError(thumbnailErrorMessage);
    }
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

  async function importSubtitleFile(file: File, replaceTrackId?: string): Promise<void> {
    const currentConfig = configRef.current;
    const importedSubtitle = await importRequiredResource(
      file,
      sanitizeImportedFileName(file.name, "subtitle.vtt"),
    );
    const existingIndex = currentConfig.subtitles.findIndex((track) => track.id === replaceTrackId);
    const nextTrack = createSubtitleTrackFromResource(
      importedSubtitle.path,
      file.name,
      existingIndex >= 0 ? existingIndex : currentConfig.subtitles.length,
    );
    const nextSubtitles = existingIndex >= 0
      ? currentConfig.subtitles.map((track, index) => (
        index === existingIndex
          ? {
            ...track,
            file_path: importedSubtitle.path,
            label: track.label || nextTrack.label,
          }
          : track
      ))
      : [...currentConfig.subtitles, nextTrack];

    commitConfig({
      ...currentConfig,
      subtitles: nextSubtitles,
    });

    if (existingIndex >= 0) {
      const oldPath = currentConfig.subtitles[existingIndex]?.file_path;
      if (oldPath && oldPath !== importedSubtitle.path) {
        await deleteResourceQuietly(oldPath);
      }
    }
  }

  async function withBusyField(field: BusyField, task: () => Promise<void>): Promise<void> {
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

  async function handleSubtitleUpload(file: File, replaceTrackId?: string): Promise<void> {
    await withBusyField(replaceTrackId ? `subtitle:${replaceTrackId}` : "subtitle:new", async () => {
      try {
        await importSubtitleFile(file, replaceTrackId);
      } catch (error) {
        setPanelError(resolveErrorMessage(error, t("video.editor.errors.subtitle_import_failed")));
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
          invalidUrlMessage: t("video.editor.errors.url_invalid"),
          requestFailedMessage: (status) => t("video.editor.errors.url_request_failed", { status }),
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

  async function handleSubtitleUrlImport(): Promise<void> {
    const sourceUrl = urlDrafts.subtitle.trim();
    if (!sourceUrl) {
      return;
    }

    await withBusyField("subtitle:new", async () => {
      try {
        const file = await downloadFileFromUrl({
          sourceUrl,
          fallbackStem: "subtitle-from-url",
          fallbackExtension: "vtt",
          invalidUrlMessage: t("video.editor.errors.url_invalid"),
          requestFailedMessage: (status) => t("video.editor.errors.url_request_failed", { status }),
        });
        await importSubtitleFile(file);
        updateSubtitleUrlDraft("");
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

  async function handleRemoveSubtitle(trackId: string): Promise<void> {
    const currentConfig = configRef.current;
    const track = currentConfig.subtitles.find((item) => item.id === trackId);
    commitConfig({
      ...currentConfig,
      subtitles: currentConfig.subtitles.filter((item) => item.id !== trackId),
    });
    await deleteResourceQuietly(track?.file_path ?? "");
  }

  function handleUpdateSubtitle(trackId: string, patch: Partial<SubtitleTrackConfig>): void {
    const currentConfig = configRef.current;
    commitConfig({
      ...currentConfig,
      subtitles: currentConfig.subtitles.map((track) => (
        track.id === trackId
          ? {
            ...track,
            ...patch,
            default: patch.default === true ? true : track.default,
          }
          : patch.default === true
            ? { ...track, default: false }
            : track
      )),
    });
  }

  function handlePlaybackPatch(patch: Partial<BasecardConfig["playback"]>): void {
    updateLocalConfig({
      playback: {
        ...configRef.current.playback,
        ...patch,
      },
    });
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
          <ChipsTextField
            data-role={`${field}-url-input`}
            className="chips-video-editor__input"
            value={urlValue}
            ariaLabel={placeholder}
            placeholder={placeholder}
            disabled={isBusy}
            onValueChange={(value) => {
              updateUrlDraft(field, value);
            }}
            onEnterPress={(_value, event) => {
              event?.preventDefault();
              void handleUrlImport(field);
            }}
          />
          <span
            data-role={`${field}-url-submit`}
            className="chips-video-editor__button"
          >
            <ChipsButton
              type="button"
              disabled={isBusy || inputValue.trim().length === 0}
              onPress={() => {
                void handleUrlImport(field);
              }}
            >
              {t("video.editor.actions.import_url")}
            </ChipsButton>
          </span>
        </div>
      </div>
    );
  }

  const isBusy = busyField !== null;

  return (
    <ChipsForm
      className="chips-video-editor"
      onSubmit={(event) => {
        event.preventDefault();
        flushMetadataDraft();
      }}
    >
      <div className="chips-video-editor__shell">
        {panelError ? (
          <div className="chips-video-editor__alert">
            <ChipsErrorState
              message={panelError}
              fallbackTitle={t("video.editor.errors.operation_failed")}
              fallbackDescription={panelError}
              ariaLabel={t("video.editor.errors.operation_failed")}
              i18n={componentI18n}
            />
          </div>
        ) : null}

        {flattenedErrors.length > 0 ? (
          <div className="chips-video-editor__alert">
            <ChipsErrorState
              message={flattenedErrors[0]}
              fallbackTitle={t("video.editor.errors.validation_failed")}
              fallbackDescription={flattenedErrors[0]}
              ariaLabel={t("video.editor.errors.validation_failed")}
              i18n={componentI18n}
            />
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
              {busyField ? (
                <ChipsProgress
                  indeterminate
                  label={t("video.editor.status.uploading")}
                  i18n={componentI18n}
                />
              ) : null}
              {busyField === "video"
                ? t("video.editor.status.video")
                : busyField === "cover"
                  ? t("video.editor.status.cover")
                  : busyField?.startsWith("subtitle:")
                    ? t("video.editor.status.subtitle")
                  : t("video.editor.status.ready")}
            </span>
          </div>

          <div className="chips-video-editor__list">
            <div className="chips-video-editor__row">
              <p className="chips-video-editor__row-label">{t("video.editor.resources.video")}</p>
              {config.video_file ? (
                <div className="chips-video-editor__resource-tile" data-role="video-resource">
                  <div className="chips-video-editor__resource-tile-body">
                    <ChipsMedia
                      className="chips-video-editor__resource-preview"
                      kind="video"
                      src={videoPreviewUrl}
                      title={resolveFileName(config.video_file)}
                      controls
                      preload="metadata"
                    />
                    <div className="chips-video-editor__resource-meta">
                      <span className="chips-video-editor__resource-tile-name">{resolveFileName(config.video_file)}</span>
                    </div>
                  </div>
                  <div className="chips-video-editor__resource-actions">
                    <label className="chips-video-editor__button">
                      {t("video.editor.actions.replace_video")}
                      <input
                        data-role="replace-video-input"
                        className="chips-video-editor__dropzone-input"
                        type="file"
                        accept={VIDEO_ACCEPT}
                        disabled={isBusy}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) {
                            void handleVideoUpload(file);
                          }
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <ChipsButton
                      type="button"
                      disabled={isBusy}
                      onPress={() => {
                        void handleRemoveVideo();
                      }}
                    >
                      {t("video.editor.actions.remove")}
                    </ChipsButton>
                  </div>
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
                    <ChipsImage
                      className="chips-video-editor__resource-preview"
                      src={coverPreviewUrl}
                      alt={resolveFileName(config.cover_image)}
                      fit="cover"
                      loadingStrategy="lazy"
                    />
                    <div className="chips-video-editor__resource-meta">
                      <span className="chips-video-editor__resource-tile-name">{resolveFileName(config.cover_image)}</span>
                    </div>
                  </div>
                  <div className="chips-video-editor__resource-actions">
                    <label className="chips-video-editor__button">
                      {t("video.editor.actions.replace_cover")}
                      <input
                        data-role="replace-cover-input"
                        className="chips-video-editor__dropzone-input"
                        type="file"
                        accept={COVER_ACCEPT}
                        disabled={isBusy}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) {
                            void handleCoverUpload(file);
                          }
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <ChipsButton
                      type="button"
                      disabled={isBusy}
                      onPress={() => {
                        void handleRemoveCover();
                      }}
                    >
                      {t("video.editor.actions.remove")}
                    </ChipsButton>
                  </div>
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
            <h2 className="chips-video-editor__group-title">{t("video.editor.subtitles.title")}</h2>
            <ChipsBadge tone={config.subtitles.length > 0 ? "accent" : "neutral"}>
              {t("video.editor.subtitles.count", { count: config.subtitles.length })}
            </ChipsBadge>
          </div>

          <div className="chips-video-editor__list">
            <div className="chips-video-editor__row">
              <p className="chips-video-editor__row-label">{t("video.editor.subtitles.import")}</p>
              <div className="chips-video-editor__row-body">
                <label
                  className="chips-video-editor__dropzone"
                  data-state={busyField === "subtitle:new" ? "busy" : "idle"}
                  onDragEnter={(event) => {
                    event.preventDefault();
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = isBusy ? "none" : "copy";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (isBusy) {
                      return;
                    }
                    const file = event.dataTransfer.files?.[0];
                    if (file) {
                      void handleSubtitleUpload(file);
                    }
                  }}
                >
                  <input
                    data-role="subtitle-input"
                    className="chips-video-editor__dropzone-input"
                    type="file"
                    accept={SUBTITLE_ACCEPT}
                    disabled={isBusy}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) {
                        void handleSubtitleUpload(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                  <span className="chips-video-editor__dropzone-text">
                    {busyField === "subtitle:new"
                      ? t("video.editor.status.uploading")
                      : t("video.editor.subtitles.upload")}
                  </span>
                </label>

                <div className="chips-video-editor__url-row">
                  <ChipsTextField
                    data-role="subtitle-url-input"
                    className="chips-video-editor__input"
                    value={urlDrafts.subtitle}
                    ariaLabel={t("video.editor.placeholders.subtitle_url")}
                    placeholder={t("video.editor.placeholders.subtitle_url")}
                    disabled={isBusy}
                    onValueChange={(value) => {
                      updateSubtitleUrlDraft(value);
                    }}
                    onEnterPress={(_value, event) => {
                      event?.preventDefault();
                      void handleSubtitleUrlImport();
                    }}
                  />
                  <span
                    data-role="subtitle-url-submit"
                    className="chips-video-editor__button"
                  >
                    <ChipsButton
                      type="button"
                      disabled={isBusy || urlDrafts.subtitle.trim().length === 0}
                      onPress={() => {
                        void handleSubtitleUrlImport();
                      }}
                    >
                      {t("video.editor.actions.import_url")}
                    </ChipsButton>
                  </span>
                </div>
              </div>
            </div>

            {config.subtitles.length > 0 ? (
              <div className="chips-video-editor__subtitle-list">
                {config.subtitles.map((track, index) => (
                  <div key={track.id} className="chips-video-editor__subtitle-item" data-role={`subtitle-${track.id}`}>
                    <div className="chips-video-editor__subtitle-item-head">
                      <div className="chips-video-editor__subtitle-item-title">
                        <strong>{getSubtitleLabel(track, index, t)}</strong>
                        <span>{resolveFileName(track.file_path)}</span>
                      </div>
                      <ChipsBadge tone={track.default ? "accent" : "neutral"}>
                        {track.default ? t("video.editor.subtitles.default") : getSubtitleKindLabel(track.kind, t)}
                      </ChipsBadge>
                    </div>

                    <div className="chips-video-editor__subtitle-fields">
                      <ChipsForm.Field name={`subtitle-label-${track.id}`}>
                        <ChipsForm.Label>{t("video.editor.subtitles.label")}</ChipsForm.Label>
                        <ChipsForm.Control>
                          <ChipsTextField
                            data-role={`subtitle-label-input-${track.id}`}
                            className="chips-video-editor__input"
                            value={track.label}
                            ariaLabel={t("video.editor.subtitles.label")}
                            placeholder={t("video.editor.subtitles.label_placeholder")}
                            onValueChange={(value) => {
                              handleUpdateSubtitle(track.id, { label: value });
                            }}
                          />
                        </ChipsForm.Control>
                      </ChipsForm.Field>
                      <ChipsForm.Field name={`subtitle-language-${track.id}`}>
                        <ChipsForm.Label>{t("video.editor.subtitles.language")}</ChipsForm.Label>
                        <ChipsForm.Control>
                          <ChipsTextField
                            data-role={`subtitle-language-input-${track.id}`}
                            className="chips-video-editor__input"
                            value={track.language}
                            ariaLabel={t("video.editor.subtitles.language")}
                            placeholder={t("video.editor.subtitles.language_placeholder")}
                            onValueChange={(value) => {
                              handleUpdateSubtitle(track.id, { language: value });
                            }}
                          />
                        </ChipsForm.Control>
                      </ChipsForm.Field>
                    </div>

                    <div className="chips-video-editor__switch-row">
                      <span>{t("video.editor.subtitles.default")}</span>
                      <ChipsSwitch
                        checked={track.default}
                        disabled={isBusy}
                        label={t("video.editor.subtitles.default")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleUpdateSubtitle(track.id, { default: true });
                          }
                        }}
                      />
                    </div>

                    <div className="chips-video-editor__subtitle-actions">
                      <label className="chips-video-editor__button">
                        {t("video.editor.subtitles.replace")}
                        <input
                          data-role={`replace-subtitle-input-${track.id}`}
                          className="chips-video-editor__dropzone-input"
                          type="file"
                          accept={SUBTITLE_ACCEPT}
                          disabled={isBusy}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) {
                              void handleSubtitleUpload(file, track.id);
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <ChipsButton
                        type="button"
                        disabled={isBusy || isSubtitleBusyField(busyField, track.id)}
                        onPress={() => {
                          void handleRemoveSubtitle(track.id);
                        }}
                      >
                        {t("video.editor.actions.remove")}
                      </ChipsButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="chips-video-editor__group">
          <div className="chips-video-editor__group-head">
            <h2 className="chips-video-editor__group-title">{t("video.editor.meta.title")}</h2>
          </div>

          <div
            className="chips-video-editor__list"
            onBlur={(event) => {
              const nextFocused = event.relatedTarget instanceof Node ? event.relatedTarget : null;
              if (!event.currentTarget.contains(nextFocused)) {
                flushMetadataDraft();
              }
            }}
          >
            <div className="chips-video-editor__field-row">
              <span className="chips-video-editor__field-label">{t("video.editor.fields.video_title")}</span>
              <ChipsTextField
                data-role="video-title-input"
                className="chips-video-editor__input"
                value={config.video_title}
                ariaLabel={t("video.editor.fields.video_title")}
                placeholder={t("video.editor.placeholders.video_title")}
                onValueChange={(value) => {
                  updateLocalConfig({ video_title: value });
                }}
              />
            </div>

            <div className="chips-video-editor__field-row">
              <span className="chips-video-editor__field-label">{t("video.editor.fields.creator")}</span>
              <ChipsTextField
                data-role="creator-input"
                className="chips-video-editor__input"
                value={config.creator}
                ariaLabel={t("video.editor.fields.creator")}
                placeholder={t("video.editor.placeholders.creator")}
                onValueChange={(value) => {
                  updateLocalConfig({ creator: value });
                }}
              />
            </div>

            <div className="chips-video-editor__field-row">
              <span className="chips-video-editor__field-label">{t("video.editor.fields.publish_time")}</span>
              <ChipsTextField
                data-role="publish-time-input"
                className="chips-video-editor__input"
                value={config.publish_time}
                ariaLabel={t("video.editor.fields.publish_time")}
                placeholder={t("video.editor.placeholders.publish_time")}
                onValueChange={(value) => {
                  updateLocalConfig({ publish_time: value });
                }}
              />
            </div>
          </div>
        </section>

        <section className="chips-video-editor__group">
          <div className="chips-video-editor__group-head">
            <h2 className="chips-video-editor__group-title">{t("video.editor.playback.title")}</h2>
          </div>

          <div
            className="chips-video-editor__list"
            onBlur={(event) => {
              const nextFocused = event.relatedTarget instanceof Node ? event.relatedTarget : null;
              if (!event.currentTarget.contains(nextFocused)) {
                flushMetadataDraft();
              }
            }}
          >
            <div className="chips-video-editor__switch-grid">
              <div className="chips-video-editor__switch-row">
                <span>{t("video.editor.playback.autoplay")}</span>
                <ChipsSwitch
                  checked={config.playback.autoplay}
                  label={t("video.editor.playback.autoplay")}
                  onCheckedChange={(checked) => {
                    handlePlaybackPatch({ autoplay: checked });
                  }}
                />
              </div>
              <div className="chips-video-editor__switch-row">
                <span>{t("video.editor.playback.loop")}</span>
                <ChipsSwitch
                  checked={config.playback.loop}
                  label={t("video.editor.playback.loop")}
                  onCheckedChange={(checked) => {
                    handlePlaybackPatch({ loop: checked });
                  }}
                />
              </div>
              <div className="chips-video-editor__switch-row">
                <span>{t("video.editor.playback.muted")}</span>
                <ChipsSwitch
                  checked={config.playback.muted}
                  label={t("video.editor.playback.muted")}
                  onCheckedChange={(checked) => {
                    handlePlaybackPatch({ muted: checked });
                  }}
                />
              </div>
            </div>

            <label className="chips-video-editor__field-row">
              <span className="chips-video-editor__field-label">{t("video.editor.playback.playback_rate")}</span>
              <ChipsNumberInput
                value={config.playback.playback_rate}
                min={0.25}
                max={4}
                step={0.25}
                label={t("video.editor.playback.playback_rate")}
                onValueChange={(value) => {
                  handlePlaybackPatch({ playback_rate: value ?? 1 });
                }}
              />
            </label>

            <label className="chips-video-editor__field-row">
              <span className="chips-video-editor__field-label">{t("video.editor.playback.start_time")}</span>
              <ChipsNumberInput
                value={config.playback.start_time}
                min={0}
                step={1}
                label={t("video.editor.playback.start_time")}
                onValueChange={(value) => {
                  handlePlaybackPatch({ start_time: value ?? 0 });
                }}
              />
            </label>
          </div>
        </section>
      </div>
    </ChipsForm>
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

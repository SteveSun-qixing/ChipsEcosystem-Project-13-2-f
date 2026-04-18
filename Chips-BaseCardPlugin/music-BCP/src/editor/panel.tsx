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
  type ProductionTeamRole,
} from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import { parseEmbeddedAudioMetadata } from "../shared/audio-metadata";
import {
  buildDerivedResourcePath,
  cloneConfig,
  deriveDisplayTitle,
  generateStableId,
  inferImageExtensionFromMimeType,
  normalizeRelativeCardResourcePath,
  resolveFileExtension,
  resolveResourceUrlWithRetry,
  resolveFileName,
  sanitizeImportedFileName,
  splitArtists,
  stripFileExtension,
  upsertSingerRole,
} from "../shared/utils";
import { DEFAULT_MUSIC_COVER_URL } from "../shared/default-cover";

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

type ResourceField = "audio" | "cover" | "lyrics";
type BusyField = ResourceField | null;

const AUDIO_ACCEPT = ".mp3,.flac,.wav,.ogg,.oga,.m4a,.aac,.opus,.webm,audio/*";
const COVER_ACCEPT = "image/*";
const LYRICS_ACCEPT = ".lrc,.txt,.srt,text/plain";

const EDITOR_STYLE_TEXT = `
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--chips-sys-color-surface, #ffffff);
}

.chips-music-editor {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 12px clamp(12px, 3vw, 18px) 24px;
  color: var(--chips-sys-color-on-surface, #0f172a);
  background: var(--chips-sys-color-surface, #ffffff);
  font: 14px/1.55 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-music-editor,
.chips-music-editor * {
  box-sizing: border-box;
}

.chips-music-editor__shell {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.chips-music-editor__alert {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.92);
  color: var(--chips-sys-color-on-surface, #0f172a);
  font-size: 13px;
}

.chips-music-editor__alert--error {
  color: var(--chips-sys-color-error, #b42318);
}

.chips-music-editor__errors-list {
  margin: 0;
  padding-left: 18px;
}

.chips-music-editor__group {
  padding-top: 14px;
}

.chips-music-editor__group + .chips-music-editor__group {
  margin-top: 18px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.chips-music-editor__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.chips-music-editor__group-title {
  margin: 0;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chips-music-editor__status {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.chips-music-editor__list,
.chips-music-editor__team-list {
  display: grid;
  min-width: 0;
}

.chips-music-editor__team-list {
  gap: 12px;
  margin-top: 12px;
}

.chips-music-editor__list > :last-child,
.chips-music-editor__team-card-body > :last-child {
  border-bottom: none;
}

.chips-music-editor__row,
.chips-music-editor__field-row {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.chips-music-editor__team-item {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.78);
}

.chips-music-editor__row-label,
.chips-music-editor__field-label {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  color: var(--chips-sys-color-on-surface-variant, #334155);
}

.chips-music-editor__row-label {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 8px;
}

.chips-music-editor__field-label {
  padding-top: 8px;
}

.chips-music-editor__label-badge {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
}

.chips-music-editor__row-body,
.chips-music-editor__field-control {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.chips-music-editor__dropzone {
  position: relative;
  display: grid;
  min-height: 84px;
  padding: 14px;
  border: 1.5px dashed rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  background: transparent;
  color: var(--chips-sys-color-on-surface, #0f172a);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.chips-music-editor__dropzone[data-state="dragover"] {
  border-color: rgba(37, 99, 235, 0.34);
  background: rgba(239, 246, 255, 0.9);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.chips-music-editor__dropzone[data-state="busy"] {
  cursor: progress;
}

.chips-music-editor__dropzone:hover,
.chips-music-editor__dropzone:focus-within {
  border-color: rgba(37, 99, 235, 0.28);
}

.chips-music-editor__dropzone-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.chips-music-editor__dropzone-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.chips-music-editor__dropzone-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.chips-music-editor__dropzone-preview {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 50px;
  height: 50px;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.chips-music-editor__dropzone-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-music-editor__dropzone-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: var(--chips-sys-color-on-surface, #0f172a);
  font-size: 12px;
  font-weight: 700;
}

.chips-music-editor__dropzone-text {
  font-size: 14px;
  font-weight: 650;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-music-editor__dropzone-note {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 12px;
}

.chips-music-editor__resource-tile {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.chips-music-editor__resource-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.chips-music-editor__resource-cover {
  width: 72px;
  height: 72px;
  overflow: hidden;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.chips-music-editor__resource-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-music-editor__resource-summary {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.chips-music-editor__resource-summary-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--chips-sys-color-on-surface, #0f172a);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.chips-music-editor__resource-summary-subtitle {
  display: block;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.chips-music-editor__resource-preview--cover {
  display: block;
  width: 72px;
  height: 72px;
  border-radius: 14px;
  object-fit: cover;
  background: rgba(226, 232, 240, 0.76);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.chips-music-editor__audio-preview {
  width: 100%;
  min-height: 40px;
}

.chips-music-editor__resource-meta {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.chips-music-editor__resource-tile-name {
  display: block;
  font-size: 14px;
  font-weight: 650;
  color: var(--chips-sys-color-on-surface, #0f172a);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.chips-music-editor__resource-tile-subtitle {
  display: block;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 12px;
}

.chips-music-editor__resource-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.chips-music-editor__button,
.chips-music-editor__input,
.chips-music-editor__textarea {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.98);
  color: inherit;
  font: inherit;
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.chips-music-editor__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-height: 36px;
  padding: 0 14px;
  font-weight: 650;
  cursor: pointer;
  white-space: nowrap;
}

.chips-music-editor__button--subtle {
  background: rgba(248, 250, 252, 0.92);
}

.chips-music-editor__button--file {
  position: relative;
  overflow: hidden;
}

.chips-music-editor__input {
  width: 100%;
  min-height: 36px;
  padding: 0 12px;
}

.chips-music-editor__textarea {
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  resize: vertical;
}

.chips-music-editor__button:hover,
.chips-music-editor__button:focus-visible,
.chips-music-editor__input:hover,
.chips-music-editor__input:focus,
.chips-music-editor__textarea:hover,
.chips-music-editor__textarea:focus {
  border-color: rgba(37, 99, 235, 0.42);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.chips-music-editor__button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
  box-shadow: none;
}

.chips-music-editor__field-row--multiline {
  align-items: start;
}

.chips-music-editor__hidden-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.chips-music-editor__hint {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 12px;
}

.chips-music-editor__team-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chips-music-editor__team-card-body {
  display: grid;
  gap: 0;
}

.chips-music-editor__team-card-body .chips-music-editor__field-row {
  padding: 10px 0;
}

.chips-music-editor__team-item-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-music-editor__team-card-actions {
  display: flex;
  justify-content: flex-end;
}

.chips-music-editor__team-card-actions .chips-music-editor__button {
  min-width: 96px;
}

.chips-music-editor__team-empty {
  padding: 12px 0 4px;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
}

@media (max-width: 560px) {
  .chips-music-editor {
    padding-inline: 12px;
  }

  .chips-music-editor__row,
  .chips-music-editor__field-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .chips-music-editor__row-label,
  .chips-music-editor__field-label {
    padding-top: 0;
  }

  .chips-music-editor__resource-head {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .chips-music-editor__resource-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .chips-music-editor__dropzone-content {
    align-items: flex-start;
  }

  .chips-music-editor__team-card-actions {
    justify-content: stretch;
  }

  .chips-music-editor__team-card-actions .chips-music-editor__button {
    width: 100%;
  }
}

@media (max-width: 420px) {
  .chips-music-editor__resource-head {
    grid-template-columns: 1fr;
  }

  .chips-music-editor__resource-cover,
  .chips-music-editor__resource-preview--cover {
    width: 64px;
    height: 64px;
  }

  .chips-music-editor__dropzone-content {
    flex-direction: column;
  }
}
`;

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  return fallbackMessage;
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

function dedupeResourcePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.filter((path) => path.trim().length > 0)));
}

function createLyricsFile(fileName: string, content: string): File {
  return new File([content], fileName, {
    type: "text/plain;charset=utf-8",
  });
}

function createArtworkFile(fileName: string, bytes: Uint8Array, mimeType: string): File {
  return new File([bytes], fileName, {
    type: mimeType || "image/jpeg",
  });
}

function normalizeRoleUpdate(
  productionTeam: ProductionTeamRole[],
  roleId: string,
  updater: (role: ProductionTeamRole) => ProductionTeamRole,
): ProductionTeamRole[] {
  return productionTeam.map((role) => (role.id === roleId ? updater(role) : role));
}

function BasecardEditor(props: BasecardEditorProps) {
  const locale = typeof navigator !== "undefined" ? navigator.language : "zh-CN";
  const t = createTranslator(locale);
  const [config, setConfig] = useState(() => normalizeBasecardConfig(props.initialConfig));
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    validateBasecardConfig(normalizeBasecardConfig(props.initialConfig)).errors,
  );
  const [panelError, setPanelError] = useState("");
  const [busyField, setBusyField] = useState<BusyField>(null);
  const [dragField, setDragField] = useState<ResourceField | null>(null);
  const configRef = useRef(config);
  const audioPreviewUrl = useResolvedEditorResourceUrl(config.audio_file, props.resolveResourceUrl, props.releaseResourceUrl);
  const coverPreviewUrl = useResolvedEditorResourceUrl(config.album_cover, props.resolveResourceUrl, props.releaseResourceUrl);
  const hasAudioFile = Boolean(normalizeRelativeCardResourcePath(config.audio_file));
  const displayCoverUrl = coverPreviewUrl || DEFAULT_MUSIC_COVER_URL;
  const displayTitle = deriveDisplayTitle(config) || t("music.view.untitled");
  const lyricsBadge = resolveFileExtension(config.lyrics_file).toUpperCase() || "TXT";

  useEffect(() => {
    const nextConfig = normalizeBasecardConfig(props.initialConfig);
    configRef.current = nextConfig;
    setConfig(nextConfig);
    setErrors(validateBasecardConfig(nextConfig).errors);
  }, [props.initialConfig]);

  const flattenedErrors = useMemo(
    () => Object.entries(errors)
      .filter(([key]) => !(key === "audio_file" && !hasAudioFile))
      .map(([, message]) => message),
    [errors, hasAudioFile],
  );

  function commitConfig(nextConfig: BasecardConfig): void {
    const normalized = normalizeBasecardConfig(nextConfig);
    const validation = validateBasecardConfig(normalized);

    configRef.current = normalized;
    setConfig(normalized);
    setErrors(validation.errors);
    props.onChange(cloneConfig(normalized));
  }

  function updateConfig(patch: Partial<BasecardConfig>): void {
    commitConfig({
      ...configRef.current,
      ...patch,
    });
  }

  async function importRequiredResource(file: File, preferredPath: string): Promise<BasecardResourceImportResult> {
    if (!props.importResource) {
      throw new Error(t("music.editor.errors.import_unavailable"));
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
      setPanelError(resolveErrorMessage(error, t("music.editor.errors.delete_failed")));
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

  async function handleAudioUpload(file: File): Promise<void> {
    await withBusyField("audio", async () => {
      try {
        const preferredAudioPath = sanitizeImportedFileName(file.name, "track.mp3");
        const currentConfig = configRef.current;
        const importedAudio = await importRequiredResource(file, preferredAudioPath);
        const embeddedMetadata = parseEmbeddedAudioMetadata({
          bytes: await file.arrayBuffer(),
          fileName: file.name,
          mimeType: file.type,
        });
        const nextStem = stripFileExtension(resolveFileName(importedAudio.path) || resolveFileName(file.name) || "track");
        const deletions: string[] = [];

        let nextConfig = normalizeBasecardConfig({
          ...currentConfig,
          audio_file: importedAudio.path,
          music_name: embeddedMetadata.title?.trim() || currentConfig.music_name || nextStem,
          album_name: embeddedMetadata.album?.trim() || currentConfig.album_name,
        });

        if (embeddedMetadata.artist?.trim()) {
          nextConfig = normalizeBasecardConfig({
            ...nextConfig,
            production_team: upsertSingerRole(
              nextConfig.production_team,
              splitArtists(embeddedMetadata.artist),
            ),
          });
        }

        if (embeddedMetadata.artwork) {
          const artworkExtension = inferImageExtensionFromMimeType(embeddedMetadata.artwork.mimeType) ?? "jpg";
          const coverFileName = buildDerivedResourcePath(nextStem, "cover", artworkExtension);
          const importedCover = await importRequiredResource(
            createArtworkFile(
              coverFileName,
              embeddedMetadata.artwork.bytes,
              embeddedMetadata.artwork.mimeType,
            ),
            coverFileName,
          );

          if (currentConfig.album_cover && currentConfig.album_cover !== importedCover.path) {
            deletions.push(currentConfig.album_cover);
          }

          nextConfig = normalizeBasecardConfig({
            ...nextConfig,
            album_cover: importedCover.path,
          });
        }

        if (embeddedMetadata.timedLyricsText || embeddedMetadata.lyricsText) {
          const lyricsContent = embeddedMetadata.timedLyricsText || embeddedMetadata.lyricsText || "";
          const lyricsExtension = embeddedMetadata.timedLyricsText ? "lrc" : "txt";
          const lyricsFileName = buildDerivedResourcePath(nextStem, "lyrics", lyricsExtension);
          const importedLyrics = await importRequiredResource(
            createLyricsFile(lyricsFileName, lyricsContent),
            lyricsFileName,
          );

          if (currentConfig.lyrics_file && currentConfig.lyrics_file !== importedLyrics.path) {
            deletions.push(currentConfig.lyrics_file);
          }

          nextConfig = normalizeBasecardConfig({
            ...nextConfig,
            lyrics_file: importedLyrics.path,
          });
        }

        commitConfig(nextConfig);

        if (currentConfig.audio_file && currentConfig.audio_file !== importedAudio.path) {
          deletions.push(currentConfig.audio_file);
        }

        await Promise.all(dedupeResourcePaths(deletions).map((path) => deleteResourceQuietly(path)));
      } catch (error) {
        setPanelError(resolveErrorMessage(error, t("music.editor.errors.audio_import_failed")));
      }
    });
  }

  async function handleCoverUpload(file: File): Promise<void> {
    await withBusyField("cover", async () => {
      try {
        const currentConfig = configRef.current;
        const baseName = resolveFileName(currentConfig.audio_file) || resolveFileName(file.name) || "cover";
        const coverExtension = resolveFileExtension(file.name)
          || inferImageExtensionFromMimeType(file.type)
          || "jpg";
        const preferredCoverPath = buildDerivedResourcePath(baseName, "cover", coverExtension);
        const importedCover = await importRequiredResource(file, preferredCoverPath);

        commitConfig({
          ...currentConfig,
          album_cover: importedCover.path,
        });

        if (currentConfig.album_cover && currentConfig.album_cover !== importedCover.path) {
          await deleteResourceQuietly(currentConfig.album_cover);
        }
      } catch (error) {
        setPanelError(resolveErrorMessage(error, t("music.editor.errors.cover_import_failed")));
      }
    });
  }

  async function handleLyricsUpload(file: File): Promise<void> {
    await withBusyField("lyrics", async () => {
      try {
        const currentConfig = configRef.current;
        const baseName = resolveFileName(currentConfig.audio_file) || resolveFileName(file.name) || "lyrics";
        const preferredLyricsPath = buildDerivedResourcePath(
          baseName,
          "lyrics",
          resolveFileExtension(file.name) || "txt",
        );
        const importedLyrics = await importRequiredResource(file, preferredLyricsPath);

        commitConfig({
          ...currentConfig,
          lyrics_file: importedLyrics.path,
        });

        if (currentConfig.lyrics_file && currentConfig.lyrics_file !== importedLyrics.path) {
          await deleteResourceQuietly(currentConfig.lyrics_file);
        }
      } catch (error) {
        setPanelError(resolveErrorMessage(error, t("music.editor.errors.lyrics_import_failed")));
      }
    });
  }

  async function handleRemoveAudio(): Promise<void> {
    await withBusyField("audio", async () => {
      const currentPath = configRef.current.audio_file;
      commitConfig({
        ...configRef.current,
        audio_file: "",
      });
      await deleteResourceQuietly(currentPath);
    });
  }

  async function handleRemoveCover(): Promise<void> {
    await withBusyField("cover", async () => {
      const currentPath = configRef.current.album_cover;
      commitConfig({
        ...configRef.current,
        album_cover: "",
      });
      await deleteResourceQuietly(currentPath);
    });
  }

  async function handleRemoveLyrics(): Promise<void> {
    await withBusyField("lyrics", async () => {
      const currentPath = configRef.current.lyrics_file;
      commitConfig({
        ...configRef.current,
        lyrics_file: "",
      });
      await deleteResourceQuietly(currentPath);
    });
  }

  function handleAddTeamRole(): void {
    commitConfig({
      ...configRef.current,
      production_team: [
        ...configRef.current.production_team,
        {
          id: generateStableId("team"),
          role: "",
          people: [],
        },
      ],
    });
  }

  function handleUpdateTeamRole(roleId: string, patch: Partial<ProductionTeamRole>): void {
    commitConfig({
      ...configRef.current,
      production_team: normalizeRoleUpdate(
        configRef.current.production_team,
        roleId,
        (role) => ({
          ...role,
          ...patch,
        }),
      ),
    });
  }

  function handleRemoveTeamRole(roleId: string): void {
    commitConfig({
      ...configRef.current,
      production_team: configRef.current.production_team.filter((role) => role.id !== roleId),
    });
  }

  function renderUploadSurface(options: {
    field: ResourceField;
    accept: string;
    inputRole: string;
    uploadLabel: string;
    note?: string;
    preview?: React.ReactNode;
    onFileSelected: (file: File) => Promise<void>;
  }) {
    const {
      field,
      accept,
      inputRole,
      uploadLabel,
      note,
      preview,
      onFileSelected,
    } = options;
    const dropState = busyField === field ? "busy" : dragField === field ? "dragover" : "idle";
    const isBusy = busyField !== null;

    return (
      <div className="chips-music-editor__row-body">
        <label
          className="chips-music-editor__dropzone"
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
            className="chips-music-editor__dropzone-input"
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

          <span className="chips-music-editor__dropzone-content">
            {preview}
            <span className="chips-music-editor__dropzone-copy">
              <span className="chips-music-editor__dropzone-text">
                {busyField === field ? t(`music.editor.status.${field}`) : uploadLabel}
              </span>
              {note ? (
                <span className="chips-music-editor__dropzone-note">{note}</span>
              ) : null}
            </span>
          </span>
        </label>
      </div>
    );
  }

  return (
    <div className="chips-music-editor">
      <div className="chips-music-editor__shell">
        {panelError ? (
          <div className="chips-music-editor__alert chips-music-editor__alert--error">{panelError}</div>
        ) : null}

        {flattenedErrors.length > 0 ? (
          <div className="chips-music-editor__alert chips-music-editor__alert--error">
            <ul className="chips-music-editor__errors-list">
              {flattenedErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="chips-music-editor__group">
          <div className="chips-music-editor__group-head">
            <span className="chips-music-editor__group-title">{t("music.editor.resources.title")}</span>
            {busyField ? (
              <span className="chips-music-editor__status">{t(`music.editor.status.${busyField}`)}</span>
            ) : null}
          </div>

          <div className="chips-music-editor__list">
            <div className="chips-music-editor__row">
              <p className="chips-music-editor__row-label">
                <span>{t("music.editor.audio.title")}</span>
                <span className="chips-music-editor__label-badge">{t("music.editor.badge.required")}</span>
              </p>
              {config.audio_file ? (
                <div className="chips-music-editor__resource-tile" data-role="audio-resource">
                  <div className="chips-music-editor__resource-head">
                    <div className="chips-music-editor__resource-cover" aria-hidden="true">
                      <img src={displayCoverUrl} alt="" draggable={false} />
                    </div>
                    <div className="chips-music-editor__resource-summary">
                      <span className="chips-music-editor__resource-summary-title">{displayTitle}</span>
                      <span className="chips-music-editor__resource-summary-subtitle">
                        {resolveFileName(config.audio_file)}
                      </span>
                    </div>
                    <div className="chips-music-editor__resource-actions">
                      <label className="chips-music-editor__button chips-music-editor__button--file">
                        {t("music.editor.audio.replace")}
                        <input
                          data-role="replace-audio-input"
                          className="chips-music-editor__hidden-input"
                          type="file"
                          accept={AUDIO_ACCEPT}
                          disabled={busyField !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) {
                              void handleAudioUpload(file);
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        data-role="remove-audio"
                        className="chips-music-editor__button chips-music-editor__button--subtle"
                        disabled={busyField !== null}
                        onClick={() => {
                          void handleRemoveAudio();
                        }}
                      >
                        {t("music.editor.actions.remove")}
                      </button>
                    </div>
                  </div>
                  <div className="chips-music-editor__resource-meta">
                    {audioPreviewUrl ? (
                      <audio
                        className="chips-music-editor__audio-preview"
                        controls
                        preload="metadata"
                        src={audioPreviewUrl}
                      />
                    ) : null}
                    <span className="chips-music-editor__resource-tile-subtitle">
                      {t("music.editor.audio.autofill")}
                    </span>
                  </div>
                </div>
              ) : renderUploadSurface({
                field: "audio",
                accept: AUDIO_ACCEPT,
                inputRole: "audio-input",
                uploadLabel: t("music.editor.audio.upload"),
                note: t("music.editor.audio.required"),
                onFileSelected: handleAudioUpload,
              })}
            </div>

            <div className="chips-music-editor__row">
              <p className="chips-music-editor__row-label">{t("music.editor.cover.title")}</p>
              {config.album_cover ? (
                <div className="chips-music-editor__resource-tile" data-role="cover-resource">
                  <div className="chips-music-editor__resource-head">
                    <img
                      className="chips-music-editor__resource-preview--cover"
                      src={displayCoverUrl}
                      alt=""
                      draggable={false}
                    />
                    <div className="chips-music-editor__resource-meta">
                      <span className="chips-music-editor__resource-tile-name">{resolveFileName(config.album_cover)}</span>
                      <span className="chips-music-editor__resource-tile-subtitle">{t("music.editor.cover.selected")}</span>
                    </div>
                    <div className="chips-music-editor__resource-actions">
                      <label className="chips-music-editor__button chips-music-editor__button--file">
                        {t("music.editor.cover.replace")}
                        <input
                          data-role="replace-cover-input"
                          className="chips-music-editor__hidden-input"
                          type="file"
                          accept={COVER_ACCEPT}
                          disabled={busyField !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) {
                              void handleCoverUpload(file);
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        data-role="remove-cover"
                        className="chips-music-editor__button chips-music-editor__button--subtle"
                        disabled={busyField !== null}
                        onClick={() => {
                          void handleRemoveCover();
                        }}
                      >
                        {t("music.editor.cover.remove")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : renderUploadSurface({
                field: "cover",
                accept: COVER_ACCEPT,
                inputRole: "cover-input",
                uploadLabel: t("music.editor.cover.upload"),
                note: t("music.editor.cover.default_placeholder"),
                preview: (
                  <span className="chips-music-editor__dropzone-preview" aria-hidden="true">
                    <img src={DEFAULT_MUSIC_COVER_URL} alt="" draggable={false} />
                  </span>
                ),
                onFileSelected: handleCoverUpload,
              })}
            </div>

            <div className="chips-music-editor__row">
              <p className="chips-music-editor__row-label">{t("music.editor.lyrics.title")}</p>
              {config.lyrics_file ? (
                <div className="chips-music-editor__resource-tile" data-role="lyrics-resource">
                  <div className="chips-music-editor__resource-head">
                    <span className="chips-music-editor__dropzone-badge">{lyricsBadge}</span>
                    <div className="chips-music-editor__resource-meta">
                      <span className="chips-music-editor__resource-tile-name">{resolveFileName(config.lyrics_file)}</span>
                    </div>
                    <div className="chips-music-editor__resource-actions">
                      <label className="chips-music-editor__button chips-music-editor__button--file">
                        {t("music.editor.lyrics.replace")}
                        <input
                          data-role="replace-lyrics-input"
                          className="chips-music-editor__hidden-input"
                          type="file"
                          accept={LYRICS_ACCEPT}
                          disabled={busyField !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) {
                              void handleLyricsUpload(file);
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        data-role="remove-lyrics"
                        className="chips-music-editor__button chips-music-editor__button--subtle"
                        disabled={busyField !== null}
                        onClick={() => {
                          void handleRemoveLyrics();
                        }}
                      >
                        {t("music.editor.lyrics.remove")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : renderUploadSurface({
                field: "lyrics",
                accept: LYRICS_ACCEPT,
                inputRole: "lyrics-input",
                uploadLabel: t("music.editor.lyrics.upload"),
                preview: (
                  <span className="chips-music-editor__dropzone-badge" aria-hidden="true">LRC / TXT</span>
                ),
                onFileSelected: handleLyricsUpload,
              })}
            </div>
          </div>
        </section>

        <section className="chips-music-editor__group">
          <div className="chips-music-editor__group-head">
            <span className="chips-music-editor__group-title">{t("music.editor.metadata.title")}</span>
          </div>

          <div className="chips-music-editor__list">
            <label className="chips-music-editor__field-row">
              <span className="chips-music-editor__field-label">{t("music.editor.fields.music_name")}</span>
              <div className="chips-music-editor__field-control">
                <input
                  data-role="music-name-input"
                  type="text"
                  className="chips-music-editor__input"
                  value={config.music_name}
                  placeholder={deriveDisplayTitle(config) || t("music.editor.fields.music_name_placeholder")}
                  onInput={(event) => {
                    updateConfig({ music_name: event.currentTarget.value });
                  }}
                />
              </div>
            </label>

            <label className="chips-music-editor__field-row">
              <span className="chips-music-editor__field-label">{t("music.editor.fields.album_name")}</span>
              <div className="chips-music-editor__field-control">
                <input
                  data-role="album-name-input"
                  type="text"
                  className="chips-music-editor__input"
                  value={config.album_name}
                  placeholder={t("music.editor.fields.album_name_placeholder")}
                  onInput={(event) => {
                    updateConfig({ album_name: event.currentTarget.value });
                  }}
                />
              </div>
            </label>

            <label className="chips-music-editor__field-row">
              <span className="chips-music-editor__field-label">{t("music.editor.fields.release_date")}</span>
              <div className="chips-music-editor__field-control">
                <input
                  data-role="release-date-input"
                  type="date"
                  className="chips-music-editor__input"
                  value={config.release_date}
                  onInput={(event) => {
                    updateConfig({ release_date: event.currentTarget.value });
                  }}
                />
              </div>
            </label>

            <label className="chips-music-editor__field-row">
              <span className="chips-music-editor__field-label">{t("music.editor.fields.language")}</span>
              <div className="chips-music-editor__field-control">
                <input
                  data-role="language-input"
                  type="text"
                  className="chips-music-editor__input"
                  value={config.language}
                  placeholder={t("music.editor.fields.language_placeholder")}
                  onInput={(event) => {
                    updateConfig({ language: event.currentTarget.value });
                  }}
                />
              </div>
            </label>

            <label className="chips-music-editor__field-row">
              <span className="chips-music-editor__field-label">{t("music.editor.fields.genre")}</span>
              <div className="chips-music-editor__field-control">
                <input
                  data-role="genre-input"
                  type="text"
                  className="chips-music-editor__input"
                  value={config.genre}
                  placeholder={t("music.editor.fields.genre_placeholder")}
                  onInput={(event) => {
                    updateConfig({ genre: event.currentTarget.value });
                  }}
                />
              </div>
            </label>
          </div>
        </section>

        <section className="chips-music-editor__group">
          <div className="chips-music-editor__group-head">
            <span className="chips-music-editor__group-title">{t("music.editor.team.title")}</span>
            <button
              type="button"
              className="chips-music-editor__button chips-music-editor__button--subtle"
              onClick={handleAddTeamRole}
            >
              {t("music.editor.team.add_role")}
            </button>
          </div>

          {config.production_team.length > 0 ? (
            <div className="chips-music-editor__team-list">
              {config.production_team.map((role) => (
                <div key={role.id} className="chips-music-editor__team-item">
                  <div className="chips-music-editor__team-item-head">
                    <span className="chips-music-editor__team-item-title">
                      {role.role || t("music.editor.team.role_placeholder")}
                    </span>
                  </div>

                  <div className="chips-music-editor__team-card-body">
                    <label className="chips-music-editor__field-row">
                      <span className="chips-music-editor__field-label">{t("music.editor.team.role_label")}</span>
                      <div className="chips-music-editor__field-control">
                        <input
                          data-role={`team-role-input-${role.id}`}
                          type="text"
                          className="chips-music-editor__input"
                          value={role.role}
                          placeholder={t("music.editor.team.role_placeholder")}
                          onInput={(event) => {
                            handleUpdateTeamRole(role.id, {
                              role: event.currentTarget.value,
                            });
                          }}
                        />
                      </div>
                    </label>

                    <label className="chips-music-editor__field-row chips-music-editor__field-row--multiline">
                      <span className="chips-music-editor__field-label">{t("music.editor.team.people_label")}</span>
                      <div className="chips-music-editor__field-control">
                        <textarea
                          data-role={`team-people-input-${role.id}`}
                          className="chips-music-editor__textarea"
                          value={role.people.join("\n")}
                          placeholder={t("music.editor.team.people_placeholder")}
                          onInput={(event) => {
                            handleUpdateTeamRole(role.id, {
                              people: event.currentTarget.value
                                .split(/\r?\n/u)
                                .map((item) => item.trim())
                                .filter((item) => item.length > 0),
                            });
                          }}
                        />
                        <span className="chips-music-editor__hint">{t("music.editor.team.people_hint")}</span>
                      </div>
                    </label>
                  </div>

                  <div className="chips-music-editor__team-card-actions">
                    <button
                      type="button"
                      className="chips-music-editor__button"
                      onClick={() => {
                        handleRemoveTeamRole(role.id);
                      }}
                    >
                      {t("music.editor.team.remove_role")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="chips-music-editor__team-empty">{t("music.editor.team.empty")}</div>
          )}
        </section>
      </div>
    </div>
  );
}

export function createBasecardEditorRoot(props: BasecardEditorProps): HTMLElement {
  const rootElement = document.createElement("div") as EditorRoot;
  rootElement.setAttribute("data-chips-music-editor-root", "true");
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

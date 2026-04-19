import type { MusicCardOpenPayload } from "chips-sdk";
import type { LyricsDocument } from "./lyrics";

export interface LaunchAudioTarget {
  sourceId: string;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  title?: string;
  musicCard?: MusicCardOpenPayload;
}

export interface AudioSource {
  sourceId: string;
  filePath?: string;
  fileName: string;
  title: string;
  resourceUri: string;
  mimeType?: string;
  extension?: string;
  revision: number;
  isRemote: boolean;
}

export type ArtworkSourceKind = "default" | "embedded" | "companion";

export interface TrackPresentation {
  source: AudioSource;
  artist: string;
  album: string;
  artworkUri: string;
  artworkKind: ArtworkSourceKind;
  lyrics: LyricsDocument;
}

export interface FileSelectionBundle {
  audioPath?: string;
  lyricsPath?: string;
  coverPath?: string;
}

export interface ViewerFeedback {
  tone: "info" | "success" | "error";
  message: string;
}

export const SUPPORTED_AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav", ".ogg", ".oga", ".m4a", ".aac", ".opus", ".webm"];
export const SUPPORTED_AUDIO_EXTENSION_LABEL = SUPPORTED_AUDIO_EXTENSIONS.join(" ");
export const SUPPORTED_ARTWORK_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
export const SUPPORTED_LYRIC_EXTENSIONS = [".lrc", ".txt"];

const MIME_BY_EXTENSION: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".opus": "audio/ogg",
  ".webm": "audio/webm",
};

export function resolveExtension(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    const pathname = parsed.pathname.trim().toLowerCase();
    const dotIndex = pathname.lastIndexOf(".");
    return dotIndex >= 0 ? pathname.slice(dotIndex) : "";
  } catch {
    const lowered = normalized.toLowerCase();
    const slashIndex = Math.max(lowered.lastIndexOf("/"), lowered.lastIndexOf("\\"));
    const dotIndex = lowered.lastIndexOf(".");
    if (dotIndex <= slashIndex) {
      return "";
    }
    return lowered.slice(dotIndex);
  }
}

export function resolveFileName(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    const pathname = parsed.pathname.trim();
    if (pathname) {
      const segments = pathname.split("/").filter(Boolean);
      return segments[segments.length - 1] ?? pathname;
    }
  } catch {
    // ignore and continue with plain path parsing
  }

  const segments = normalized.split(/[\\/]/).filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? normalized;
}

export function resolveTrackTitle(target: LaunchAudioTarget): string {
  return target.title?.trim() || target.fileName?.trim() || resolveFileName(target.filePath ?? target.sourceId) || target.sourceId;
}

export function resolveStem(value: string): string {
  const fileName = resolveFileName(value);
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return fileName;
  }
  return fileName.slice(0, dotIndex);
}

export function resolveDirectoryPath(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const separatorIndex = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (separatorIndex <= 0) {
    return "";
  }

  return normalized.slice(0, separatorIndex);
}

export function joinPath(dir: string, fileName: string): string {
  if (!dir) {
    return fileName;
  }

  const separator = dir.includes("\\") ? "\\" : "/";
  return `${dir.replace(/[\\/]+$/, "")}${separator}${fileName}`;
}

export function inferAudioMimeType(value: string): string | undefined {
  const extension = resolveExtension(value);
  return MIME_BY_EXTENSION[extension];
}

export function resolveAudioFormatLabel(value: string, mimeType?: string): string {
  const extension = resolveExtension(value);
  if (extension) {
    return extension.slice(1).toUpperCase();
  }

  const normalizedMimeType = mimeType?.trim().toLowerCase();
  if (!normalizedMimeType) {
    return "";
  }

  const subtype = normalizedMimeType.split("/")[1] ?? normalizedMimeType;
  return subtype.replace(/^x-/, "").toUpperCase();
}

export function isSupportedAudioResource(target: LaunchAudioTarget): boolean {
  const mimeType = target.mimeType?.trim().toLowerCase();
  if (mimeType?.startsWith("audio/")) {
    return true;
  }

  const extension = resolveExtension(target.filePath ?? target.sourceId);
  return SUPPORTED_AUDIO_EXTENSIONS.includes(extension);
}

export function isAudioFilePath(value: string): boolean {
  return SUPPORTED_AUDIO_EXTENSIONS.includes(resolveExtension(value));
}

export function isImageFilePath(value: string): boolean {
  return SUPPORTED_ARTWORK_EXTENSIONS.includes(resolveExtension(value));
}

export function isLyricsFilePath(value: string): boolean {
  return SUPPORTED_LYRIC_EXTENSIONS.includes(resolveExtension(value));
}

export function isDirectPlayableUri(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return ["file:", "http:", "https:", "blob:", "data:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isLikelyLocalPath(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "file:";
  } catch {
    return true;
  }
}

export function resolveFileSelection(paths: string[]): FileSelectionBundle {
  const selection: FileSelectionBundle = {};

  for (const path of paths) {
    if (!selection.audioPath && isAudioFilePath(path)) {
      selection.audioPath = path;
      continue;
    }

    if (!selection.coverPath && isImageFilePath(path)) {
      selection.coverPath = path;
      continue;
    }

    if (!selection.lyricsPath && isLyricsFilePath(path)) {
      selection.lyricsPath = path;
    }
  }

  return selection;
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.85;
  }
  return Math.min(1, Math.max(0, value));
}

export function clampPlaybackTime(value: number, duration: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    return Math.max(0, value);
  }

  return Math.min(duration, Math.max(0, value));
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "00:00";
  }

  const safeSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatRemainingDuration(totalSeconds: number, currentTime: number): string {
  const remaining = Math.max(0, totalSeconds - currentTime);
  return `-${formatDuration(remaining)}`;
}

export function resolveMediaErrorKey(error: MediaError | null): string {
  if (!error) {
    return "mediaSource";
  }

  switch (error.code) {
    case 1:
      return "mediaAborted";
    case 2:
      return "mediaNetwork";
    case 3:
      return "mediaDecode";
    case 4:
      return "mediaSource";
    default:
      return "loadFailed";
  }
}

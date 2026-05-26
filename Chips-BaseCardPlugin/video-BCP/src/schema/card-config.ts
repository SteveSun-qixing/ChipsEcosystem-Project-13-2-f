import { isNonEmptyString, normalizeRelativeCardResourcePath } from "../shared/utils";

export type SubtitleKind = "subtitles" | "captions";

export interface SubtitleTrackConfig {
  id: string;
  label: string;
  language: string;
  kind: SubtitleKind;
  file_path: string;
  default: boolean;
}

export interface PlaybackConfig {
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  playback_rate: number;
  start_time: number;
}

export interface BasecardConfig {
  card_type: "VideoCard";
  theme?: string;
  video_file: string;
  cover_image: string;
  subtitles: SubtitleTrackConfig[];
  playback: PlaybackConfig;
  video_title: string;
  publish_time: string;
  creator: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const defaultBasecardConfig: BasecardConfig = {
  card_type: "VideoCard",
  theme: "",
  video_file: "",
  cover_image: "",
  subtitles: [],
  playback: {
    autoplay: false,
    loop: false,
    muted: false,
    playback_rate: 1,
    start_time: 0,
  },
  video_title: "",
  publish_time: "",
  creator: "",
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeSubtitleKind(value: unknown): SubtitleKind {
  return value === "captions" ? "captions" : "subtitles";
}

function normalizePlayback(input: unknown): PlaybackConfig {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const playbackRate = clampNumber(asFiniteNumber(record.playback_rate, 1), 0.25, 4);
  const startTime = Math.max(0, asFiniteNumber(record.start_time, 0));

  return {
    autoplay: asBoolean(record.autoplay),
    loop: asBoolean(record.loop),
    muted: asBoolean(record.muted),
    playback_rate: Number(playbackRate.toFixed(2)),
    start_time: Number(startTime.toFixed(3)),
  };
}

function normalizeSubtitleTrack(input: unknown, index: number): SubtitleTrackConfig | null {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const filePath = normalizeRelativeCardResourcePath(record.file_path);

  if (!filePath) {
    return null;
  }

  return {
    id: asString(record.id) || `subtitle-${index + 1}`,
    label: asString(record.label),
    language: asString(record.language),
    kind: normalizeSubtitleKind(record.kind),
    file_path: filePath,
    default: asBoolean(record.default),
  };
}

export function normalizeBasecardConfig(
  input: Partial<BasecardConfig> | Record<string, unknown> | null | undefined
): BasecardConfig {
  const record = (input ?? {}) as Record<string, unknown>;
  const subtitles = Array.isArray(record.subtitles)
    ? record.subtitles
      .map((item, index) => normalizeSubtitleTrack(item, index))
      .filter((item): item is SubtitleTrackConfig => item !== null)
    : [];

  const defaultSubtitleId = subtitles.find((track) => track.default)?.id;

  return {
    card_type: "VideoCard",
    theme: asString(record.theme),
    video_file: normalizeRelativeCardResourcePath(record.video_file) ?? defaultBasecardConfig.video_file,
    cover_image: normalizeRelativeCardResourcePath(record.cover_image) ?? defaultBasecardConfig.cover_image,
    subtitles: subtitles.map((track) => ({
      ...track,
      default: Boolean(defaultSubtitleId && track.id === defaultSubtitleId),
    })),
    playback: normalizePlayback(record.playback),
    video_title: asString(record.video_title),
    publish_time: asString(record.publish_time),
    creator: asString(record.creator),
  };
}

export function validateBasecardConfig(config: BasecardConfig): ConfigValidationResult {
  const errors: Record<string, string> = {};

  if (config.card_type !== "VideoCard") {
    errors.card_type = "video.validation.card_type";
  }

  if (!isNonEmptyString(config.video_file)) {
    errors.video_file = "video.validation.video_file_required";
  }

  if (config.cover_image && !normalizeRelativeCardResourcePath(config.cover_image)) {
    errors.cover_image = "video.validation.cover_path_invalid";
  }

  const subtitleIds = new Set<string>();
  config.subtitles.forEach((subtitle, index) => {
    if (!subtitle.id) {
      errors[`subtitles.${index}.id`] = "video.validation.subtitle_id_required";
    }
    if (subtitleIds.has(subtitle.id)) {
      errors[`subtitles.${index}.id`] = "video.validation.subtitle_id_duplicate";
    }
    subtitleIds.add(subtitle.id);

    if (!normalizeRelativeCardResourcePath(subtitle.file_path)) {
      errors[`subtitles.${index}.file_path`] = "video.validation.subtitle_path_invalid";
    }
  });

  if (config.playback.playback_rate < 0.25 || config.playback.playback_rate > 4) {
    errors["playback.playback_rate"] = "video.validation.playback_rate_range";
  }

  if (config.playback.start_time < 0) {
    errors["playback.start_time"] = "video.validation.start_time_non_negative";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

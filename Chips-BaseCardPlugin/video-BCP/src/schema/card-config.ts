import { isNonEmptyString, normalizeRelativeCardResourcePath } from "../shared/utils";

export interface BasecardConfig {
  card_type: "VideoCard";
  theme?: string;
  video_file: string;
  cover_image: string;
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
  video_title: "",
  publish_time: "",
  creator: "",
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export function normalizeBasecardConfig(
  input: Partial<BasecardConfig> | Record<string, unknown> | null | undefined
): BasecardConfig {
  const record = (input ?? {}) as Record<string, unknown>;

  return {
    card_type: "VideoCard",
    theme: asString(record.theme) ?? defaultBasecardConfig.theme,
    video_file: normalizeRelativeCardResourcePath(record.video_file) ?? defaultBasecardConfig.video_file,
    cover_image: normalizeRelativeCardResourcePath(record.cover_image) ?? defaultBasecardConfig.cover_image,
    video_title: asString(record.video_title) ?? defaultBasecardConfig.video_title,
    publish_time: asString(record.publish_time) ?? defaultBasecardConfig.publish_time,
    creator: asString(record.creator) ?? defaultBasecardConfig.creator,
  };
}

export function validateBasecardConfig(config: BasecardConfig): ConfigValidationResult {
  const errors: Record<string, string> = {};

  if (config.card_type !== "VideoCard") {
    errors.card_type = "card_type 必须为 VideoCard。";
  }

  if (!isNonEmptyString(config.video_file)) {
    errors.video_file = "视频文件不能为空。";
  }

  if (config.cover_image && !normalizeRelativeCardResourcePath(config.cover_image)) {
    errors.cover_image = "封面资源路径必须是相对于卡片根目录的路径。";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

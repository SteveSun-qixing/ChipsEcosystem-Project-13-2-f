import { isNonEmptyString, normalizeRelativeCardResourcePath } from "../shared/utils";

export interface ProductionTeamRole {
  id: string;
  role: string;
  people: string[];
}

export interface BasecardConfig {
  card_type: "MusicCard";
  theme?: string;
  audio_file: string;
  music_name: string;
  album_cover: string;
  lyrics_file: string;
  production_team: ProductionTeamRole[];
  release_date: string;
  album_name: string;
  language: string;
  genre: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const defaultBasecardConfig: BasecardConfig = {
  card_type: "MusicCard",
  theme: "",
  audio_file: "",
  music_name: "",
  album_cover: "",
  lyrics_file: "",
  production_team: [],
  release_date: "",
  album_name: "",
  language: "",
  genre: "",
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProductionTeamRole(input: unknown, index: number): ProductionTeamRole | null {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const role = asString(record.role);
  const people = Array.isArray(record.people)
    ? record.people
      .map((value) => asString(value))
      .filter((value) => value.length > 0)
    : [];

  const hasExplicitShape = typeof record.id === "string" || "role" in record || "people" in record;

  if (!role && people.length === 0 && !hasExplicitShape) {
    return null;
  }

  return {
    id: asString(record.id) || `team-role-${index + 1}`,
    role,
    people,
  };
}

export function normalizeBasecardConfig(
  input: Partial<BasecardConfig> | Record<string, unknown> | null | undefined,
): BasecardConfig {
  const record = (input ?? {}) as Record<string, unknown>;
  const productionTeam = Array.isArray(record.production_team)
    ? record.production_team
      .map((item, index) => normalizeProductionTeamRole(item, index))
      .filter((item): item is ProductionTeamRole => item !== null)
    : [];

  return {
    card_type: "MusicCard",
    theme: asString(record.theme),
    audio_file: normalizeRelativeCardResourcePath(record.audio_file) ?? "",
    music_name: asString(record.music_name),
    album_cover: normalizeRelativeCardResourcePath(record.album_cover) ?? "",
    lyrics_file: normalizeRelativeCardResourcePath(record.lyrics_file) ?? "",
    production_team: productionTeam,
    release_date: asString(record.release_date),
    album_name: asString(record.album_name),
    language: asString(record.language),
    genre: asString(record.genre),
  };
}

export function validateBasecardConfig(config: BasecardConfig): ConfigValidationResult {
  const errors: Record<string, string> = {};

  if (config.card_type !== "MusicCard") {
    errors.card_type = "card_type 必须为 MusicCard。";
  }

  if (!isNonEmptyString(config.audio_file)) {
    errors.audio_file = "音频文件不能为空。";
  }

  if (config.release_date && !/^\d{4}-\d{2}-\d{2}$/.test(config.release_date)) {
    errors.release_date = "发行日期必须使用 YYYY-MM-DD。";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

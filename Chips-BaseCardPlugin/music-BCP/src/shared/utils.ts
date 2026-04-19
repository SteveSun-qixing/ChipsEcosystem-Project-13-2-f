import type { BasecardConfig, ProductionTeamRole } from "../schema/card-config";

const BASE62_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const SINGER_ROLE_KEYWORDS = [
  "歌手",
  "演唱",
  "主唱",
  "artist",
  "singer",
  "vocal",
  "vocals",
  "performer",
] as const;

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function cloneConfig<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function generateStableId(prefix: string, length = 10): string {
  let id = "";

  for (let index = 0; index < length; index += 1) {
    id += BASE62_ALPHABET[Math.floor(Math.random() * BASE62_ALPHABET.length)];
  }

  return `${prefix}-${id}`;
}

export function sanitizeImportedFileName(fileName: string, fallbackStem: string): string {
  const sanitized = fileName
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() ?? "";

  return sanitized || fallbackStem;
}

export function normalizeRelativeCardResourcePath(value: unknown): string | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  const normalized = value.replace(/\\/g, "/").trim().replace(/^\.?\//, "");
  if (!normalized) {
    return undefined;
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    return undefined;
  }

  return segments.join("/");
}

export function resolveFileName(resourcePath: string | undefined): string {
  const normalized = normalizeRelativeCardResourcePath(resourcePath);
  if (!normalized) {
    return "";
  }

  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? "";
}

export function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/u, "");
}

export function resolveFileExtension(fileName: string): string {
  const match = /\.([^.]+)$/u.exec(resolveFileName(fileName));
  return match?.[1]?.toLowerCase() ?? "";
}

export function buildDerivedResourcePath(
  stemInput: string,
  suffix: string,
  extension: string,
): string {
  const baseStem = stripFileExtension(resolveFileName(stemInput) || stemInput || "resource") || "resource";
  const sanitizedStem = stripFileExtension(
    sanitizeImportedFileName(baseStem, "resource"),
  ) || "resource";
  const sanitizedExtension = extension.trim().replace(/^\./u, "").toLowerCase().replace(/[^a-z0-9]+/gu, "") || "bin";

  return `${sanitizedStem}-${suffix}.${sanitizedExtension}`;
}

export function inferAudioMimeType(resourcePath: string): string | undefined {
  const lower = resolveFileName(resourcePath).toLowerCase();

  if (lower.endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (lower.endsWith(".flac")) {
    return "audio/flac";
  }
  if (lower.endsWith(".wav")) {
    return "audio/wav";
  }
  if (lower.endsWith(".ogg") || lower.endsWith(".oga")) {
    return "audio/ogg";
  }
  if (lower.endsWith(".m4a")) {
    return "audio/mp4";
  }
  if (lower.endsWith(".aac")) {
    return "audio/aac";
  }
  if (lower.endsWith(".opus")) {
    return "audio/opus";
  }
  if (lower.endsWith(".webm")) {
    return "audio/webm";
  }

  return undefined;
}

export function inferImageExtensionFromMimeType(mimeType: string | undefined): string | undefined {
  const normalized = mimeType?.trim().toLowerCase() ?? "";

  switch (normalized) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/bmp":
      return "bmp";
    case "image/svg+xml":
      return "svg";
    case "image/avif":
      return "avif";
    case "image/tiff":
    case "image/tif":
      return "tiff";
    default:
      return undefined;
  }
}

export function isTiffMimeType(mimeType: string | undefined): boolean {
  const normalized = mimeType?.trim().toLowerCase() ?? "";
  return normalized === "image/tiff" || normalized === "image/tif";
}

export async function resolveResourceUrlWithRetry(
  resolveResourceUrl: ((resourcePath: string) => Promise<string>) | undefined,
  resourcePath: string,
): Promise<string> {
  if (!resolveResourceUrl) {
    return "";
  }

  const retryDelaysMs = [24, 72, 160, 320, 640];
  let firstError: unknown;

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return await resolveResourceUrl(resourcePath);
    } catch (error) {
      firstError ??= error;
      if (attempt === retryDelaysMs.length) {
        throw firstError;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
    }
  }

  throw firstError;
}

export function collectInternalResourcePaths(config: BasecardConfig): string[] {
  const paths = new Set<string>();

  [config.audio_file, config.album_cover, config.lyrics_file].forEach((resourcePath) => {
    const normalized = normalizeRelativeCardResourcePath(resourcePath);
    if (normalized) {
      paths.add(normalized);
    }
  });

  return Array.from(paths);
}

export function splitArtists(value: string): string[] {
  return value
    .split(/(?:\s*\/\s*|\s*&\s*|\s*,\s*|\s*;\s*|\s+feat\.?\s+|\s+ft\.?\s+|、|，)/iu)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isSingerRole(role: string): boolean {
  const normalized = role.trim().toLowerCase();
  return SINGER_ROLE_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function derivePrimaryArtist(config: BasecardConfig): string {
  const singerRole = config.production_team.find((role) => isSingerRole(role.role) && role.people.length > 0);
  if (singerRole) {
    return singerRole.people.join(" / ");
  }

  const firstRole = config.production_team.find((role) => role.people.length > 0);
  return firstRole ? firstRole.people.join(" / ") : "";
}

export function deriveDisplayTitle(config: BasecardConfig): string {
  if (isNonEmptyString(config.music_name)) {
    return config.music_name.trim();
  }

  const audioFileName = resolveFileName(config.audio_file);
  if (audioFileName) {
    return stripFileExtension(audioFileName);
  }

  return "";
}

export function upsertSingerRole(
  productionTeam: ProductionTeamRole[],
  people: string[],
): ProductionTeamRole[] {
  const normalizedPeople = people
    .map((person) => person.trim())
    .filter((person) => person.length > 0);

  if (normalizedPeople.length === 0) {
    return productionTeam;
  }

  const cloned = cloneConfig(productionTeam);
  const existingIndex = cloned.findIndex((role) => isSingerRole(role.role));

  if (existingIndex >= 0) {
    cloned[existingIndex] = {
      ...cloned[existingIndex],
      role: cloned[existingIndex].role || "歌手",
      people: normalizedPeople,
    };
    return cloned;
  }

  return [
    {
      id: generateStableId("team"),
      role: "歌手",
      people: normalizedPeople,
    },
    ...cloned,
  ];
}

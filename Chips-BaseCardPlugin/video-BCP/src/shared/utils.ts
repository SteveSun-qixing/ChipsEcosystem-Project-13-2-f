import type { BasecardConfig } from "../schema/card-config";

const BASE62_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

export function inferVideoMimeType(resourcePath: string): string | undefined {
  const lower = resolveFileName(resourcePath).toLowerCase();

  if (lower.endsWith(".mp4")) {
    return "video/mp4";
  }
  if (lower.endsWith(".webm")) {
    return "video/webm";
  }
  if (lower.endsWith(".mov")) {
    return "video/quicktime";
  }
  if (lower.endsWith(".m4v")) {
    return "video/x-m4v";
  }
  if (lower.endsWith(".ogv") || lower.endsWith(".ogg")) {
    return "video/ogg";
  }

  return undefined;
}

export function collectInternalResourcePaths(config: BasecardConfig): string[] {
  const paths = new Set<string>();

  [config.video_file, config.cover_image].forEach((resourcePath) => {
    const normalized = normalizeRelativeCardResourcePath(resourcePath);
    if (normalized) {
      paths.add(normalized);
    }
  });

  return Array.from(paths);
}

export function dedupeResourcePaths(resourcePaths: string[]): string[] {
  return Array.from(new Set(
    resourcePaths
      .map((resourcePath) => normalizeRelativeCardResourcePath(resourcePath))
      .filter((resourcePath): resourcePath is string => Boolean(resourcePath)),
  ));
}

export function deriveDisplayTitle(config: BasecardConfig): string {
  if (isNonEmptyString(config.video_title)) {
    return config.video_title.trim();
  }

  const fileName = resolveFileName(config.video_file);
  if (fileName) {
    return stripFileExtension(fileName);
  }

  return "";
}

export function deriveMetaLine(config: BasecardConfig): string {
  return [config.creator.trim(), config.publish_time.trim()]
    .filter((value) => value.length > 0)
    .join(" · ");
}

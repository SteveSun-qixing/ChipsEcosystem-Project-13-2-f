import type {
  BasecardConfig,
  BookImageItem,
  BookSourceType,
  ImageSortBasis,
} from "../schema/card-config";

const BASE62_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const SUPPORTED_EBOOK_FORMATS = [
  "epub",
  "epub3",
  "pdf",
  "txt",
  "md",
  "markdown",
  "mobi",
  "azw",
  "azw3",
  "fb2",
  "djvu",
  "djv",
  "rtf",
  "doc",
  "docx",
] as const;

export const ARCHIVE_FORMATS = ["zip", "cbz"] as const;

const EBOOK_MIME_BY_FORMAT: Record<string, string> = {
  epub: "application/epub+zip",
  epub3: "application/epub+zip",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  mobi: "application/x-mobipocket-ebook",
  azw: "application/vnd.amazon.ebook",
  azw3: "application/vnd.amazon.ebook",
  fb2: "application/x-fictionbook+xml",
  djvu: "image/vnd.djvu",
  djv: "image/vnd.djvu",
  rtf: "application/rtf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  avif: "image/avif",
  svg: "image/svg+xml",
  tiff: "image/tiff",
  tif: "image/tiff",
};

export interface BookOpenResource {
  resourceId: string;
  relativePath: string;
  fileName?: string;
  mimeType?: string;
}

export interface BookCardOpenPayload {
  kind: "chips.book-card";
  version: "1.0.0";
  cardType: "base.book";
  mode: "ebook" | "image-sequence";
  resources: {
    book?: BookOpenResource;
    images?: BookOpenResource[];
  };
  display: {
    title: string;
    author?: string;
  };
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function cloneConfig<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function generateStableId(length = 10): string {
  let id = "";
  for (let index = 0; index < length; index += 1) {
    id += BASE62_ALPHABET[Math.floor(Math.random() * BASE62_ALPHABET.length)];
  }

  return id;
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

export function sanitizeImportedFileName(fileName: string, fallback = "book-resource"): string {
  const trimmed = fileName.trim();
  const sanitized = trimmed
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() ?? "";

  return sanitized.length > 0 ? sanitized : fallback;
}

export function sanitizeRelativeEntryPath(entryPath: string, fallbackFileName: string): string {
  const segments = entryPath
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => sanitizeImportedFileName(segment, ""))
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..");

  if (segments.length === 0) {
    return sanitizeImportedFileName(fallbackFileName, "image");
  }

  return segments.join("/");
}

export function sanitizeFolderName(name: string): string {
  const withoutExtension = stripFileExtension(name);
  return sanitizeImportedFileName(withoutExtension, "book-images");
}

export function resolveFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const lastDot = normalized.lastIndexOf(".");
  if (lastDot < 0 || lastDot === normalized.length - 1) {
    return "";
  }

  return normalized.slice(lastDot + 1);
}

export function stripFileExtension(fileName: string): string {
  const normalized = fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
  const lastDot = normalized.lastIndexOf(".");
  if (lastDot <= 0) {
    return normalized;
  }

  return normalized.slice(0, lastDot);
}

export function resolveFileName(resourcePath: string): string {
  return resourcePath.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "";
}

export function normalizeBookFormat(value: unknown): string {
  const format = typeof value === "string" ? value.trim().toLowerCase().replace(/^\./, "") : "";
  if (format === "epub3") {
    return "epub3";
  }

  if (format === "markdown") {
    return "md";
  }

  return format;
}

export function inferBookFormatFromFileName(fileName: string): string {
  const ext = resolveFileExtension(fileName);
  if (ext === "epub") {
    return "epub";
  }

  return normalizeBookFormat(ext);
}

export function isSupportedEbookFormat(format: string): boolean {
  return SUPPORTED_EBOOK_FORMATS.includes(normalizeBookFormat(format) as (typeof SUPPORTED_EBOOK_FORMATS)[number]);
}

export function isArchiveFormat(format: string): boolean {
  return ARCHIVE_FORMATS.includes(normalizeBookFormat(format) as (typeof ARCHIVE_FORMATS)[number]);
}

export function inferBookMimeType(formatOrPath: string): string | undefined {
  const normalized = normalizeBookFormat(formatOrPath.includes(".")
    ? inferBookFormatFromFileName(formatOrPath)
    : formatOrPath);

  return EBOOK_MIME_BY_FORMAT[normalized];
}

export function inferImageMimeTypeFromPath(fileName: string): string | undefined {
  return IMAGE_MIME_BY_EXTENSION[resolveFileExtension(fileName)];
}

export function detectImageMimeType(bytes: Uint8Array, fileName?: string): string | undefined {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return "image/gif";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }

  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    bytes[11] === 0x66
  ) {
    return "image/avif";
  }

  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  ) {
    return "image/tiff";
  }

  const extensionMime = fileName ? inferImageMimeTypeFromPath(fileName) : undefined;
  if (extensionMime === "image/svg+xml") {
    const snippet = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 512))).toLowerCase();
    return snippet.includes("<svg") ? "image/svg+xml" : undefined;
  }

  return extensionMime;
}

export function isImageFileName(fileName: string): boolean {
  return Boolean(inferImageMimeTypeFromPath(fileName));
}

export function dedupeResourcePaths(paths: unknown[]): string[] {
  const result = new Set<string>();

  for (const path of paths) {
    const normalized = normalizeRelativeCardResourcePath(path);
    if (normalized) {
      result.add(normalized);
    }
  }

  return Array.from(result);
}

export function collectInternalResourcePaths(config: BasecardConfig): string[] {
  return dedupeResourcePaths([
    config.book_file,
    config.cover_image,
    ...config.image_sequence.map((item) => item.file_path),
    ...config.resource_paths,
  ]);
}

export function getRemovedInternalResourcePaths(previous: BasecardConfig, next: BasecardConfig): string[] {
  const previousPaths = new Set(collectInternalResourcePaths(previous));
  const nextPaths = new Set(collectInternalResourcePaths(next));
  const removed: string[] = [];

  for (const resourcePath of previousPaths) {
    if (!nextPaths.has(resourcePath)) {
      removed.push(resourcePath);
    }
  }

  return removed;
}

export function deriveDisplayTitle(config: BasecardConfig, fallback: string): string {
  if (isNonEmptyString(config.book_name)) {
    return config.book_name.trim();
  }

  if (isNonEmptyString(config.book_file)) {
    return stripFileExtension(resolveFileName(config.book_file));
  }

  return fallback;
}

export function deriveDisplayAuthor(config: BasecardConfig, fallback: string): string {
  return isNonEmptyString(config.book_author) ? config.book_author.trim() : fallback;
}

export function formatBookFormatLabel(config: BasecardConfig): string {
  if (config.source_type === "image-sequence") {
    return config.book_format === "cbz" ? "CBZ" : "ZIP";
  }

  return config.book_format ? config.book_format.toUpperCase() : "";
}

export function buildOpenResourceDescriptor(
  resourceId: string,
  resourcePath: string,
  mimeType?: string,
): BookOpenResource | null {
  const normalizedResourceId = resourceId.trim();
  const normalizedRelativePath = normalizeRelativeCardResourcePath(resourcePath);
  if (!normalizedResourceId || !normalizedRelativePath) {
    return null;
  }

  return {
    resourceId: normalizedResourceId,
    relativePath: normalizedRelativePath,
    fileName: resolveFileName(normalizedRelativePath) || undefined,
    mimeType,
  };
}

export function sortImageItems(
  images: BookImageItem[],
  basis: ImageSortBasis,
): BookImageItem[] {
  const copied = images.map((image, index) => ({ image, index }));
  const hasDistinctEntryTime = new Set(
    copied
      .map(({ image }) => image.entry_time)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  ).size > 1;

  copied.sort((left, right) => {
    if (basis === "entry-time" && hasDistinctEntryTime) {
      const leftTime = left.image.entry_time;
      const rightTime = right.image.entry_time;
      if (typeof leftTime === "number" && typeof rightTime === "number" && leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      if (typeof leftTime === "number" && typeof rightTime !== "number") {
        return -1;
      }
      if (typeof leftTime !== "number" && typeof rightTime === "number") {
        return 1;
      }
    }

    const byName = compareFileNames(left.image.source_entry_path || left.image.file_name, right.image.source_entry_path || right.image.file_name);
    return byName === 0 ? left.index - right.index : byName;
  });

  return copied.map(({ image }) => image);
}

export function compareFileNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function createResourcePathsForConfig(input: {
  sourceType: BookSourceType;
  bookFile?: string;
  coverImage?: string;
  images?: BookImageItem[];
  resourcePaths?: string[];
}): string[] {
  return dedupeResourcePaths([
    input.sourceType === "ebook" ? input.bookFile : "",
    input.coverImage,
    ...(input.images ?? []).map((image) => image.file_path),
    ...(input.resourcePaths ?? []),
  ]);
}

export async function resolveResourceUrlWithRetry(
  resolveResourceUrl: (resourcePath: string) => Promise<string>,
  resourcePath: string,
  retryCount = 3,
  retryDelayMs = 80,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retryCount; attempt += 1) {
    try {
      return await resolveResourceUrl(resourcePath);
    } catch (error) {
      lastError = error;
      if (attempt < retryCount - 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, retryDelayMs);
        });
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("资源解析失败");
}

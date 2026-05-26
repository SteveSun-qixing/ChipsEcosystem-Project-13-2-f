export const MARKDOWN_CONTENT_FORMAT = "markdown" as const;
export const MAX_INLINE_RICHTEXT_LENGTH = 200;
export const RICHTEXT_CARD_TYPE = "base.richtext" as const;
export const LEGACY_RICHTEXT_CARD_TYPE = "RichTextCard" as const;
export const DEFAULT_RICHTEXT_MARKDOWN = "# 富文本\n\n开始写点什么。";

const MARKDOWN_RESOURCE_PATTERN = /!?\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)|<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>|<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+$/gm, "")
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export function normalizeResourcePath(resourcePath: unknown): string {
  if (typeof resourcePath !== "string") {
    return "";
  }

  const normalized = resourcePath.replace(/\\/g, "/").trim();
  if (!normalized) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized) || normalized.startsWith("//") || normalized.startsWith("/")) {
    return "";
  }

  const withoutPrefix = normalized.replace(/^\.?\//, "");
  if (
    withoutPrefix.startsWith("/") ||
    withoutPrefix.includes("?") ||
    withoutPrefix.includes("#")
  ) {
    return "";
  }

  const segments = withoutPrefix.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    return "";
  }

  return segments.join("/");
}

export function isExternalUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//") || value.startsWith("#");
}

export function isRelativeResourcePath(value: string | undefined): value is string {
  return isNonEmptyString(value) && normalizeResourcePath(value).length > 0;
}

export function isMarkdownFilePath(value: string | undefined): value is string {
  if (!isRelativeResourcePath(value)) {
    return false;
  }
  const normalized = normalizeResourcePath(value);
  return normalized.toLowerCase().endsWith(".md");
}

export function dedupeResourcePaths(paths: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  for (const path of paths) {
    const normalized = normalizeResourcePath(path);
    if (normalized) {
      seen.add(normalized);
    }
  }
  return Array.from(seen);
}

export function collectMarkdownResourcePaths(markdown: string): string[] {
  const paths: string[] = [];
  for (const match of markdown.matchAll(MARKDOWN_RESOURCE_PATTERN)) {
    const rawPath = match[1] ?? match[2] ?? match[3] ?? "";
    const normalized = normalizeResourcePath(rawPath);
    if (normalized) {
      paths.push(normalized);
    }
  }
  return dedupeResourcePaths(paths);
}

export function createRichTextMarkdownFileName(seed?: string): string {
  const safeSeed = (seed ?? "")
    .trim()
    .replace(/[^0-9a-zA-Z_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (safeSeed) {
    return `richtext-${safeSeed}.md`;
  }

  const fallback = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 10)
    : `${Date.now()}`;

  return `richtext-${fallback}.md`;
}

export function extractPlainTextFromMarkdown(markdown: string): string {
  const normalized = normalizeMarkdown(markdown);
  if (!normalized) {
    return "";
  }

  return normalized
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, "$1")
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}(?:[-*+] |\d+\. )/gm, "")
    .replace(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/gm, " ")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/\+\+([^+]+)\+\+/g, "$1")
    .replace(/\^([^^]+)\^/g, "$1")
    .replace(/~([^~]+)~/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\\([\\`*{}\[\]()#+\-.!_>~|])/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countUnicodeCharacters(text: string): number {
  return Array.from(text).length;
}

export function countPlainTextLengthFromMarkdown(markdown: string): number {
  return countUnicodeCharacters(extractPlainTextFromMarkdown(markdown));
}

export function hasMeaningfulMarkdownContent(markdown: string): boolean {
  if (countPlainTextLengthFromMarkdown(markdown) > 0) {
    return true;
  }

  const normalized = normalizeMarkdown(markdown);
  if (!normalized) {
    return false;
  }

  return /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/m.test(normalized);
}

export function shouldUseFileStorage(plainTextLength: number): boolean {
  return plainTextLength > MAX_INLINE_RICHTEXT_LENGTH;
}

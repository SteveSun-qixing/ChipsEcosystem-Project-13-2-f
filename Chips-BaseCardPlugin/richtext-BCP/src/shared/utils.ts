export const MARKDOWN_CONTENT_FORMAT = "markdown" as const;
export const MAX_INLINE_RICHTEXT_LENGTH = 200;
export const DEFAULT_RICHTEXT_MARKDOWN = "123456789";

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

export function normalizeResourcePath(resourcePath: string): string {
  const normalized = resourcePath.replace(/\\/g, "/").trim();
  if (!normalized) {
    return "";
  }
  return normalized.replace(/^\.\//, "").replace(/^\//, "");
}

export function isExternalUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//") || value.startsWith("#");
}

export function isRelativeResourcePath(value: string | undefined): value is string {
  return isNonEmptyString(value) && !isExternalUrl(value.trim());
}

export function isMarkdownFilePath(value: string | undefined): value is string {
  if (!isRelativeResourcePath(value)) {
    return false;
  }
  const normalized = normalizeResourcePath(value);
  return normalized.toLowerCase().endsWith(".md");
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
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}(?:[-*+] |\d+\. )/gm, "")
    .replace(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/gm, " ")
    .replace(/~~([^~]+)~~/g, "$1")
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

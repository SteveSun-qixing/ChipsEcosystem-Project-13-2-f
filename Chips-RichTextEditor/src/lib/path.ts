function splitPath(input: string): string[] {
  return input.replace(/\\/g, "/").split("/").filter((segment) => segment.length > 0);
}

export function joinPath(...parts: string[]): string {
  return parts
    .filter((part) => part.trim().length > 0)
    .join("/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
}

export function dirname(input: string): string {
  const normalized = input.replace(/\\/g, "/").trim();
  if (!normalized) {
    return "";
  }

  const slashIndex = normalized.lastIndexOf("/");
  if (slashIndex <= 0) {
    return slashIndex === 0 ? "/" : "";
  }

  return normalized.slice(0, slashIndex);
}

export function basename(input: string): string {
  const normalized = input.replace(/\\/g, "/").trim();
  if (!normalized) {
    return "";
  }

  const slashIndex = normalized.lastIndexOf("/");
  return slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
}

export function stripCardExtension(input: string): string {
  return stripExtension(input, ".card");
}

export function stripExtension(input: string, extension: string): string {
  return input.toLowerCase().endsWith(extension.toLowerCase())
    ? input.slice(0, -extension.length)
    : input;
}

export function ensureCardExtension(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.toLowerCase().endsWith(".card") ? trimmed : `${trimmed}.card`;
}

export function sanitizeFileStem(input: string): string {
  const collapsed = input.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ");
  return collapsed.length > 0 ? collapsed : "untitled";
}

export function normalizeRelativeResourcePath(input: string | null | undefined): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const normalized = input.replace(/\\/g, "/").trim().replace(/^\.?\//, "");
  if (!normalized) {
    return null;
  }

  const segments = splitPath(normalized);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  return segments.join("/");
}

export function toFileUrl(absolutePath: string): string {
  const url = new URL("file:///");
  url.pathname = absolutePath.replace(/\\/g, "/");
  return url.toString();
}

export interface SessionRuntimePaths {
  runtimeRoot: string;
  runtimeDir: string;
  workDir: string;
}

export function createSessionRuntimePaths(targetFilePath: string, sessionId: string): SessionRuntimePaths {
  const parentDir = dirname(targetFilePath);
  const runtimeRoot = joinPath(parentDir, ".chips-rich-text-editor-runtime");
  const runtimeDir = joinPath(runtimeRoot, sessionId);
  const workDir = joinPath(runtimeDir, "card");

  return {
    runtimeRoot,
    runtimeDir,
    workDir,
  };
}

import type { BasecardConfig } from "../schema/card-config";

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

export function dedupeResourcePaths(paths: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const path of paths) {
    const normalized = normalizeRelativeCardResourcePath(path);
    if (normalized) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
}

export function validateWebpageUrl(value: string): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:";
  } catch {
    return false;
  }
}

export function getBundleEntryPath(config: BasecardConfig): string | undefined {
  const bundleRoot = normalizeRelativeCardResourcePath(config.bundle_root);
  const entryFile = normalizeRelativeCardResourcePath(config.entry_file) ?? "index.html";
  if (!bundleRoot) {
    return undefined;
  }

  return `${bundleRoot}/${entryFile}`.replace(/\/+/g, "/");
}

export function cloneConfig<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

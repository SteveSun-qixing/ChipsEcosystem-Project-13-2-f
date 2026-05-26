import path from "node:path";
import { parse, stringify } from "yaml";
import type { CommunityCardPublishContext } from "./types";

const STRUCTURAL_CARD_FILES = new Set([
  ".card/metadata.yaml",
  ".card/structure.yaml",
  ".card/cover.html",
]);
const RICHTEXT_CARD_TYPES = new Set(["RichTextCard", "base.richtext"]);

const normalizeSlashes = (value: string): string => value.replace(/\\/g, "/");

export const normalizeCardPath = (value: string): string => {
  return path.posix.normalize(normalizeSlashes(value)).replace(/^\.\/+/, "").replace(/^\/+/, "");
};

export const isStructuralCardFile = (relativePath: string): boolean => {
  const normalizedPath = normalizeCardPath(relativePath);
  return STRUCTURAL_CARD_FILES.has(normalizedPath) || (normalizedPath.startsWith("content/") && normalizedPath.endsWith(".yaml"));
};

const isExternalReference = (value: string): boolean => /^(?:[a-z][a-z0-9+\-.]*:|\/\/|#)/i.test(value);

const splitReferenceSuffix = (value: string): { path: string; suffix: string } => {
  const match = /[?#]/.exec(value);
  if (!match || match.index < 0) {
    return { path: value, suffix: "" };
  }

  return {
    path: value.slice(0, match.index),
    suffix: value.slice(match.index),
  };
};

const buildCandidatePaths = (referencePath: string, sourceFilePath: string): string[] => {
  if (!referencePath.trim()) {
    return [];
  }

  const normalizedReferencePath = normalizeSlashes(referencePath.trim());
  if (isExternalReference(normalizedReferencePath)) {
    return [];
  }

  const candidates: string[] = [];
  const normalizedAsRoot = normalizeCardPath(normalizedReferencePath);
  if (normalizedAsRoot && !normalizedAsRoot.startsWith("../")) {
    candidates.push(normalizedAsRoot);
  }

  if (!normalizedReferencePath.startsWith("/")) {
    const sourceDir = path.posix.dirname(normalizeCardPath(sourceFilePath));
    const relativeToSource = normalizeCardPath(path.posix.join(sourceDir, normalizedReferencePath));
    if (relativeToSource && !relativeToSource.startsWith("../")) {
      candidates.push(relativeToSource);
    }
  }

  return [...new Set(candidates)];
};

export const resolveCardResourceCandidates = (referencePath: string, sourceFilePath: string): string[] => {
  return buildCandidatePaths(referencePath, sourceFilePath);
};

const resolveReferenceUrl = (
  rawReference: string,
  urlMap: Map<string, string>,
  sourceFilePath: string,
): string | undefined => {
  const { path: referencePath, suffix } = splitReferenceSuffix(rawReference);
  for (const candidatePath of buildCandidatePaths(referencePath, sourceFilePath)) {
    const cdnUrl = urlMap.get(candidatePath);
    if (cdnUrl) {
      return `${cdnUrl}${suffix}`;
    }
  }

  return undefined;
};

const replaceInValue = (
  value: unknown,
  urlMap: Map<string, string>,
  sourceFilePath: string,
  textResourceMap: Map<string, string>,
): unknown => {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const cardType = typeof record.card_type === "string" ? record.card_type.trim() : "";
    const contentSource = typeof record.content_source === "string" ? record.content_source.trim() : "";
    const rawContentFile = typeof record.content_file === "string" ? record.content_file : undefined;

    if (RICHTEXT_CARD_TYPES.has(cardType) && contentSource === "file" && rawContentFile) {
      const markdown = buildCandidatePaths(rawContentFile, sourceFilePath)
        .map((candidatePath) => textResourceMap.get(candidatePath))
        .find((item): item is string => typeof item === "string");

      if (typeof markdown === "string") {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(record)) {
          if (key === "content_source") {
            result[key] = "inline";
            continue;
          }
          if (key === "content_file") {
            continue;
          }
          result[key] = replaceInValue(val, urlMap, sourceFilePath, textResourceMap);
        }
        result.content_text = markdown;
        return result;
      }
    }

    const source = record.source;
    const rawFilePath = typeof record.file_path === "string" ? record.file_path : undefined;
    const cdnUrl = rawFilePath ? resolveReferenceUrl(rawFilePath, urlMap, sourceFilePath) : undefined;

    if (source === "file" && cdnUrl) {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(record)) {
        if (key === "source") {
          result[key] = "url";
          continue;
        }
        if (key === "file_path") {
          continue;
        }
        result[key] = replaceInValue(val, urlMap, sourceFilePath, textResourceMap);
      }
      result.url = cdnUrl;
      return result;
    }
  }

  if (typeof value === "string") {
    return resolveReferenceUrl(value, urlMap, sourceFilePath) ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceInValue(item, urlMap, sourceFilePath, textResourceMap));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = replaceInValue(val, urlMap, sourceFilePath, textResourceMap);
    }
    return result;
  }

  return value;
};

export const replaceYamlResourceUrls = (
  yamlText: string,
  urlMap: Map<string, string>,
  sourceFilePath: string,
  textResourceMap: Map<string, string>,
): string => {
  const parsed = parse(yamlText) as unknown;
  const replaced = replaceInValue(parsed, urlMap, sourceFilePath, textResourceMap);
  return stringify(replaced, { indent: 2 });
};

export const collectFileBackedRichTextResourcePaths = (
  yamlText: string,
  sourceFilePath: string,
): string[] => {
  const parsed = parse(yamlText) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }

  const record = parsed as Record<string, unknown>;
  const cardType = typeof record.card_type === "string" ? record.card_type.trim() : "";
  const contentSource = typeof record.content_source === "string" ? record.content_source.trim() : "";
  const contentFile = typeof record.content_file === "string" ? record.content_file.trim() : "";
  if (!RICHTEXT_CARD_TYPES.has(cardType) || contentSource !== "file" || !contentFile) {
    return [];
  }

  return buildCandidatePaths(contentFile, sourceFilePath);
};

export const replaceCoverHtmlUrls = (coverHtml: string, urlMap: Map<string, string>): string => {
  let result = coverHtml;

  result = result.replace(/=([\"'])([^\"']+)\1/g, (match, quote: string, value: string) => {
    const resolved = resolveReferenceUrl(value, urlMap, ".card/cover.html");
    return resolved ? `=${quote}${resolved}${quote}` : match;
  });

  result = result.replace(/url\(([\"']?)([^)"']+)\1\)/g, (match, quote: string, value: string) => {
    const resolved = resolveReferenceUrl(value, urlMap, ".card/cover.html");
    return resolved ? `url(${quote}${resolved}${quote})` : match;
  });

  return result;
};

export const readTextFile = async (
  ctx: CommunityCardPublishContext,
  filePath: string,
): Promise<string> => {
  const response = await ctx.host.invoke<{ content?: unknown }>("file.read", {
    path: filePath,
    options: {
      encoding: "utf-8",
    },
  });
  const content = response && typeof response === "object" && "content" in response ? response.content : response;
  if (typeof content !== "string") {
    throw new Error(`Host returned non-text content for ${filePath}`);
  }
  return content;
};

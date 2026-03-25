import { createCardToHtmlError, type CardToHtmlWarning } from "./errors";
import type {
  CardRenderView,
  CardToHtmlContext,
  CardToHtmlRequest,
  CardToHtmlResult,
  HostFileListEntry,
  HostFileStatLike,
  NormalizedCardToHtmlRequest,
} from "./types";

const ENTRY_FILE = "index.html" as const;
const MANIFEST_FILE = "conversion-manifest.json" as const;
const CONTENT_ASSET_DIR = "assets/content";
const ABSOLUTE_URL_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/.*?(?=(?:&quot;|&#39;|["'<>\s`]))/gi;
const BASE_HREF_PATTERN = /base href=(?:&quot;|")([^"&]+)(?:&quot;|")/gi;
const WINDOWS_ABSOLUTE_PATTERN = /^[A-Za-z]:\//;
const HTML_OPEN_PATTERN = /<html([^>]*)>/i;
const EXPORT_HEAD_CLOSE_PATTERN = /<\/head>/i;
const EXPORT_BODY_PATTERN = /<body([^>]*)>([\s\S]*)<\/body>/i;
const IFRAME_SRCDOC_PATTERN = /<iframe\b([^>]*?)\bsrcdoc="([^"]*)"([^>]*)><\/iframe>/gi;
const IFRAME_SRC_PATTERN = /<iframe\b([^>]*?)\bsrc="([^"]+)"([^>]*)><\/iframe>/gi;
const EXPORT_PRESENTATION_STYLE = `
<style data-chips-export-shell="card-html">
html,
body {
  width: 100%;
  min-height: 100%;
}

body[data-chips-export-presentation="card-html"] {
  margin: 0;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.32), transparent 48%),
    linear-gradient(
      180deg,
      var(--chips-sys-color-surface-container-low, #f5f7fb) 0%,
      var(--chips-sys-color-surface-container, #eef2f7) 100%
    );
  color: var(--chips-sys-color-on-surface, #111111);
  overflow: auto;
}

.chips-export-stage {
  --chips-export-stage-inline-padding: clamp(var(--chips-spacing-md, 12px), 2vw, var(--chips-spacing-2xl, 40px));
  --chips-export-stage-block-padding: clamp(var(--chips-spacing-md, 12px), 2.2vh, var(--chips-spacing-xl, 32px));
  --chips-export-stage-max-width: clamp(640px, 78vw, 1040px);

  box-sizing: border-box;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--chips-export-stage-block-padding) var(--chips-export-stage-inline-padding);
}

.chips-export-stage__viewport {
  width: min(100%, var(--chips-export-stage-max-width));
  min-width: 0;
}

.chips-export-stage__content {
  width: 100%;
  min-width: 0;
}

.chips-export-stage__content > .chips-composite {
  width: 100%;
}

@media (max-width: 768px) {
  .chips-export-stage {
    --chips-export-stage-inline-padding: var(--chips-spacing-sm, 8px);
    --chips-export-stage-block-padding: var(--chips-spacing-md, 12px);
  }

  .chips-export-stage__viewport {
    width: 100%;
  }
}
</style>`.trim();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const randomId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const detectSeparator = (filePath: string): "/" | "\\" => {
  return filePath.includes("\\") || /^[A-Za-z]:[\\/]/.test(filePath) ? "\\" : "/";
};

const toNormalizedPath = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (normalized.length > 1 && normalized.endsWith("/") && normalized !== "/" && !WINDOWS_ABSOLUTE_PATTERN.test(normalized)) {
    return normalized.slice(0, -1);
  }
  return normalized;
};

const toNativePath = (normalizedPath: string, referencePath: string): string => {
  return detectSeparator(referencePath) === "\\" ? normalizedPath.replace(/\//g, "\\") : normalizedPath;
};

const getRoot = (normalizedPath: string): string => {
  if (normalizedPath.startsWith("/")) {
    return "/";
  }
  const driveMatch = normalizedPath.match(/^[A-Za-z]:\//);
  if (driveMatch) {
    return driveMatch[0];
  }
  return "";
};

const splitSegments = (normalizedPath: string): string[] => {
  return normalizedPath.split("/").filter((segment) => segment.length > 0);
};

const joinNormalized = (basePath: string, ...segments: string[]): string => {
  const normalizedBase = toNormalizedPath(basePath);
  const root = getRoot(normalizedBase);
  const nextSegments = [...splitSegments(normalizedBase), ...segments.flatMap((segment) => splitSegments(toNormalizedPath(segment)))];
  const joined = nextSegments.join("/");
  if (!root) {
    return joined;
  }
  if (root === "/") {
    return `/${joined}`;
  }
  return `${root}${joined}`;
};

const dirnameNormalized = (filePath: string): string => {
  const normalizedPath = toNormalizedPath(filePath);
  const root = getRoot(normalizedPath);
  const segments = splitSegments(normalizedPath);
  if (segments.length === 0) {
    return root || ".";
  }
  const parent = segments.slice(0, -1).join("/");
  if (!root) {
    return parent || ".";
  }
  if (root === "/") {
    return parent ? `/${parent}` : "/";
  }
  return parent ? `${root}${parent}` : root;
};

const relativeNormalized = (fromPath: string, toPath: string): string => {
  const fromNormalized = toNormalizedPath(fromPath);
  const toNormalized = toNormalizedPath(toPath);
  if (getRoot(fromNormalized).toLowerCase() !== getRoot(toNormalized).toLowerCase()) {
    return toNormalized;
  }

  const fromSegments = splitSegments(fromNormalized);
  const toSegments = splitSegments(toNormalized);
  let sharedIndex = 0;
  while (
    sharedIndex < fromSegments.length &&
    sharedIndex < toSegments.length &&
    fromSegments[sharedIndex]?.toLowerCase() === toSegments[sharedIndex]?.toLowerCase()
  ) {
    sharedIndex += 1;
  }

  return [...fromSegments.slice(sharedIndex).map(() => ".."), ...toSegments.slice(sharedIndex)].join("/");
};

const encodeRelativeUrl = (relativePath: string, trailingSlash = false): string => {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) {
    return trailingSlash ? "./" : ".";
  }
  const encoded = normalized
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return trailingSlash ? `${encoded}/` : encoded;
};

const fromFileUrl = (fileUrl: string): string => {
  const url = new URL(fileUrl);
  if (url.protocol !== "file:") {
    throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  }

  let pathname = decodeURIComponent(url.pathname);
  if (/^\/[A-Za-z]:/.test(pathname)) {
    pathname = pathname.slice(1);
  }
  return toNormalizedPath(pathname);
};

const toFileStat = (value: unknown): HostFileStatLike | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    isFile: typeof value.isFile === "boolean" ? value.isFile : undefined,
    isDirectory: typeof value.isDirectory === "boolean" ? value.isDirectory : undefined,
  };
};

const isWithinRoot = (rootPath: string, targetPath: string): boolean => {
  const relative = relativeNormalized(rootPath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !relative.startsWith("/") && !WINDOWS_ABSOLUTE_PATTERN.test(relative));
};

const findSharedAncestor = (inputPaths: string[]): string | undefined => {
  if (inputPaths.length === 0) {
    return undefined;
  }

  const normalizedInputs = inputPaths.map((item) => toNormalizedPath(item));
  const [first, ...rest] = normalizedInputs;
  if (!first) {
    return undefined;
  }

  let candidate = first;
  for (const current of rest) {
    while (!isWithinRoot(candidate, current)) {
      const parent = dirnameNormalized(candidate);
      if (parent === candidate) {
        return undefined;
      }
      candidate = parent;
    }
  }

  return candidate;
};

const extractFileUrls = (html: string): string[] => {
  return Array.from(html.matchAll(ABSOLUTE_URL_PATTERN), (match) => match[0]).filter((value) => {
    try {
      const protocol = new URL(value).protocol.toLowerCase();
      return !["http:", "https:", "blob:", "data:"].includes(protocol);
    } catch {
      return false;
    }
  });
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const isLikelyFilePath = (value: string): boolean => {
  return /\/[^/]+\.[^/]+$/.test(value);
};

const pushWarning = (
  warnings: CardToHtmlWarning[],
  code: string,
  message: string,
  details?: unknown,
): void => {
  if (warnings.some((warning) => warning.code === code && warning.message === message)) {
    return;
  }
  warnings.push({ code, message, ...(typeof details !== "undefined" ? { details } : {}) });
};

const injectExportPresentationStyle = (html: string): string => {
  if (html.includes('data-chips-export-shell="card-html"')) {
    return html;
  }

  if (EXPORT_HEAD_CLOSE_PATTERN.test(html)) {
    return html.replace(EXPORT_HEAD_CLOSE_PATTERN, `${EXPORT_PRESENTATION_STYLE}\n</head>`);
  }

  if (HTML_OPEN_PATTERN.test(html)) {
    return html.replace(HTML_OPEN_PATTERN, `<html$1><head>${EXPORT_PRESENTATION_STYLE}</head>`);
  }

  return `${EXPORT_PRESENTATION_STYLE}\n${html}`;
};

const wrapExportPresentation = (html: string): string => {
  if (html.includes('class="chips-export-stage"')) {
    return html;
  }

  if (EXPORT_BODY_PATTERN.test(html)) {
    return html.replace(
      EXPORT_BODY_PATTERN,
      `<body$1 data-chips-export-presentation="card-html"><div class="chips-export-stage"><div class="chips-export-stage__viewport"><div class="chips-export-stage__content">$2</div></div></div></body>`,
    );
  }

  return [
    "<!doctype html>",
    "<html>",
    "<head></head>",
    '<body data-chips-export-presentation="card-html">',
    '<div class="chips-export-stage"><div class="chips-export-stage__viewport"><div class="chips-export-stage__content">',
    html,
    "</div></div></div>",
    "</body>",
    "</html>",
  ].join("");
};

const applyExportPresentationShell = (html: string): string => {
  return injectExportPresentationStyle(wrapExportPresentation(html));
};

const decodeHtmlEntities = (value: string): string => {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
};

const toSafeFileStem = (value: string, fallback: string): string => {
  const normalized = value.trim().replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : fallback;
};

const allocateFrameFileName = (attrs: string, frameIndex: number): string => {
  const nodeIdMatch = attrs.match(/\bdata-node-id="([^"]+)"/i);
  const fileStem = toSafeFileStem(nodeIdMatch?.[1] ?? "", `frame-${frameIndex}`);
  return `${fileStem}.html`;
};

const readTextFile = async (ctx: CardToHtmlContext, filePath: string): Promise<string> => {
  const response = await ctx.host.invoke<{ content: unknown }>("file.read", {
    path: filePath,
    options: { encoding: "utf-8" },
  });
  if (typeof response.content !== "string") {
    throw createCardToHtmlError("CONVERTER_OUTPUT_WRITE_FAILED", `Host returned non-text content for ${filePath}.`, {
      filePath,
    });
  }
  return response.content;
};

const resolveDocumentPath = async (ctx: CardToHtmlContext, documentUrl: string): Promise<string> => {
  const response = await ctx.host.invoke<{ path: unknown }>("card.resolveDocumentPath", {
    documentUrl,
  });
  if (typeof response.path !== "string" || response.path.trim().length === 0) {
    throw createCardToHtmlError("CONVERTER_HTML_RENDER_FAILED", `Unable to resolve rendered document url: ${documentUrl}`, {
      documentUrl,
    });
  }
  return toNormalizedPath(response.path);
};

const safeResolveDocumentPath = async (
  ctx: CardToHtmlContext,
  documentUrl: string,
): Promise<string | undefined> => {
  try {
    return await resolveDocumentPath(ctx, documentUrl);
  } catch {
    return undefined;
  }
};

const resolveAbsoluteDocumentUrl = (rawUrl: string, baseDocumentUrl: string): string | undefined => {
  try {
    return new URL(rawUrl, baseDocumentUrl).href;
  } catch {
    return undefined;
  }
};

const extractBaseHrefUrls = (html: string): string[] => {
  return Array.from(html.matchAll(BASE_HREF_PATTERN), (match) => match[1]).filter((value) => typeof value === "string");
};

const extractResolvedUrlReferences = async (
  ctx: CardToHtmlContext,
  html: string,
): Promise<Array<{ rawUrl: string; resolvedPath: string }>> => {
  const references: Array<{ rawUrl: string; resolvedPath: string }> = [];
  const seen = new Set<string>();

  for (const rawUrl of extractFileUrls(html)) {
    if (seen.has(rawUrl)) {
      continue;
    }
    seen.add(rawUrl);
    const resolvedPath =
      rawUrl.startsWith("file://")
        ? (() => {
            try {
              return fromFileUrl(rawUrl);
            } catch {
              return undefined;
            }
          })()
        : await safeResolveDocumentPath(ctx, rawUrl);

    if (!resolvedPath) {
      continue;
    }

    references.push({
      rawUrl,
      resolvedPath,
    });
  }

  return references;
};

const extractAssetRoot = async (
  ctx: CardToHtmlContext,
  html: string,
): Promise<{ rootPath: string; baseHrefUrls: string[]; references: Array<{ rawUrl: string; resolvedPath: string }> } | undefined> => {
  const references = await extractResolvedUrlReferences(ctx, html);
  if (references.length === 0) {
    return undefined;
  }

  const baseHrefUrls = extractBaseHrefUrls(html);
  const resolvedByUrl = new Map(references.map((reference) => [reference.rawUrl, reference.resolvedPath]));
  const baseRootCandidates = [...new Set(baseHrefUrls.map((value) => resolvedByUrl.get(value)).filter((value): value is string => Boolean(value)))];
  if (baseRootCandidates.length === 1) {
    return {
      rootPath: baseRootCandidates[0],
      baseHrefUrls,
      references,
    };
  }
  if (baseRootCandidates.length > 1) {
    const sharedRoot = findSharedAncestor(baseRootCandidates);
    if (sharedRoot) {
      return {
        rootPath: sharedRoot,
        baseHrefUrls,
        references,
      };
    }
  }

  const fallbackRoots = references.map((reference) =>
    isLikelyFilePath(reference.resolvedPath) ? dirnameNormalized(reference.resolvedPath) : reference.resolvedPath,
  );
  const sharedRoot = findSharedAncestor(fallbackRoots);
  if (!sharedRoot) {
    return undefined;
  }

  return {
    rootPath: sharedRoot,
    baseHrefUrls,
    references,
  };
};

const rewriteHtmlAssetUrls = (
  html: string,
  assetRootPath: string,
  baseHrefUrls: string[],
  references: Array<{ rawUrl: string; resolvedPath: string }>,
): string => {
  let rewrittenHtml = html;

  for (const baseHrefUrl of baseHrefUrls) {
    const matchedReference = references.find((reference) => reference.rawUrl === baseHrefUrl);
    if (!matchedReference || !isWithinRoot(assetRootPath, matchedReference.resolvedPath)) {
      continue;
    }

    const baseHrefPattern = new RegExp(
      `base href=(?:&quot;|")${escapeRegExp(baseHrefUrl)}(?:&quot;|")`,
      "gi",
    );
    rewrittenHtml = rewrittenHtml.replace(baseHrefPattern, 'base href="./assets/content/"');
  }

  for (const reference of references) {
    if (!isWithinRoot(assetRootPath, reference.resolvedPath)) {
      continue;
    }

    const relative = relativeNormalized(assetRootPath, reference.resolvedPath);
    const targetBase = encodeRelativeUrl(CONTENT_ASSET_DIR);
    const replacement = !relative
      ? `./${targetBase}/`
      : `./${targetBase}/${encodeRelativeUrl(relative, reference.rawUrl.endsWith("/"))}`;

    rewrittenHtml = rewrittenHtml.split(reference.rawUrl).join(replacement);
  }

  return rewrittenHtml;
};

const rewriteOfflineHtmlDocument = async (
  ctx: CardToHtmlContext,
  html: string,
  includeAssets: boolean,
  warnings: CardToHtmlWarning[],
  copiedAssetRoots: Set<string>,
  buildRoot: string,
  outputPathReference: string,
  label: string,
): Promise<{ html: string; copiedFiles: number }> => {
  if (!includeAssets) {
    return { html, copiedFiles: 0 };
  }

  const assetRoot = await extractAssetRoot(ctx, html);
  if (!assetRoot) {
    if (extractFileUrls(html).length > 0) {
      pushWarning(
        warnings,
        "CONVERTER_HTML_NO_ASSET_ROOT",
        "No file-based or managed card asset root was detected in the rendered HTML.",
        { document: label },
      );
    }
    return { html, copiedFiles: 0 };
  }

  const rewrittenHtml = rewriteHtmlAssetUrls(
    html,
    assetRoot.rootPath,
    assetRoot.baseHrefUrls,
    assetRoot.references,
  );

  if (copiedAssetRoots.has(assetRoot.rootPath)) {
    return { html: rewrittenHtml, copiedFiles: 0 };
  }

  copiedAssetRoots.add(assetRoot.rootPath);
  const copiedFiles = await copyAssetTree(
    ctx,
    assetRoot.rootPath,
    joinNormalized(buildRoot, CONTENT_ASSET_DIR),
    outputPathReference,
  );

  return { html: rewrittenHtml, copiedFiles };
};

const externalizeIframeSrcdocDocuments = async (
  ctx: CardToHtmlContext,
  html: string,
  includeAssets: boolean,
  warnings: CardToHtmlWarning[],
  copiedAssetRoots: Set<string>,
  buildRoot: string,
  outputPathReference: string,
): Promise<{ html: string; frameFiles: Array<{ fileName: string; content: string }>; copiedFiles: number }> => {
  const frameFiles: Array<{ fileName: string; content: string }> = [];
  const pattern = new RegExp(IFRAME_SRCDOC_PATTERN.source, IFRAME_SRCDOC_PATTERN.flags);
  let rewrittenHtml = "";
  let lastIndex = 0;
  let frameIndex = 0;
  let copiedFiles = 0;

  while (true) {
    const match = pattern.exec(html);
    if (!match) {
      break;
    }

    rewrittenHtml += html.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;
    frameIndex += 1;

    const beforeAttrs = match[1] ?? "";
    const srcdoc = match[2] ?? "";
    const afterAttrs = match[3] ?? "";
    const attrs = `${beforeAttrs} ${afterAttrs}`;
    const fileName = allocateFrameFileName(attrs, frameIndex);
    const frameContent = decodeHtmlEntities(srcdoc);
    const rewrittenFrame = await rewriteOfflineHtmlDocument(
      ctx,
      frameContent,
      includeAssets,
      warnings,
      copiedAssetRoots,
      buildRoot,
      outputPathReference,
      fileName,
    );
    copiedFiles += rewrittenFrame.copiedFiles;
    frameFiles.push({
      fileName,
      content: rewrittenFrame.html,
    });

    const cleanedAttributes = attrs.replace(/\s+/g, " ").trim();
    const attributeSegment = cleanedAttributes.length > 0 ? ` ${cleanedAttributes}` : "";
    rewrittenHtml += `<iframe${attributeSegment} src="./${fileName}"></iframe>`;
  }

  rewrittenHtml += html.slice(lastIndex);

  return {
    html: rewrittenHtml,
    frameFiles,
    copiedFiles,
  };
};

const externalizeIframeSrcDocuments = async (
  ctx: CardToHtmlContext,
  html: string,
  documentUrl: string,
  includeAssets: boolean,
  warnings: CardToHtmlWarning[],
  copiedAssetRoots: Set<string>,
  buildRoot: string,
  outputPathReference: string,
): Promise<{ html: string; frameFiles: Array<{ fileName: string; content: string }>; copiedFiles: number }> => {
  const frameFiles: Array<{ fileName: string; content: string }> = [];
  const pattern = new RegExp(IFRAME_SRC_PATTERN.source, IFRAME_SRC_PATTERN.flags);
  let rewrittenHtml = "";
  let lastIndex = 0;
  let frameIndex = 0;
  let copiedFiles = 0;

  while (true) {
    const match = pattern.exec(html);
    if (!match) {
      break;
    }

    rewrittenHtml += html.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;
    frameIndex += 1;

    const beforeAttrs = match[1] ?? "";
    const rawSrc = match[2] ?? "";
    const afterAttrs = match[3] ?? "";
    const attrs = `${beforeAttrs} ${afterAttrs}`;
    const absoluteFrameUrl = resolveAbsoluteDocumentUrl(decodeHtmlEntities(rawSrc), documentUrl);
    const resolvedFramePath = absoluteFrameUrl ? await safeResolveDocumentPath(ctx, absoluteFrameUrl) : undefined;
    if (!absoluteFrameUrl || !resolvedFramePath) {
      rewrittenHtml += match[0];
      continue;
    }

    const fileName = allocateFrameFileName(attrs, frameIndex);
    const frameContent = await readTextFile(ctx, toNativePath(resolvedFramePath, outputPathReference));
    const rewrittenFrame = await rewriteOfflineHtmlDocument(
      ctx,
      frameContent,
      includeAssets,
      warnings,
      copiedAssetRoots,
      buildRoot,
      outputPathReference,
      fileName,
    );
    copiedFiles += rewrittenFrame.copiedFiles;
    frameFiles.push({
      fileName,
      content: rewrittenFrame.html,
    });

    const cleanedAttributes = attrs.replace(/\s+/g, " ").trim();
    const attributeSegment = cleanedAttributes.length > 0 ? ` ${cleanedAttributes}` : "";
    rewrittenHtml += `<iframe${attributeSegment} src="./${fileName}"></iframe>`;
  }

  rewrittenHtml += html.slice(lastIndex);
  return {
    html: rewrittenHtml,
    frameFiles,
    copiedFiles,
  };
};

const isCardToHtmlError = (value: unknown): value is Error & { code: string } => {
  return value instanceof Error && typeof (value as { code?: unknown }).code === "string" && (value as { code: string }).code.startsWith("CONVERTER_");
};

const normalizeRequest = (input: CardToHtmlRequest): NormalizedCardToHtmlRequest => {
  if (!input || typeof input !== "object") {
    throw createCardToHtmlError("CONVERTER_INPUT_INVALID", "Conversion input must be an object.");
  }

  const cardFile = asString(input.cardFile);
  const outputPath = asString(input.output?.path);
  const packageMode = input.output?.packageMode;

  if (!cardFile) {
    throw createCardToHtmlError("CONVERTER_INPUT_INVALID", "cardFile is required.");
  }
  if (!outputPath) {
    throw createCardToHtmlError("CONVERTER_INPUT_INVALID", "output.path is required.");
  }
  if (packageMode !== "directory" && packageMode !== "zip") {
    throw createCardToHtmlError("CONVERTER_INPUT_INVALID", "output.packageMode must be directory or zip.");
  }

  const includeAssets = input.options?.includeAssets !== false;
  const includeManifest = input.options?.includeManifest !== false;

  if (!includeAssets && packageMode === "zip") {
    throw createCardToHtmlError(
      "CONVERTER_INPUT_INVALID",
      "packageMode=zip requires includeAssets=true to keep the exported HTML self-contained.",
    );
  }

  return {
    cardFile,
    output: {
      path: outputPath,
      packageMode,
      overwrite: input.output?.overwrite === true,
    },
    options: {
      includeAssets,
      includeManifest,
      locale: asString(input.options?.locale),
      themeId: asString(input.options?.themeId),
    },
  };
};

const reportProgress = async (
  ctx: CardToHtmlContext,
  stage: string,
  percent: number,
  message: string,
): Promise<void> => {
  await ctx.job?.reportProgress({
    stage,
    percent,
    message,
  });
};

const throwIfCancelled = (ctx: CardToHtmlContext): void => {
  if (!ctx.job) {
    return;
  }
  if (ctx.job.signal.aborted || ctx.job.isCancelled()) {
    throw createCardToHtmlError("CONVERTER_JOB_CANCELLED", "Card to HTML conversion was cancelled.");
  }
};

const safeStat = async (ctx: CardToHtmlContext, filePath: string): Promise<HostFileStatLike | undefined> => {
  try {
    const response = await ctx.host.invoke<{ meta: unknown }>("file.stat", {
      path: filePath,
    });
    return toFileStat(response.meta);
  } catch {
    return undefined;
  }
};

const ensureOutputReady = async (
  ctx: CardToHtmlContext,
  outputPath: string,
  overwrite: boolean,
): Promise<void> => {
  const stat = await safeStat(ctx, outputPath);
  if (!stat) {
    return;
  }

  if (!overwrite) {
    throw createCardToHtmlError("CONVERTER_OUTPUT_EXISTS", `Output already exists: ${outputPath}`, {
      outputPath,
    });
  }

  await ctx.host.invoke("file.delete", {
    path: outputPath,
    options: { recursive: true },
  });
};

const ensureDirectory = async (ctx: CardToHtmlContext, dirPath: string): Promise<void> => {
  await ctx.host.invoke("file.mkdir", {
    path: dirPath,
    options: { recursive: true },
  });
};

const ensureCardSourceExists = async (ctx: CardToHtmlContext, cardFile: string): Promise<void> => {
  const stat = await safeStat(ctx, cardFile);
  if (!stat) {
    throw createCardToHtmlError("CONVERTER_INPUT_INVALID", `Card source does not exist: ${cardFile}`, {
      cardFile,
    });
  }
};

const renderCardHtml = async (
  ctx: CardToHtmlContext,
  request: NormalizedCardToHtmlRequest,
): Promise<CardRenderView> => {
  const response = await ctx.host.invoke<{ view: CardRenderView }>("card.render", {
    cardFile: request.cardFile,
    options: {
      target: "offscreen-render",
      ...(request.options.themeId ? { themeId: request.options.themeId } : {}),
      ...(request.options.locale ? { locale: request.options.locale } : {}),
    },
  });

  if (!isRecord(response.view)) {
    throw createCardToHtmlError("CONVERTER_HTML_RENDER_FAILED", "card.render returned an invalid view.");
  }

  const title = asString(response.view.title);
  const body = asString(response.view.body);
  const documentUrl = asString(response.view.documentUrl);
  const sessionId = asString(response.view.sessionId);
  const semanticHash = asString(response.view.semanticHash);
  const target = asString(response.view.target);

  if (!title || !body || !documentUrl || !sessionId || !semanticHash || !target) {
    throw createCardToHtmlError("CONVERTER_HTML_RENDER_FAILED", "card.render response is missing required view fields.", {
      view: response.view,
    });
  }

  return {
    title,
    body,
    documentUrl,
    sessionId,
    semanticHash,
    target,
  };
};

const toListEntries = (value: unknown): HostFileListEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.path !== "string") {
      return [];
    }
    return [
      {
        path: item.path,
        isFile: item.isFile === true,
        isDirectory: item.isDirectory === true,
      },
    ];
  });
};

const copyAssetTree = async (
  ctx: CardToHtmlContext,
  sourceRoot: string,
  outputRoot: string,
  outputPathReference: string,
): Promise<number> => {
  const nativeSourceRoot = toNativePath(sourceRoot, sourceRoot);
  const nativeOutputRoot = toNativePath(outputRoot, outputPathReference);
  const listed = await ctx.host.invoke<{ entries: unknown }>("file.list", {
    dir: nativeSourceRoot,
    options: { recursive: true },
  });
  const entries = toListEntries(listed.entries);
  let copiedFiles = 0;

  await ensureDirectory(ctx, nativeOutputRoot);

  for (const entry of entries) {
    throwIfCancelled(ctx);

    const normalizedEntryPath = toNormalizedPath(entry.path);
    const relative = relativeNormalized(sourceRoot, normalizedEntryPath);
    if (!relative || relative.startsWith("..") || relative.startsWith("/") || WINDOWS_ABSOLUTE_PATTERN.test(relative)) {
      continue;
    }

    const destination = joinNormalized(outputRoot, relative);
    const nativeDestination = toNativePath(destination, outputPathReference);
    if (entry.isDirectory) {
      await ensureDirectory(ctx, nativeDestination);
      continue;
    }

    if (entry.isFile) {
      await ensureDirectory(ctx, toNativePath(dirnameNormalized(destination), outputPathReference));
      await ctx.host.invoke("file.copy", {
        sourcePath: entry.path,
        destPath: nativeDestination,
      });
      copiedFiles += 1;
    }
  }

  return copiedFiles;
};

const createConversionManifest = (
  request: NormalizedCardToHtmlRequest,
  renderView: CardRenderView,
  assetCount: number,
  warnings: CardToHtmlWarning[],
  manifestIncluded: boolean,
) => {
  return {
    schemaVersion: "1.0.0",
    type: "card-to-html",
    generatedAt: new Date().toISOString(),
    source: {
      cardFile: request.cardFile,
      title: renderView.title,
      semanticHash: renderView.semanticHash,
      requestedThemeId: request.options.themeId ?? null,
      requestedLocale: request.options.locale ?? null,
    },
    output: {
      packageMode: request.output.packageMode,
      entryFile: ENTRY_FILE,
      manifestFile: manifestIncluded ? MANIFEST_FILE : null,
    },
    assets: {
      included: request.options.includeAssets,
      root: request.options.includeAssets ? CONTENT_ASSET_DIR : null,
      count: assetCount,
    },
    warnings,
  };
};

const writeBuildArtifacts = async (
  ctx: CardToHtmlContext,
  buildRoot: string,
  outputPathReference: string,
  htmlBody: string,
  manifestBody: string | undefined,
  frameFiles: Array<{ fileName: string; content: string }>,
): Promise<void> => {
  const nativeBuildRoot = toNativePath(buildRoot, outputPathReference);
  await ensureDirectory(ctx, nativeBuildRoot);
  await ctx.host.invoke("file.write", {
    path: toNativePath(joinNormalized(buildRoot, ENTRY_FILE), outputPathReference),
    content: htmlBody,
  });

  if (manifestBody) {
    await ctx.host.invoke("file.write", {
      path: toNativePath(joinNormalized(buildRoot, MANIFEST_FILE), outputPathReference),
      content: manifestBody,
    });
  }

  for (const frameFile of frameFiles) {
    await ctx.host.invoke("file.write", {
      path: toNativePath(joinNormalized(buildRoot, frameFile.fileName), outputPathReference),
      content: frameFile.content,
    });
  }
};

const createTemporaryRoot = (outputPath: string): string => {
  return joinNormalized(dirnameNormalized(outputPath), `.chips-card-to-html-${randomId()}`);
};

const deletePathIfExists = async (
  ctx: CardToHtmlContext,
  targetPath: string,
): Promise<void> => {
  const stat = await safeStat(ctx, targetPath);
  if (!stat) {
    return;
  }

  try {
    await ctx.host.invoke("file.delete", {
      path: targetPath,
      options: { recursive: true },
    });
  } catch {
    // Best-effort cleanup.
  }
};

const normalizeUnexpectedError = (
  stage: "render-html" | "rewrite-assets" | "write-output" | "package-html",
  error: unknown,
): Error => {
  const message = error instanceof Error ? error.message : "Card to HTML conversion failed.";
  switch (stage) {
    case "rewrite-assets":
      return createCardToHtmlError("CONVERTER_HTML_ASSET_REWRITE_FAILED", message, error);
    case "write-output":
      return createCardToHtmlError("CONVERTER_OUTPUT_WRITE_FAILED", message, error);
    case "package-html":
      return createCardToHtmlError("CONVERTER_HTML_PACKAGE_FAILED", message, error);
    case "render-html":
    default:
      return createCardToHtmlError("CONVERTER_HTML_RENDER_FAILED", message, error);
  }
};

export const convertCardToHtml = async (
  ctx: CardToHtmlContext,
  input: CardToHtmlRequest,
): Promise<CardToHtmlResult> => {
  const request = normalizeRequest(input);
  const warnings: CardToHtmlWarning[] = [];
  const cleanupPaths: string[] = [];
  let renderSessionId: string | undefined;

  await reportProgress(ctx, "prepare", 5, "Preparing card to HTML conversion");
  await ensureCardSourceExists(ctx, request.cardFile);
  await ensureOutputReady(ctx, request.output.path, request.output.overwrite);
  throwIfCancelled(ctx);

  const buildRoot =
    request.output.packageMode === "directory"
      ? toNormalizedPath(request.output.path)
      : joinNormalized(createTemporaryRoot(request.output.path), "build");

  if (request.output.packageMode === "zip") {
    cleanupPaths.push(dirnameNormalized(buildRoot));
  }

  await ensureDirectory(ctx, toNativePath(buildRoot, request.output.path));

  let failureStage: "render-html" | "rewrite-assets" | "write-output" | "package-html" = "render-html";
  try {
    await reportProgress(ctx, "render-html", 25, "Rendering card through Host card.render");
    const renderView = await renderCardHtml(ctx, request);
    renderSessionId = renderView.sessionId;
    let htmlBody = applyExportPresentationShell(renderView.body);
    let assetCount = 0;
    const copiedAssetRoots = new Set<string>();

    failureStage = "rewrite-assets";
    await reportProgress(ctx, "rewrite-assets", 55, "Rewriting card asset paths and copying resources");
    if (!request.options.includeAssets) {
      pushWarning(
        warnings,
        "CONVERTER_HTML_ASSETS_SKIPPED",
        "includeAssets=false keeps original file URLs in the generated HTML.",
      );
    }

    const externalizedSrcFrames = await externalizeIframeSrcDocuments(
      ctx,
      htmlBody,
      renderView.documentUrl,
      request.options.includeAssets,
      warnings,
      copiedAssetRoots,
      buildRoot,
      request.output.path,
    );
    htmlBody = externalizedSrcFrames.html;
    assetCount += externalizedSrcFrames.copiedFiles;

    const externalizedSrcdocFrames = await externalizeIframeSrcdocDocuments(
      ctx,
      htmlBody,
      request.options.includeAssets,
      warnings,
      copiedAssetRoots,
      buildRoot,
      request.output.path,
    );
    htmlBody = externalizedSrcdocFrames.html;
    assetCount += externalizedSrcdocFrames.copiedFiles;

    const rewrittenRootDocument = await rewriteOfflineHtmlDocument(
      ctx,
      htmlBody,
      request.options.includeAssets,
      warnings,
      copiedAssetRoots,
      buildRoot,
      request.output.path,
      ENTRY_FILE,
    );
    htmlBody = rewrittenRootDocument.html;
    assetCount += rewrittenRootDocument.copiedFiles;
    throwIfCancelled(ctx);

    const manifestBody = request.options.includeManifest
      ? JSON.stringify(createConversionManifest(request, renderView, assetCount, warnings, true), null, 2)
      : undefined;

    failureStage = "write-output";
    await writeBuildArtifacts(
      ctx,
      buildRoot,
      request.output.path,
      htmlBody,
      manifestBody,
      [...externalizedSrcdocFrames.frameFiles, ...externalizedSrcFrames.frameFiles],
    );

    if (!request.options.includeManifest) {
      pushWarning(
        warnings,
        "CONVERTER_HTML_MANIFEST_SKIPPED",
        "includeManifest=false omitted conversion-manifest.json from the output.",
      );
    }

    if (request.output.packageMode === "zip") {
      failureStage = "package-html";
      await reportProgress(ctx, "package-html", 85, "Packaging HTML directory into ZIP");
      await ctx.host.invoke("zip.compress", {
        inputDir: toNativePath(buildRoot, request.output.path),
        outputZip: request.output.path,
      });
    }

    await reportProgress(ctx, "completed", 100, "Card to HTML conversion completed");
    return {
      packageMode: request.output.packageMode,
      outputPath: request.output.path,
      entryFile: ENTRY_FILE,
      ...(request.options.includeManifest ? { manifestFile: MANIFEST_FILE } : {}),
      semanticHash: renderView.semanticHash,
      assetCount,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } catch (error) {
    if (isCardToHtmlError(error)) {
      throw error;
    }

    await deletePathIfExists(ctx, request.output.path);
    throw normalizeUnexpectedError(failureStage, error);
  } finally {
    if (renderSessionId) {
      try {
        await ctx.host.invoke("card.releaseRenderSession", {
          sessionId: renderSessionId,
        });
      } catch {
        // Best-effort render session cleanup.
      }
    }
    if (cleanupPaths.length > 0) {
      await reportProgress(ctx, "cleanup", 95, "Cleaning temporary export directories");
      for (const cleanupPath of cleanupPaths) {
        await deletePathIfExists(ctx, toNativePath(cleanupPath, request.output.path));
      }
    }
  }
};

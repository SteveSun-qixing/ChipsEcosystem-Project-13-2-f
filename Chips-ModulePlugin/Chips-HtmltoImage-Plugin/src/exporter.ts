import { createHtmlToImageError, type HtmlToImageError, type HtmlToImageWarning } from "./errors";
import type {
  HostFileStatLike,
  HtmlConversionManifest,
  HtmlToImageContext,
  HtmlToImageDiagnostics,
  HtmlToImageRequest,
  HtmlToImageResult,
  ImageBackground,
  ImageFormat,
  ImageWaitUntil,
  NormalizedHtmlToImageRequest,
} from "./types";

const DEFAULT_ENTRY_FILE = "index.html";
const MANIFEST_FILE = "conversion-manifest.json";
const VALID_FORMATS = new Set<ImageFormat>(["png", "jpeg", "webp"]);
const VALID_BACKGROUNDS = new Set<ImageBackground>(["transparent", "white", "theme"]);
const VALID_WAIT_UNTIL = new Set<ImageWaitUntil>(["managed"]);
const WINDOWS_ROOT_PATTERN = /^[A-Za-z]:[\\/]/;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const asPositiveFiniteNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
};

const isHtmlToImageError = (value: unknown): value is HtmlToImageError => {
  return value instanceof Error && typeof (value as { code?: unknown }).code === "string";
};

const toFileStat = (value: unknown): HostFileStatLike | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    isFile: typeof value.isFile === "boolean" ? value.isFile : undefined,
    isDirectory: typeof value.isDirectory === "boolean" ? value.isDirectory : undefined,
    size: typeof value.size === "number" && Number.isFinite(value.size) ? value.size : undefined,
    mtimeMs: typeof value.mtimeMs === "number" && Number.isFinite(value.mtimeMs) ? value.mtimeMs : undefined,
  };
};

const toWarnings = (value: unknown): HtmlToImageWarning[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.code !== "string" || typeof item.message !== "string") {
      return [];
    }
    return [{
      code: item.code,
      message: item.message,
      ...(typeof item.details !== "undefined" ? { details: item.details } : {}),
    }];
  });
};

const uniqueWarnings = (warnings: HtmlToImageWarning[]): HtmlToImageWarning[] => {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = JSON.stringify([warning.code, warning.message, warning.details ?? null]);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const asStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return strings.length > 0 ? strings : undefined;
};

const detectSeparator = (value: string): "/" | "\\" => {
  return value.includes("\\") || WINDOWS_ROOT_PATTERN.test(value) ? "\\" : "/";
};

const splitSegments = (value: string): string[] => {
  return value.split(/[\\/]+/).filter((segment) => segment.length > 0);
};

const isAbsolutePath = (value: string): boolean => {
  return value.startsWith("/") || value.startsWith("\\") || WINDOWS_ROOT_PATTERN.test(value);
};

const joinPath = (basePath: string, relativePath: string): string => {
  const separator = detectSeparator(basePath);
  const trimmedBase = basePath.replace(/[\\/]+$/, "");
  const relativeSegments = splitSegments(relativePath);
  if (relativeSegments.length === 0) {
    return trimmedBase;
  }
  return `${trimmedBase}${separator}${relativeSegments.join(separator)}`;
};

const dirname = (filePath: string): string => {
  const normalized = filePath.replace(/[\\/]+$/, "");
  const lastSeparatorIndex = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (lastSeparatorIndex < 0) {
    return ".";
  }

  const rootMatch = normalized.match(/^[A-Za-z]:/);
  if (lastSeparatorIndex === 0) {
    return normalized.startsWith("/") || normalized.startsWith("\\") ? detectSeparator(filePath) : ".";
  }
  if (rootMatch && lastSeparatorIndex === rootMatch[0].length) {
    return `${rootMatch[0]}${detectSeparator(filePath)}`;
  }
  return normalized.slice(0, lastSeparatorIndex);
};

const basename = (filePath: string): string => {
  return splitSegments(filePath).at(-1) ?? filePath;
};

const randomId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const createTemporaryOutputFile = (outputFile: string): string => {
  return joinPath(dirname(outputFile), `.chips-html-to-image-${randomId()}-${basename(outputFile)}`);
};

const normalizeRelativeEntryFile = (entryFile: string): string => {
  if (isAbsolutePath(entryFile)) {
    throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "entryFile must be relative to htmlDir.", {
      entryFile,
    });
  }

  const separator = detectSeparator(entryFile);
  const normalizedSegments: string[] = [];

  for (const segment of splitSegments(entryFile)) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (normalizedSegments.length === 0) {
        throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "entryFile must stay within htmlDir.", {
          entryFile,
        });
      }
      normalizedSegments.pop();
      continue;
    }
    normalizedSegments.push(segment);
  }

  if (normalizedSegments.length === 0) {
    throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "entryFile must reference a file within htmlDir.", {
      entryFile,
    });
  }

  return normalizedSegments.join(separator);
};

const safeStat = async (ctx: HtmlToImageContext, filePath: string): Promise<HostFileStatLike | undefined> => {
  try {
    const response = await ctx.host.invoke<{ meta: unknown }>("file.stat", {
      path: filePath,
    });
    return toFileStat(response.meta);
  } catch {
    return undefined;
  }
};

const deletePathIfExists = async (ctx: HtmlToImageContext, targetPath: string): Promise<void> => {
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
    // Best-effort cleanup. The main error path should preserve the original failure.
  }
};

const ensureOutputReady = async (
  ctx: HtmlToImageContext,
  outputFile: string,
  overwrite: boolean,
): Promise<void> => {
  const stat = await safeStat(ctx, outputFile);
  if (!stat) {
    return;
  }

  if (!stat.isFile) {
    throw createHtmlToImageError("CONVERTER_OUTPUT_EXISTS", `Output path already exists and is not a file: ${outputFile}`, {
      outputFile,
    });
  }

  if (!overwrite) {
    throw createHtmlToImageError("CONVERTER_OUTPUT_EXISTS", `Output already exists: ${outputFile}`, {
      outputFile,
    });
  }
};

const commitStagedOutput = async (
  ctx: HtmlToImageContext,
  stagedOutputFile: string,
  outputFile: string,
  overwrite: boolean,
): Promise<void> => {
  const existing = await safeStat(ctx, outputFile);
  if (existing && !existing.isFile) {
    throw createHtmlToImageError("CONVERTER_OUTPUT_EXISTS", `Output path already exists and is not a file: ${outputFile}`, {
      outputFile,
    });
  }
  if (existing && !overwrite) {
    throw createHtmlToImageError("CONVERTER_OUTPUT_EXISTS", `Output already exists: ${outputFile}`, {
      outputFile,
    });
  }

  const backupFile = existing?.isFile ? createTemporaryOutputFile(outputFile) : undefined;
  if (backupFile) {
    try {
      await ctx.host.invoke("file.move", {
        sourcePath: outputFile,
        destPath: backupFile,
      });
    } catch (error) {
      throw createHtmlToImageError("CONVERTER_OUTPUT_WRITE_FAILED", "Failed to stage existing image output for overwrite.", {
        outputFile,
        backupFile,
        cause: error,
      });
    }
  }

  try {
    await ctx.host.invoke("file.move", {
      sourcePath: stagedOutputFile,
      destPath: outputFile,
    });
  } catch (error) {
    if (backupFile) {
      try {
        await ctx.host.invoke("file.move", {
          sourcePath: backupFile,
          destPath: outputFile,
        });
      } catch {
        // Preserve the original commit failure while surfacing backup location in details.
      }
    }

    throw createHtmlToImageError("CONVERTER_OUTPUT_WRITE_FAILED", "Failed to commit image output.", {
      stagedOutputFile,
      outputFile,
      backupFile,
      cause: error,
    });
  }

  if (backupFile) {
    await deletePathIfExists(ctx, backupFile);
  }
};

const reportProgress = async (
  ctx: HtmlToImageContext,
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

const throwIfCancelled = (ctx: HtmlToImageContext): void => {
  if (!ctx.job) {
    return;
  }
  if (ctx.job.signal.aborted || ctx.job.isCancelled()) {
    throw createHtmlToImageError("CONVERTER_JOB_CANCELLED", "HTML to image conversion was cancelled.");
  }
};

const normalizeInput = (input: HtmlToImageRequest): NormalizedHtmlToImageRequest => {
  if (!input || typeof input !== "object") {
    throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "Conversion input must be an object.");
  }

  const htmlDir = asString(input.htmlDir);
  const outputFile = asString(input.outputFile);
  const format = input.options?.format ?? "png";

  if (!htmlDir) {
    throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "htmlDir is required.");
  }
  if (!outputFile) {
    throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "outputFile is required.");
  }
  if (!VALID_FORMATS.has(format)) {
    throw createHtmlToImageError("CONVERTER_IMAGE_UNSUPPORTED_FORMAT", `Unsupported image format: ${String(format)}.`, {
      format,
    });
  }

  const width = asPositiveFiniteNumber(input.options?.width);
  const height = asPositiveFiniteNumber(input.options?.height);
  const scaleFactor = asPositiveFiniteNumber(input.options?.scaleFactor);
  const background = input.options?.background ?? (format === "jpeg" ? "white" : "transparent");

  if (typeof input.options?.width !== "undefined" && typeof width === "undefined") {
    throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "options.width must be a positive finite number.");
  }
  if (typeof input.options?.height !== "undefined" && typeof height === "undefined") {
    throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "options.height must be a positive finite number.");
  }
  if (typeof input.options?.scaleFactor !== "undefined" && typeof scaleFactor === "undefined") {
    throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "options.scaleFactor must be a positive finite number.");
  }
  if (!VALID_BACKGROUNDS.has(background)) {
    throw createHtmlToImageError(
      "CONVERTER_INPUT_INVALID",
      `options.background must be one of ${Array.from(VALID_BACKGROUNDS).join(", ")}.`,
      {
        background,
      },
    );
  }

  const waitUntil = input.options?.waitUntil ?? "managed";
  if (!VALID_WAIT_UNTIL.has(waitUntil)) {
    throw createHtmlToImageError("CONVERTER_INPUT_INVALID", "options.waitUntil must be managed.", {
      waitUntil,
    });
  }

  const entryFile = input.entryFile ? normalizeRelativeEntryFile(input.entryFile) : undefined;

  return {
    htmlDir,
    entryFile,
    outputFile,
    overwrite: input.overwrite === true,
    options: {
      format,
      ...(typeof width === "number" ? { width } : {}),
      ...(typeof height === "number" ? { height } : {}),
      ...(typeof scaleFactor === "number" ? { scaleFactor } : {}),
      background,
      waitUntil,
    },
  };
};

const ensureDirectoryExists = async (ctx: HtmlToImageContext, dirPath: string): Promise<void> => {
  const stat = await safeStat(ctx, dirPath);
  if (!stat?.isDirectory) {
    throw createHtmlToImageError("CONVERTER_INPUT_NOT_FOUND", `HTML directory does not exist: ${dirPath}`, {
      htmlDir: dirPath,
    });
  }
};

const readManifest = async (ctx: HtmlToImageContext, htmlDir: string): Promise<HtmlConversionManifest> => {
  const manifestPath = joinPath(htmlDir, MANIFEST_FILE);
  const stat = await safeStat(ctx, manifestPath);
  if (!stat?.isFile) {
    throw createHtmlToImageError("CONVERTER_HTML_MANIFEST_INVALID", `Missing conversion manifest: ${manifestPath}`, {
      manifestPath,
    });
  }

  let rawContent: unknown;
  try {
    const response = await ctx.host.invoke<{ content: unknown }>("file.read", {
      path: manifestPath,
      options: { encoding: "utf-8" },
    });
    rawContent = response.content;
  } catch (error) {
    throw createHtmlToImageError("CONVERTER_HTML_MANIFEST_INVALID", "Failed to read conversion manifest.", {
      manifestPath,
      cause: error,
    });
  }

  if (typeof rawContent !== "string") {
    throw createHtmlToImageError("CONVERTER_HTML_MANIFEST_INVALID", "Conversion manifest must be UTF-8 text.", {
      manifestPath,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    throw createHtmlToImageError("CONVERTER_HTML_MANIFEST_INVALID", "Conversion manifest is not valid JSON.", {
      manifestPath,
      cause: error,
    });
  }

  if (!isRecord(parsed) || asString(parsed.type) !== "card-to-html") {
    throw createHtmlToImageError(
      "CONVERTER_HTML_MANIFEST_INVALID",
      "Conversion manifest must describe a card-to-html intermediate artifact.",
      {
        manifestPath,
        manifest: parsed,
      },
    );
  }

  if (typeof parsed.output !== "undefined" && !isRecord(parsed.output)) {
    throw createHtmlToImageError("CONVERTER_HTML_MANIFEST_INVALID", "manifest.output must be an object when provided.", {
      manifestPath,
      manifest: parsed,
    });
  }

  const output = isRecord(parsed.output) ? parsed.output : undefined;
  const assets = isRecord(parsed.assets) ? parsed.assets : undefined;
  const diagnostics = isRecord(parsed.diagnostics) ? parsed.diagnostics : undefined;

  return {
    schemaVersion: asString(parsed.schemaVersion),
    type: "card-to-html",
    generatedAt: asString(parsed.generatedAt),
    output: output
      ? {
          entryFile: asString(output.entryFile),
          manifestFile:
            output.manifestFile === null
              ? null
              : asString(output.manifestFile),
        }
      : undefined,
    source: isRecord(parsed.source)
      ? {
          cardFile: asString(parsed.source.cardFile),
          title: asString(parsed.source.title),
          semanticHash: asString(parsed.source.semanticHash),
          requestedThemeId:
            parsed.source.requestedThemeId === null ? null : asString(parsed.source.requestedThemeId),
          requestedLocale:
            parsed.source.requestedLocale === null ? null : asString(parsed.source.requestedLocale),
        }
      : undefined,
    assets: assets
      ? {
          included: typeof assets.included === "boolean" ? assets.included : undefined,
          root: assets.root === null ? null : asString(assets.root),
          count: typeof assets.count === "number" && Number.isFinite(assets.count) ? assets.count : undefined,
        }
      : undefined,
    diagnostics: diagnostics
      ? {
          renderDiagnostics: Array.isArray(diagnostics.renderDiagnostics) ? diagnostics.renderDiagnostics : undefined,
          renderConsistency: diagnostics.renderConsistency,
          contentFiles: asStringArray(diagnostics.contentFiles),
        }
      : undefined,
    warnings: toWarnings(parsed.warnings),
  };
};

const ensureEntryFileExists = async (
  ctx: HtmlToImageContext,
  htmlDir: string,
  entryFile: string,
): Promise<string> => {
  const normalizedEntryFile = normalizeRelativeEntryFile(entryFile);
  const entryPath = joinPath(htmlDir, normalizedEntryFile);
  const stat = await safeStat(ctx, entryPath);
  if (!stat?.isFile) {
    throw createHtmlToImageError("CONVERTER_INPUT_NOT_FOUND", `HTML entry file does not exist: ${entryPath}`, {
      htmlDir,
      entryFile: normalizedEntryFile,
      entryPath,
    });
  }
  return normalizedEntryFile;
};

const normalizeRequestWithManifest = async (
  ctx: HtmlToImageContext,
  request: NormalizedHtmlToImageRequest,
): Promise<{ request: NormalizedHtmlToImageRequest; manifest: HtmlConversionManifest; warnings: HtmlToImageWarning[] }> => {
  await ensureDirectoryExists(ctx, request.htmlDir);
  const manifest = await readManifest(ctx, request.htmlDir);

  const resolvedEntryFile = await ensureEntryFileExists(ctx, request.htmlDir, request.entryFile ?? manifest.output?.entryFile ?? DEFAULT_ENTRY_FILE);

  const warnings: HtmlToImageWarning[] = [];
  let background = request.options.background;

  if (request.options.format === "jpeg" && background === "transparent") {
    background = "white";
    warnings.push({
      code: "CONVERTER_IMAGE_BACKGROUND_FALLBACK",
      message: "JPEG does not support transparent background. Background was normalized to white.",
      details: {
        requestedBackground: "transparent",
        appliedBackground: "white",
      },
    });
  }

  return {
    manifest,
    warnings: uniqueWarnings([...(manifest.warnings ?? []), ...warnings]),
    request: {
      ...request,
      entryFile: resolvedEntryFile,
      options: {
        ...request.options,
        background,
      },
    },
  };
};

const normalizeHostResult = (result: unknown): Omit<HtmlToImageResult, "warnings" | "diagnostics"> & { warnings?: HtmlToImageWarning[] } => {
  if (!isRecord(result)) {
    throw createHtmlToImageError("CONVERTER_IMAGE_CAPTURE_FAILED", "Host image export returned an invalid result.", {
      result,
    });
  }

  const outputFile = asString(result.outputFile);
  const format = asString(result.format) as ImageFormat | undefined;
  const width = asPositiveFiniteNumber(result.width);
  const height = asPositiveFiniteNumber(result.height);

  if (!outputFile) {
    throw createHtmlToImageError("CONVERTER_IMAGE_CAPTURE_FAILED", "Host image export response is missing outputFile.", {
      result,
    });
  }
  if (!format || !VALID_FORMATS.has(format)) {
    throw createHtmlToImageError("CONVERTER_IMAGE_CAPTURE_FAILED", "Host image export response is missing a valid format.", {
      result,
    });
  }

  return {
    outputFile,
    format,
    ...(typeof width === "number" ? { width } : {}),
    ...(typeof height === "number" ? { height } : {}),
    ...(toWarnings(result.warnings).length > 0 ? { warnings: toWarnings(result.warnings) } : {}),
  };
};

const getMimeType = (format: ImageFormat): string => {
  return format === "jpeg" ? "image/jpeg" : `image/${format}`;
};

const createDiagnostics = (
  request: NormalizedHtmlToImageRequest,
  manifest: HtmlConversionManifest,
  result: Omit<HtmlToImageResult, "warnings" | "diagnostics">,
  outputStat: HostFileStatLike,
): HtmlToImageDiagnostics => {
  return {
    html: {
      manifestFile: MANIFEST_FILE,
      ...(manifest.schemaVersion ? { schemaVersion: manifest.schemaVersion } : {}),
      ...(manifest.generatedAt ? { generatedAt: manifest.generatedAt } : {}),
      entryFile: request.entryFile ?? DEFAULT_ENTRY_FILE,
      type: "card-to-html",
    },
    resources: {
      ...(typeof manifest.assets?.included === "boolean" ? { assetsIncluded: manifest.assets.included } : {}),
      ...(typeof manifest.assets?.root !== "undefined" ? { assetRoot: manifest.assets.root } : {}),
      ...(typeof manifest.assets?.count === "number" ? { assetCount: manifest.assets.count } : {}),
      ...(manifest.diagnostics?.contentFiles ? { contentFiles: manifest.diagnostics.contentFiles } : {}),
      ...(manifest.diagnostics?.renderDiagnostics ? { renderDiagnostics: manifest.diagnostics.renderDiagnostics } : {}),
      ...(typeof manifest.diagnostics?.renderConsistency !== "undefined"
        ? { renderConsistency: manifest.diagnostics.renderConsistency }
        : {}),
      ...(manifest.warnings && manifest.warnings.length > 0 ? { upstreamWarnings: manifest.warnings } : {}),
    },
    render: {
      hostAction: "platform.renderHtmlToImage",
      waitUntil: request.options.waitUntil,
      background: request.options.background,
      ...(typeof request.options.scaleFactor === "number" ? { scaleFactor: request.options.scaleFactor } : {}),
    },
    output: {
      file: result.outputFile,
      ...(typeof outputStat.size === "number" ? { sizeBytes: outputStat.size } : {}),
      ...(typeof result.width === "number" ? { width: result.width } : {}),
      ...(typeof result.height === "number" ? { height: result.height } : {}),
      format: result.format,
      mimeType: getMimeType(result.format),
    },
  };
};

const mapHostError = (error: unknown, request: NormalizedHtmlToImageRequest): HtmlToImageError => {
  if (isHtmlToImageError(error) && error.code.startsWith("CONVERTER_")) {
    return error;
  }

  const code = isHtmlToImageError(error) ? error.code : undefined;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "HTML to image conversion failed.";

  if (code === "PLATFORM_UNSUPPORTED" && request.options.format === "webp") {
    return createHtmlToImageError("CONVERTER_IMAGE_UNSUPPORTED_FORMAT", message, {
      hostCode: code,
      requestedFormat: request.options.format,
    });
  }

  if (code === "FILE_NOT_FOUND") {
    return createHtmlToImageError("CONVERTER_INPUT_NOT_FOUND", message, {
      hostCode: code,
    });
  }

  if (code === "INVALID_ARGUMENT" || code === "MODULE_SCHEMA_INVALID") {
    return createHtmlToImageError("CONVERTER_INPUT_INVALID", message, {
      hostCode: code,
      cause: error,
    });
  }

  if (code === "ROUTE_TIMEOUT" || code === "MODULE_TIMEOUT") {
    return createHtmlToImageError("CONVERTER_IMAGE_RENDER_TIMEOUT", message, {
      hostCode: code,
      cause: error,
    }, true);
  }

  if (code === "EACCES" || code === "EPERM" || code === "PAL_FS_WRITE_FAILED") {
    return createHtmlToImageError("CONVERTER_OUTPUT_WRITE_FAILED", message, {
      hostCode: code,
      cause: error,
    });
  }

  return createHtmlToImageError("CONVERTER_IMAGE_CAPTURE_FAILED", message, {
    hostCode: code,
    cause: error,
  });
};

export const convertHtmlToImage = async (
  ctx: HtmlToImageContext,
  input: HtmlToImageRequest,
): Promise<HtmlToImageResult> => {
  let normalizedInput: NormalizedHtmlToImageRequest | undefined;
  let temporaryOutputFile: string | undefined;
  try {
    normalizedInput = normalizeInput(input);
    await reportProgress(ctx, "prepare", 5, "Preparing HTML to image conversion");
    throwIfCancelled(ctx);

    const { request, warnings, manifest } = await normalizeRequestWithManifest(ctx, normalizedInput);
    await ensureOutputReady(ctx, request.outputFile, request.overwrite);
    temporaryOutputFile = createTemporaryOutputFile(request.outputFile);
    ctx.logger.info("HTML to image input validated", {
      htmlDir: request.htmlDir,
      entryFile: request.entryFile,
      outputFile: request.outputFile,
      temporaryOutputFile,
      manifestType: manifest.type,
      format: request.options.format,
    });

    await reportProgress(ctx, "render-image", 30, "Rendering HTML and capturing image");
    throwIfCancelled(ctx);

    const hostResult = await ctx.host.invoke<unknown>("platform.renderHtmlToImage", {
      htmlDir: request.htmlDir,
      entryFile: request.entryFile,
      outputFile: temporaryOutputFile,
      options: {
        format: request.options.format,
        ...(typeof request.options.width === "number" ? { width: request.options.width } : {}),
        ...(typeof request.options.height === "number" ? { height: request.options.height } : {}),
        ...(typeof request.options.scaleFactor === "number" ? { scaleFactor: request.options.scaleFactor } : {}),
        background: request.options.background,
      },
    });

    throwIfCancelled(ctx);
    const hostOutput = normalizeHostResult(hostResult);
    const temporaryOutputStat = await safeStat(ctx, hostOutput.outputFile);
    if (!temporaryOutputStat?.isFile) {
      throw createHtmlToImageError("CONVERTER_OUTPUT_NOT_FOUND", `Output image was not written: ${hostOutput.outputFile}`, {
        outputFile: hostOutput.outputFile,
      });
    }

    await reportProgress(ctx, "cleanup", 90, "Committing image output");
    await commitStagedOutput(ctx, hostOutput.outputFile, request.outputFile, request.overwrite);
    temporaryOutputFile = undefined;

    const outputStat = await safeStat(ctx, request.outputFile);
    if (!outputStat?.isFile) {
      throw createHtmlToImageError("CONVERTER_OUTPUT_NOT_FOUND", `Output image was not written: ${request.outputFile}`, {
        outputFile: request.outputFile,
      });
    }

    const resultBase = {
      ...hostOutput,
      outputFile: request.outputFile,
    };
    const mergedWarnings = uniqueWarnings([...warnings, ...(hostOutput.warnings ?? [])]);
    const diagnostics = createDiagnostics(request, manifest, resultBase, outputStat);
    const result: HtmlToImageResult = {
      ...resultBase,
      ...(mergedWarnings.length > 0 ? { warnings: mergedWarnings } : {}),
      diagnostics,
    };
    await reportProgress(ctx, "completed", 100, "HTML to image conversion completed");
    return result;
  } catch (error) {
    if (temporaryOutputFile) {
      await deletePathIfExists(ctx, temporaryOutputFile);
    }

    if (isHtmlToImageError(error) && error.code.startsWith("CONVERTER_")) {
      throw error;
    }

    throw mapHostError(
      error,
      normalizedInput ?? {
        htmlDir: "",
        entryFile: DEFAULT_ENTRY_FILE,
        outputFile: "",
        overwrite: false,
        options: {
          format: "png",
          background: "transparent",
          waitUntil: "managed",
        },
      },
    );
  }
};

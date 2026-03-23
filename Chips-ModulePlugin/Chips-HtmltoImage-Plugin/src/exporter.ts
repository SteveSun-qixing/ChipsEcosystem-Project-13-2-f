import { createHtmlToImageError, type HtmlToImageError, type HtmlToImageWarning } from "./errors";
import type {
  HostFileStatLike,
  HtmlConversionManifest,
  HtmlToImageContext,
  HtmlToImageRequest,
  HtmlToImageResult,
  ImageBackground,
  ImageFormat,
  NormalizedHtmlToImageRequest,
} from "./types";

const DEFAULT_ENTRY_FILE = "index.html";
const MANIFEST_FILE = "conversion-manifest.json";
const VALID_FORMATS = new Set<ImageFormat>(["png", "jpeg", "webp"]);
const VALID_BACKGROUNDS = new Set<ImageBackground>(["transparent", "white", "theme"]);
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
  };
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
    throw createHtmlToImageError("CONVERTER_PIPELINE_CANCELLED", "HTML to image conversion was cancelled.");
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

  const entryFile = input.entryFile ? normalizeRelativeEntryFile(input.entryFile) : DEFAULT_ENTRY_FILE;

  return {
    htmlDir,
    entryFile,
    outputFile,
    options: {
      format,
      ...(typeof width === "number" ? { width } : {}),
      ...(typeof height === "number" ? { height } : {}),
      ...(typeof scaleFactor === "number" ? { scaleFactor } : {}),
      background,
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

  return {
    schemaVersion: asString(parsed.schemaVersion),
    type: "card-to-html",
    generatedAt: asString(parsed.generatedAt),
    output: isRecord(parsed.output)
      ? {
          entryFile: asString(parsed.output.entryFile),
          manifestFile:
            parsed.output.manifestFile === null
              ? null
              : asString(parsed.output.manifestFile),
        }
      : undefined,
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

  const resolvedEntryFile = await ensureEntryFileExists(
    ctx,
    request.htmlDir,
    request.entryFile ?? manifest.output?.entryFile ?? DEFAULT_ENTRY_FILE,
  );

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
    warnings,
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

const normalizeHostResult = (result: unknown, warnings: HtmlToImageWarning[]): HtmlToImageResult => {
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
    ...(warnings.length > 0 ? { warnings } : {}),
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
  try {
    normalizedInput = normalizeInput(input);
    await reportProgress(ctx, "prepare", 5, "Preparing HTML to image conversion");
    throwIfCancelled(ctx);

    const { request, warnings, manifest } = await normalizeRequestWithManifest(ctx, normalizedInput);
    ctx.logger.info("HTML to image input validated", {
      htmlDir: request.htmlDir,
      entryFile: request.entryFile,
      outputFile: request.outputFile,
      manifestType: manifest.type,
      format: request.options.format,
    });

    await reportProgress(ctx, "render-image", 30, "Rendering HTML and capturing image");
    throwIfCancelled(ctx);

    const hostResult = await ctx.host.invoke<unknown>("platform.renderHtmlToImage", {
      htmlDir: request.htmlDir,
      entryFile: request.entryFile,
      outputFile: request.outputFile,
      options: {
        format: request.options.format,
        ...(typeof request.options.width === "number" ? { width: request.options.width } : {}),
        ...(typeof request.options.height === "number" ? { height: request.options.height } : {}),
        ...(typeof request.options.scaleFactor === "number" ? { scaleFactor: request.options.scaleFactor } : {}),
        background: request.options.background,
      },
    });

    throwIfCancelled(ctx);
    const result = normalizeHostResult(hostResult, warnings);
    await reportProgress(ctx, "completed", 100, "HTML to image conversion completed");
    return result;
  } catch (error) {
    if (isHtmlToImageError(error) && error.code.startsWith("CONVERTER_")) {
      throw error;
    }

    throw mapHostError(
      error,
      normalizedInput ?? {
        htmlDir: "",
        entryFile: DEFAULT_ENTRY_FILE,
        outputFile: "",
        options: {
          format: "png",
          background: "transparent",
        },
      },
    );
  }
};

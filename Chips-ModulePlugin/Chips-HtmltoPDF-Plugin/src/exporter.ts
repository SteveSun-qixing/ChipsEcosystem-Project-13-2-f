import { createHtmlToPdfError, isHtmlToPdfError, type HtmlToPdfWarning } from "./errors";
import type {
  HtmlConversionManifest,
  HostFileStatLike,
  HtmlToPdfContext,
  HtmlToPdfRequest,
  HtmlToPdfResult,
  NormalizedHtmlToPdfRequest,
  PdfHeaderFooterOptions,
  PdfMarginMm,
  PdfPageSize,
  PdfRenderOptions,
  PdfWaitOptions,
  ResolvedHtmlToPdfRequest,
} from "./types";

const PDF_PAGE_SIZES = new Set<PdfPageSize>(["A4", "A3", "Letter", "Legal"]);
const WINDOWS_ROOT_PATTERN = /^[A-Za-z]:[\\/]/;
const DEFAULT_ENTRY_FILE = "index.html";
const MANIFEST_FILE = "conversion-manifest.json";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const asFiniteNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const asPositiveFiniteNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
};

const asNonNegativeFiniteNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
};

const detectSeparator = (filePath: string): "/" | "\\" => {
  return filePath.includes("\\") || WINDOWS_ROOT_PATTERN.test(filePath) ? "\\" : "/";
};

const splitSegments = (filePath: string): string[] => {
  return filePath.split(/[\\/]+/).filter((segment) => segment.length > 0);
};

const joinPath = (basePath: string, ...segments: string[]): string => {
  const separator = detectSeparator(basePath);
  const rootPrefix = basePath.match(/^[A-Za-z]:[\\/]/)?.[0] ?? "";
  const startsWithSeparator = basePath.startsWith("/") || basePath.startsWith("\\");
  const normalizedBase = splitSegments(basePath);
  const normalizedSegments = segments.flatMap((segment) => splitSegments(segment));
  const joined = [...normalizedBase, ...normalizedSegments].join(separator);

  if (rootPrefix) {
    return `${rootPrefix}${joined.slice(rootPrefix.length)}`.replace(/[\\/]+/g, separator);
  }
  if (startsWithSeparator) {
    return `${separator}${joined}`;
  }
  return joined;
};

const dirname = (filePath: string): string => {
  const separator = detectSeparator(filePath);
  const normalized = filePath.replace(/[\\/]+$/, "");
  const lastSeparatorIndex = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (lastSeparatorIndex < 0) {
    return ".";
  }

  const rootMatch = normalized.match(/^[A-Za-z]:/);
  if (lastSeparatorIndex === 0) {
    return normalized.startsWith("/") || normalized.startsWith("\\") ? separator : ".";
  }

  if (rootMatch && lastSeparatorIndex === rootMatch[0].length) {
    return `${rootMatch[0]}${separator}`;
  }

  return normalized.slice(0, lastSeparatorIndex);
};

const basename = (filePath: string): string => {
  const segments = splitSegments(filePath);
  return segments.at(-1) ?? filePath;
};

const createUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
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

const toWarnings = (value: unknown): HtmlToPdfWarning[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.code !== "string" || typeof item.message !== "string") {
      return [];
    }
    return [
      {
        code: item.code,
        message: item.message,
        ...(typeof item.details !== "undefined" ? { details: item.details } : {}),
      },
    ];
  });
};

const throwIfCancelled = (ctx: HtmlToPdfContext): void => {
  if (ctx.job?.signal.aborted || ctx.job?.isCancelled() === true) {
    throw createHtmlToPdfError("CONVERTER_PIPELINE_CANCELLED", "HTML to PDF conversion was cancelled.");
  }
};

const reportProgress = async (
  ctx: HtmlToPdfContext,
  stage: "prepare" | "render-pdf" | "cleanup" | "completed",
  percent: number,
  message?: string,
): Promise<void> => {
  await ctx.job?.reportProgress({
    stage,
    percent,
    ...(message ? { message } : {}),
  });
};

const normalizeEntryFile = (entryFile: string | undefined): string => {
  const rawValue = (asString(entryFile) ?? DEFAULT_ENTRY_FILE).replace(/\\/g, "/");
  if (rawValue.startsWith("/")) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "entryFile must stay inside htmlDir.", {
      entryFile,
    });
  }

  const normalizedSegments: string[] = [];
  for (const segment of rawValue.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (normalizedSegments.length === 0) {
        throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "entryFile must stay inside htmlDir.", {
          entryFile,
        });
      }
      normalizedSegments.pop();
      continue;
    }
    normalizedSegments.push(segment);
  }

  if (normalizedSegments.length === 0) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "entryFile must stay inside htmlDir.", {
      entryFile,
    });
  }

  return normalizedSegments.join("/");
};

const normalizeOptionalEntryFile = (entryFile: string | undefined): string | undefined => {
  if (typeof entryFile === "undefined") {
    return undefined;
  }
  return normalizeEntryFile(entryFile);
};

const normalizeMargin = (marginMm: unknown): PdfMarginMm | undefined => {
  if (typeof marginMm === "undefined") {
    return undefined;
  }
  if (!isRecord(marginMm)) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.marginMm must be an object when provided.");
  }

  const normalized: PdfMarginMm = {};
  for (const key of ["top", "right", "bottom", "left"] as const) {
    if (typeof marginMm[key] === "undefined") {
      continue;
    }
    const value = asNonNegativeFiniteNumber(marginMm[key]);
    if (typeof value === "undefined") {
      throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", `options.marginMm.${key} must be a non-negative finite number.`, {
        value: marginMm[key],
      });
    }
    normalized[key] = value;
  }

  return Object.keys(normalized).length > 0 ? normalized : {};
};

const normalizeHeaderFooter = (headerFooter: unknown): PdfHeaderFooterOptions | undefined => {
  if (typeof headerFooter === "undefined") {
    return undefined;
  }
  if (!isRecord(headerFooter)) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.headerFooter must be an object when provided.");
  }

  if (typeof headerFooter.enabled !== "undefined" && typeof headerFooter.enabled !== "boolean") {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.headerFooter.enabled must be a boolean when provided.");
  }
  if (typeof headerFooter.headerTemplate !== "undefined" && typeof headerFooter.headerTemplate !== "string") {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.headerFooter.headerTemplate must be a string when provided.");
  }
  if (typeof headerFooter.footerTemplate !== "undefined" && typeof headerFooter.footerTemplate !== "string") {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.headerFooter.footerTemplate must be a string when provided.");
  }

  return {
    ...(typeof headerFooter.enabled === "boolean" ? { enabled: headerFooter.enabled } : {}),
    ...(typeof headerFooter.headerTemplate === "string" ? { headerTemplate: headerFooter.headerTemplate } : {}),
    ...(typeof headerFooter.footerTemplate === "string" ? { footerTemplate: headerFooter.footerTemplate } : {}),
  };
};

const normalizeWait = (wait: unknown): PdfWaitOptions | undefined => {
  if (typeof wait === "undefined") {
    return undefined;
  }
  if (!isRecord(wait)) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.wait must be an object when provided.");
  }

  const normalized: PdfWaitOptions = {};
  for (const key of ["timeoutMs", "quietMs", "resourceTimeoutMs", "compositeTimeoutMs"] as const) {
    if (typeof wait[key] === "undefined") {
      continue;
    }
    const value = asPositiveFiniteNumber(wait[key]);
    if (typeof value === "undefined") {
      throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", `options.wait.${key} must be a positive finite number.`, {
        value: wait[key],
      });
    }
    normalized[key] = value;
  }

  for (const key of ["waitForFonts", "waitForImages", "waitForFrames", "waitForCompositeReady"] as const) {
    if (typeof wait[key] === "undefined") {
      continue;
    }
    if (typeof wait[key] !== "boolean") {
      throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", `options.wait.${key} must be a boolean when provided.`, {
        value: wait[key],
      });
    }
    normalized[key] = wait[key];
  }

  return normalized;
};

const normalizeOptions = (options: unknown): PdfRenderOptions | undefined => {
  if (typeof options === "undefined") {
    return undefined;
  }
  if (!isRecord(options)) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options must be an object when provided.");
  }

  const pageSize = asString(options.pageSize) as PdfPageSize | undefined;
  if (pageSize && !PDF_PAGE_SIZES.has(pageSize)) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.pageSize is invalid.", {
      pageSize,
    });
  }

  for (const key of ["landscape", "printBackground", "preferCSSPageSize"] as const) {
    if (typeof options[key] !== "undefined" && typeof options[key] !== "boolean") {
      throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", `options.${key} must be a boolean when provided.`);
    }
  }

  const marginMm = normalizeMargin(options.marginMm);
  const headerFooter = normalizeHeaderFooter(options.headerFooter);
  const wait = normalizeWait(options.wait);
  const normalized: PdfRenderOptions = {
    ...(pageSize ? { pageSize } : {}),
    ...(typeof options.landscape === "boolean" ? { landscape: options.landscape } : {}),
    ...(typeof options.printBackground === "boolean" ? { printBackground: options.printBackground } : {}),
    ...(typeof options.preferCSSPageSize === "boolean" ? { preferCSSPageSize: options.preferCSSPageSize } : {}),
    ...(typeof marginMm !== "undefined" ? { marginMm } : {}),
    ...(typeof headerFooter !== "undefined" ? { headerFooter } : {}),
    ...(typeof wait !== "undefined" ? { wait } : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeRequest = (input: HtmlToPdfRequest): NormalizedHtmlToPdfRequest => {
  if (!isRecord(input)) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "HTML to PDF request must be an object.");
  }

  const htmlDir = asString(input.htmlDir);
  const outputFile = asString(input.outputFile);
  if (!htmlDir) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "htmlDir is required.");
  }
  if (!outputFile) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "outputFile is required.");
  }

  return {
    htmlDir,
    entryFile: normalizeOptionalEntryFile(input.entryFile),
    outputFile,
    overwrite: input.overwrite === true,
    options: normalizeOptions(input.options),
  };
};

const ensurePathStat = async (ctx: HtmlToPdfContext, targetPath: string): Promise<HostFileStatLike | undefined> => {
  try {
    const result = await ctx.host.invoke<{ meta: unknown }>("file.stat", {
      path: targetPath,
    });
    return toFileStat(result.meta);
  } catch {
    return undefined;
  }
};

const safeDeletePath = async (ctx: HtmlToPdfContext, targetPath: string): Promise<void> => {
  try {
    await ctx.host.invoke("file.delete", {
      path: targetPath,
      options: { recursive: true },
    });
  } catch {
    // Best effort cleanup.
  }
};

const ensureDirectory = async (ctx: HtmlToPdfContext, dirPath: string): Promise<void> => {
  await ctx.host.invoke("file.mkdir", {
    path: dirPath,
    options: { recursive: true },
  });
};

const movePath = async (ctx: HtmlToPdfContext, sourcePath: string, destPath: string): Promise<void> => {
  await ctx.host.invoke("file.move", {
    sourcePath,
    destPath,
  });
};

const readTextFile = async (ctx: HtmlToPdfContext, filePath: string): Promise<string> => {
  const response = await ctx.host.invoke<{ content: unknown }>("file.read", {
    path: filePath,
    options: { encoding: "utf-8" },
  });
  if (typeof response.content !== "string") {
    throw createHtmlToPdfError("CONVERTER_HTML_MANIFEST_INVALID", `Host returned non-text content for ${filePath}.`, {
      filePath,
    });
  }
  return response.content;
};

const readConversionManifest = async (ctx: HtmlToPdfContext, htmlDir: string): Promise<HtmlConversionManifest> => {
  const manifestPath = joinPath(htmlDir, MANIFEST_FILE);
  const manifestStat = await ensurePathStat(ctx, manifestPath);
  if (!manifestStat?.isFile) {
    throw createHtmlToPdfError("CONVERTER_HTML_MANIFEST_INVALID", `Missing conversion manifest: ${manifestPath}`, {
      manifestPath,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readTextFile(ctx, manifestPath));
  } catch (error) {
    if (isHtmlToPdfError(error)) {
      throw error;
    }
    throw createHtmlToPdfError("CONVERTER_HTML_MANIFEST_INVALID", "Conversion manifest is not valid JSON.", {
      manifestPath,
      cause: error,
    });
  }

  if (!isRecord(parsed) || asString(parsed.type) !== "card-to-html") {
    throw createHtmlToPdfError(
      "CONVERTER_HTML_MANIFEST_INVALID",
      "Conversion manifest must describe a card-to-html intermediate artifact.",
      {
        manifestPath,
        manifest: parsed,
      },
    );
  }

  if (typeof parsed.output !== "undefined" && !isRecord(parsed.output)) {
    throw createHtmlToPdfError("CONVERTER_HTML_MANIFEST_INVALID", "manifest.output must be an object when provided.", {
      manifestPath,
      manifest: parsed,
    });
  }

  const diagnostics = isRecord(parsed.diagnostics) ? parsed.diagnostics : undefined;
  const source = isRecord(parsed.source) ? parsed.source : undefined;
  return {
    schemaVersion: asString(parsed.schemaVersion),
    type: "card-to-html",
    generatedAt: asString(parsed.generatedAt),
    source: source
      ? {
          cardFile: asString(source.cardFile),
          title: asString(source.title),
          semanticHash: asString(source.semanticHash),
          locale: asString(source.locale),
          themeId: asString(source.themeId),
        }
      : undefined,
    output: isRecord(parsed.output)
      ? {
          entryFile: asString(parsed.output.entryFile),
          manifestFile: parsed.output.manifestFile === null ? null : asString(parsed.output.manifestFile),
        }
      : undefined,
    diagnostics: diagnostics
      ? {
          renderDiagnostics: Array.isArray(diagnostics.renderDiagnostics) ? diagnostics.renderDiagnostics : undefined,
          renderConsistency: diagnostics.renderConsistency,
          contentFiles: Array.isArray(diagnostics.contentFiles)
            ? diagnostics.contentFiles.filter((item): item is string => typeof item === "string")
            : undefined,
        }
      : undefined,
  };
};

const ensureInputExists = async (
  ctx: HtmlToPdfContext,
  request: NormalizedHtmlToPdfRequest,
): Promise<{ request: ResolvedHtmlToPdfRequest; manifest: HtmlConversionManifest }> => {
  const htmlDirStat = await ensurePathStat(ctx, request.htmlDir);
  if (!htmlDirStat?.isDirectory) {
    throw createHtmlToPdfError("CONVERTER_INPUT_NOT_FOUND", `htmlDir does not exist or is not a directory: ${request.htmlDir}`, {
      htmlDir: request.htmlDir,
    });
  }

  const manifest = await readConversionManifest(ctx, request.htmlDir);
  const entryFile = normalizeEntryFile(request.entryFile ?? manifest.output?.entryFile ?? DEFAULT_ENTRY_FILE);
  const entryPath = joinPath(request.htmlDir, entryFile);
  const entryStat = await ensurePathStat(ctx, entryPath);
  if (!entryStat?.isFile) {
    throw createHtmlToPdfError("CONVERTER_INPUT_NOT_FOUND", `HTML entry file does not exist: ${entryPath}`, {
      htmlDir: request.htmlDir,
      entryFile,
      entryPath,
    });
  }

  return {
    request: {
      ...request,
      entryFile,
    },
    manifest,
  };
};

const normalizeHostResult = (
  request: ResolvedHtmlToPdfRequest,
  result: unknown,
  manifest: HtmlConversionManifest,
  outputStat: HostFileStatLike | undefined,
): HtmlToPdfResult => {
  if (!isRecord(result) || typeof result.outputFile !== "string" || result.outputFile.trim().length === 0) {
    throw createHtmlToPdfError("CONVERTER_PDF_PRINT_FAILED", "Host returned an invalid PDF export result.", {
      result,
    });
  }

  const pageCount =
    typeof result.pageCount === "number" && Number.isFinite(result.pageCount) ? Math.max(0, Math.floor(result.pageCount)) : undefined;
  const byteLength = asNonNegativeFiniteNumber(result.byteLength) ?? asNonNegativeFiniteNumber(outputStat?.size);
  const diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics : undefined;

  return {
    outputFile: result.outputFile,
    entryFile: request.entryFile,
    mimeType: "application/pdf",
    ...(typeof pageCount === "number" ? { pageCount } : {}),
    ...(typeof byteLength === "number" ? { byteLength } : {}),
    manifest: {
      ...(manifest.schemaVersion ? { schemaVersion: manifest.schemaVersion } : {}),
      ...(manifest.generatedAt ? { generatedAt: manifest.generatedAt } : {}),
      ...(manifest.source?.semanticHash ? { semanticHash: manifest.source.semanticHash } : {}),
      ...(manifest.source?.locale ? { locale: manifest.source.locale } : {}),
      ...(manifest.source?.themeId ? { themeId: manifest.source.themeId } : {}),
      ...(manifest.diagnostics?.renderDiagnostics ? { renderDiagnostics: manifest.diagnostics.renderDiagnostics } : {}),
      ...(typeof manifest.diagnostics?.renderConsistency !== "undefined"
        ? { renderConsistency: manifest.diagnostics.renderConsistency }
        : {}),
      ...(manifest.diagnostics?.contentFiles ? { contentFiles: manifest.diagnostics.contentFiles } : {}),
    },
    ...(diagnostics ? { diagnostics } : {}),
    ...(toWarnings(result.warnings).length > 0 ? { warnings: toWarnings(result.warnings) } : {}),
  };
};

const assertHostResultShape = (request: ResolvedHtmlToPdfRequest, result: unknown): void => {
  if (!isRecord(result) || typeof result.outputFile !== "string" || result.outputFile.trim().length === 0) {
    throw createHtmlToPdfError("CONVERTER_PDF_PRINT_FAILED", "Host returned an invalid PDF export result.", {
      htmlDir: request.htmlDir,
      entryFile: request.entryFile,
      outputFile: request.outputFile,
      result,
    });
  }
};

const wrapHostError = (error: unknown, request: ResolvedHtmlToPdfRequest): never => {
  if (isHtmlToPdfError(error)) {
    throw error;
  }

  if (isRecord(error) && typeof error.code === "string") {
    if (error.code === "FILE_NOT_FOUND") {
      throw createHtmlToPdfError("CONVERTER_INPUT_NOT_FOUND", typeof error.message === "string" ? error.message : "HTML input file was not found.", {
        htmlDir: request.htmlDir,
        entryFile: request.entryFile,
        outputFile: request.outputFile,
        cause: error,
      });
    }
    if (error.code === "PERMISSION_DENIED" || error.code === "SERVICE_PERMISSION_DENIED") {
      throw createHtmlToPdfError("CONVERTER_PIPELINE_PERMISSION_DENIED", typeof error.message === "string" ? error.message : "Permission denied while exporting PDF.", {
        htmlDir: request.htmlDir,
        entryFile: request.entryFile,
        outputFile: request.outputFile,
        cause: error,
      });
    }
    throw createHtmlToPdfError(
      "CONVERTER_PDF_PRINT_FAILED",
      typeof error.message === "string" ? error.message : "Host PDF export failed.",
      {
        htmlDir: request.htmlDir,
        entryFile: request.entryFile,
        outputFile: request.outputFile,
        cause: error,
      },
      typeof error.retryable === "boolean" ? error.retryable : undefined,
    );
  }

  throw createHtmlToPdfError("CONVERTER_PDF_PRINT_FAILED", "Host PDF export failed.", {
    htmlDir: request.htmlDir,
    entryFile: request.entryFile,
    outputFile: request.outputFile,
    cause: error,
  });
};

const createTemporaryOutputRoot = (outputFile: string): string => {
  return joinPath(dirname(outputFile), `.chips-html-to-pdf-${createUuid()}`);
};

const getTemporaryOutputFile = (temporaryRoot: string, outputFile: string): string => {
  return joinPath(temporaryRoot, "final", basename(outputFile));
};

const getBackupOutputFile = (temporaryRoot: string, outputFile: string): string => {
  return joinPath(temporaryRoot, "backup", basename(outputFile));
};

const ensureOutputWritable = async (ctx: HtmlToPdfContext, request: ResolvedHtmlToPdfRequest): Promise<void> => {
  const existing = await ensurePathStat(ctx, request.outputFile);
  if (!existing) {
    return;
  }

  if (!request.overwrite) {
    throw createHtmlToPdfError("CONVERTER_OUTPUT_EXISTS", `Output already exists: ${request.outputFile}`, {
      outputFile: request.outputFile,
    });
  }
};

export const convertHtmlToPdf = async (
  ctx: HtmlToPdfContext,
  input: HtmlToPdfRequest,
): Promise<HtmlToPdfResult> => {
  const normalizedRequest = normalizeRequest(input);
  let temporaryRoot: string | undefined;
  throwIfCancelled(ctx);
  await reportProgress(ctx, "prepare", 5, "Validating HTML input");
  const { request, manifest } = await ensureInputExists(ctx, normalizedRequest);
  await ensureOutputWritable(ctx, request);

  ctx.logger.info("Starting html to pdf conversion.", {
    htmlDir: request.htmlDir,
    entryFile: request.entryFile,
    outputFile: request.outputFile,
  });

  throwIfCancelled(ctx);
  await reportProgress(ctx, "render-pdf", 20, "Exporting HTML to PDF");

  try {
    temporaryRoot = createTemporaryOutputRoot(request.outputFile);
    const temporaryOutputFile = getTemporaryOutputFile(temporaryRoot, request.outputFile);
    const backupOutputFile = getBackupOutputFile(temporaryRoot, request.outputFile);
    await ensureDirectory(ctx, dirname(temporaryOutputFile));
    throwIfCancelled(ctx);

    const hostResult = await ctx.host.invoke("platform.renderHtmlToPdf", {
      htmlDir: request.htmlDir,
      entryFile: request.entryFile,
      outputFile: temporaryOutputFile,
      ...(request.options ? { options: request.options } : {}),
    });
    assertHostResultShape(request, hostResult);

    throwIfCancelled(ctx);
    const temporaryOutputStat = await ensurePathStat(ctx, temporaryOutputFile);
    if (!temporaryOutputStat?.isFile) {
      throw createHtmlToPdfError("CONVERTER_OUTPUT_NOT_FOUND", `Output PDF was not written: ${temporaryOutputFile}`, {
        outputFile: temporaryOutputFile,
      });
    }

    await reportProgress(ctx, "cleanup", 90, "Committing PDF output");
    let backupCreated = false;
    const existingFinalOutput = await ensurePathStat(ctx, request.outputFile);
    if (existingFinalOutput && request.overwrite) {
      await ensureDirectory(ctx, dirname(backupOutputFile));
      await movePath(ctx, request.outputFile, backupOutputFile);
      backupCreated = true;
    }

    try {
      await movePath(ctx, temporaryOutputFile, request.outputFile);
    } catch (error) {
      if (backupCreated) {
        try {
          await movePath(ctx, backupOutputFile, request.outputFile);
        } catch (restoreError) {
          throw createHtmlToPdfError("CONVERTER_OUTPUT_COMMIT_FAILED", "Failed to commit PDF output and restore previous output.", {
            outputFile: request.outputFile,
            backupOutputFile,
            cause: error,
            restoreCause: restoreError,
          });
        }
      }

      throw createHtmlToPdfError("CONVERTER_OUTPUT_COMMIT_FAILED", "Failed to commit PDF output.", {
        outputFile: request.outputFile,
        cause: error,
      });
    }

    const outputStat = await ensurePathStat(ctx, request.outputFile);
    if (!outputStat?.isFile) {
      throw createHtmlToPdfError("CONVERTER_OUTPUT_NOT_FOUND", `Output PDF was not committed: ${request.outputFile}`, {
        outputFile: request.outputFile,
      });
    }

    const result = normalizeHostResult(
      request,
      isRecord(hostResult)
        ? {
            ...hostResult,
            outputFile: request.outputFile,
          }
        : hostResult,
      manifest,
      outputStat,
    );

    await reportProgress(ctx, "completed", 100, "HTML to PDF conversion completed");
    return result;
  } catch (error) {
    if (isHtmlToPdfError(error)) {
      throw error;
    }

    wrapHostError(error, request);
  } finally {
    if (temporaryRoot) {
      await safeDeletePath(ctx, temporaryRoot);
    }
  }

  throw createHtmlToPdfError("CONVERTER_PDF_PRINT_FAILED", "HTML to PDF conversion ended unexpectedly.", {
    outputFile: normalizedRequest.outputFile,
  });
};

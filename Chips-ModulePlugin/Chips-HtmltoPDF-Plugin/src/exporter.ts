import { createHtmlToPdfError, isHtmlToPdfError, type HtmlToPdfWarning } from "./errors";
import type {
  HostFileStatLike,
  HtmlToPdfContext,
  HtmlToPdfRequest,
  HtmlToPdfResult,
  NormalizedHtmlToPdfRequest,
  PdfPageSize,
} from "./types";

const PDF_PAGE_SIZES = new Set<PdfPageSize>(["A4", "A3", "Letter", "Legal"]);
const WINDOWS_ROOT_PATTERN = /^[A-Za-z]:[\\/]/;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const asFiniteNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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

const toFileStat = (value: unknown): HostFileStatLike | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    isFile: typeof value.isFile === "boolean" ? value.isFile : undefined,
    isDirectory: typeof value.isDirectory === "boolean" ? value.isDirectory : undefined,
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
        details: item.details,
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
  stage: "prepare" | "render-pdf" | "completed",
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
  const rawValue = (asString(entryFile) ?? "index.html").replace(/\\/g, "/");
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

  const options = input.options;
  if (typeof options !== "undefined" && !isRecord(options)) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options must be an object when provided.");
  }

  const pageSize = asString(options?.pageSize) as PdfPageSize | undefined;
  if (pageSize && !PDF_PAGE_SIZES.has(pageSize)) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.pageSize is invalid.", {
      pageSize,
    });
  }

  if (typeof options?.landscape !== "undefined" && typeof options.landscape !== "boolean") {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.landscape must be a boolean.");
  }
  if (typeof options?.printBackground !== "undefined" && typeof options.printBackground !== "boolean") {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.printBackground must be a boolean.");
  }

  const marginMm = options?.marginMm;
  if (typeof marginMm !== "undefined" && !isRecord(marginMm)) {
    throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", "options.marginMm must be an object when provided.");
  }

  for (const key of ["top", "right", "bottom", "left"] as const) {
    if (typeof marginMm?.[key] !== "undefined" && typeof asFiniteNumber(marginMm[key]) === "undefined") {
      throw createHtmlToPdfError("CONVERTER_INPUT_INVALID", `options.marginMm.${key} must be a finite number.`, {
        value: marginMm[key],
      });
    }
  }

  return {
    htmlDir,
    entryFile: normalizeEntryFile(input.entryFile),
    outputFile,
    options: options
      ? {
          ...(pageSize ? { pageSize } : {}),
          ...(typeof options.landscape === "boolean" ? { landscape: options.landscape } : {}),
          ...(typeof options.printBackground === "boolean" ? { printBackground: options.printBackground } : {}),
          ...(marginMm
            ? {
                marginMm: {
                  ...(typeof marginMm.top === "number" ? { top: marginMm.top } : {}),
                  ...(typeof marginMm.right === "number" ? { right: marginMm.right } : {}),
                  ...(typeof marginMm.bottom === "number" ? { bottom: marginMm.bottom } : {}),
                  ...(typeof marginMm.left === "number" ? { left: marginMm.left } : {}),
                },
              }
            : {}),
        }
      : undefined,
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

const ensureInputExists = async (ctx: HtmlToPdfContext, request: NormalizedHtmlToPdfRequest): Promise<void> => {
  const htmlDirStat = await ensurePathStat(ctx, request.htmlDir);
  if (!htmlDirStat?.isDirectory) {
    throw createHtmlToPdfError("CONVERTER_INPUT_NOT_FOUND", `htmlDir does not exist or is not a directory: ${request.htmlDir}`, {
      htmlDir: request.htmlDir,
    });
  }

  const entryPath = joinPath(request.htmlDir, request.entryFile);
  const entryStat = await ensurePathStat(ctx, entryPath);
  if (!entryStat?.isFile) {
    throw createHtmlToPdfError("CONVERTER_INPUT_NOT_FOUND", `HTML entry file does not exist: ${entryPath}`, {
      htmlDir: request.htmlDir,
      entryFile: request.entryFile,
      entryPath,
    });
  }
};

const normalizeHostResult = (request: NormalizedHtmlToPdfRequest, result: unknown): HtmlToPdfResult => {
  if (!isRecord(result) || typeof result.outputFile !== "string" || result.outputFile.trim().length === 0) {
    throw createHtmlToPdfError("CONVERTER_PDF_PRINT_FAILED", "Host returned an invalid PDF export result.", {
      result,
    });
  }

  const pageCount =
    typeof result.pageCount === "number" && Number.isFinite(result.pageCount) ? Math.max(0, Math.floor(result.pageCount)) : undefined;

  return {
    outputFile: result.outputFile,
    ...(typeof pageCount === "number" ? { pageCount } : {}),
    ...(toWarnings(result.warnings).length > 0 ? { warnings: toWarnings(result.warnings) } : {}),
  };
};

const wrapHostError = (error: unknown, request: NormalizedHtmlToPdfRequest): never => {
  if (isHtmlToPdfError(error)) {
    throw error;
  }

  if (isRecord(error) && typeof error.code === "string") {
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

export const convertHtmlToPdf = async (
  ctx: HtmlToPdfContext,
  input: HtmlToPdfRequest,
): Promise<HtmlToPdfResult> => {
  const request = normalizeRequest(input);
  throwIfCancelled(ctx);
  await reportProgress(ctx, "prepare", 5, "Validating HTML input");
  await ensureInputExists(ctx, request);

  ctx.logger.info("Starting html to pdf conversion.", {
    htmlDir: request.htmlDir,
    entryFile: request.entryFile,
    outputFile: request.outputFile,
  });

  throwIfCancelled(ctx);
  await reportProgress(ctx, "render-pdf", 20, "Exporting HTML to PDF");

  let result: HtmlToPdfResult;
  try {
    const hostResult = await ctx.host.invoke("platform.renderHtmlToPdf", {
      htmlDir: request.htmlDir,
      entryFile: request.entryFile,
      outputFile: request.outputFile,
      ...(request.options ? { options: request.options } : {}),
    });
    result = normalizeHostResult(request, hostResult);
  } catch (error) {
    wrapHostError(error, request);
  }

  throwIfCancelled(ctx);
  const outputStat = await ensurePathStat(ctx, result.outputFile);
  if (!outputStat?.isFile) {
    throw createHtmlToPdfError("CONVERTER_OUTPUT_NOT_FOUND", `Output PDF was not written: ${result.outputFile}`, {
      outputFile: result.outputFile,
    });
  }

  await reportProgress(ctx, "completed", 100, "HTML to PDF conversion completed");
  return result;
};

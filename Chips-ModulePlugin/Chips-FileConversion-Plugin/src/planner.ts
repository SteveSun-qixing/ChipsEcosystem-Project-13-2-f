import { createConversionError } from "./errors";
import type {
  ConversionPlan,
  FileConvertRequest,
  FileTargetType,
  HtmlPackageMode,
  NormalizedConvertRequest,
  NormalizedHtmlSource,
  PlannedStep,
} from "./types";

const CARD_TO_HTML_CAPABILITY = "converter.card.to-html" as const;
const HTML_TO_PDF_CAPABILITY = "converter.html.to-pdf" as const;
const HTML_TO_IMAGE_CAPABILITY = "converter.html.to-image" as const;
const WINDOWS_ROOT_PATTERN = /^[A-Za-z]:[\\/]/;

const detectSeparator = (filePath: string): "/" | "\\" => {
  return filePath.includes("\\") || WINDOWS_ROOT_PATTERN.test(filePath) ? "\\" : "/";
};

const splitSegments = (filePath: string): string[] => {
  return filePath.split(/[\\/]+/).filter((segment) => segment.length > 0);
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

const createUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const normalizePackageMode = (
  request: FileConvertRequest,
  targetType: FileTargetType,
): HtmlPackageMode => {
  if (targetType === "pdf" || targetType === "image") {
    return "directory";
  }
  return request.options?.html?.packageMode ?? "zip";
};

const resolveIntermediateHtmlOptions = (
  targetType: FileTargetType,
  htmlOptions: NonNullable<FileConvertRequest["options"]>["html"],
): { includeAssets?: boolean; includeManifest?: boolean } => {
  if (targetType === "pdf" || targetType === "image") {
    return {
      includeAssets: true,
      includeManifest: true,
    };
  }

  return {
    includeAssets: htmlOptions?.includeAssets,
    includeManifest: htmlOptions?.includeManifest,
  };
};

const compactRecord = <T extends Record<string, unknown>>(record: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
};

const buildCardToHtmlOptions = (
  htmlOptions: { includeAssets?: boolean; includeManifest?: boolean },
  request: NormalizedConvertRequest,
): Record<string, unknown> | undefined => {
  const options = compactRecord({
    includeAssets: htmlOptions.includeAssets,
    includeManifest: htmlOptions.includeManifest,
    locale: request.options.locale,
    themeId: request.options.themeId,
  });

  return Object.keys(options).length > 0 ? options : undefined;
};

const buildHtmlToPdfOptions = (request: NormalizedConvertRequest): Record<string, unknown> | undefined => {
  const options = compactRecord({
    pageSize: request.options.pdf?.pageSize,
    landscape: request.options.pdf?.landscape,
    printBackground: request.options.pdf?.printBackground,
    marginMm: request.options.pdf?.marginMm,
  });

  return Object.keys(options).length > 0 ? options : undefined;
};

const buildHtmlToImageOptions = (request: NormalizedConvertRequest): Record<string, unknown> | undefined => {
  const options = compactRecord({
    format: request.options.image?.format,
    width: request.options.image?.width,
    height: request.options.image?.height,
    scaleFactor: request.options.image?.scaleFactor,
    background: request.options.image?.background,
  });

  return Object.keys(options).length > 0 ? options : undefined;
};

export const normalizeRequest = (request: FileConvertRequest): NormalizedConvertRequest => {
  if (!request || typeof request !== "object") {
    throw createConversionError("CONVERTER_INPUT_INVALID", "Conversion request must be an object.");
  }
  if (!request.source || typeof request.source !== "object") {
    throw createConversionError("CONVERTER_INPUT_INVALID", "request.source is required.");
  }
  if (!request.target || typeof request.target !== "object") {
    throw createConversionError("CONVERTER_INPUT_INVALID", "request.target is required.");
  }
  if (!request.output || typeof request.output !== "object") {
    throw createConversionError("CONVERTER_INPUT_INVALID", "request.output is required.");
  }

  const sourceType = request.source.type;
  const targetType = request.target.type;
  const sourcePath = request.source.path?.trim();
  const outputPath = request.output.path?.trim();

  if (sourceType !== "card" && sourceType !== "html") {
    throw createConversionError("CONVERTER_INPUT_INVALID", "request.source.type must be card or html.");
  }
  if (targetType !== "html" && targetType !== "pdf" && targetType !== "image") {
    throw createConversionError("CONVERTER_INPUT_INVALID", "request.target.type must be html, pdf, or image.");
  }
  if (!sourcePath) {
    throw createConversionError("CONVERTER_INPUT_INVALID", "request.source.path is required.");
  }
  if (!outputPath) {
    throw createConversionError("CONVERTER_INPUT_INVALID", "request.output.path is required.");
  }
  if (sourceType === "html" && targetType === "html") {
    throw createConversionError("CONVERTER_INPUT_UNSUPPORTED", "html -> html is not a supported conversion path.");
  }

  return {
    source: {
      type: sourceType,
      path: sourcePath,
    },
    target: {
      type: targetType,
    },
    output: {
      path: outputPath,
      overwrite: request.output.overwrite === true,
    },
    options: {
      ...(request.options ?? {}),
      html: {
        ...(request.options?.html ?? {}),
        packageMode: normalizePackageMode(request, targetType),
      },
    },
  };
};

export const resolveHtmlSource = (sourcePath: string, isFile: boolean): NormalizedHtmlSource => {
  if (!isFile) {
    return { htmlDir: sourcePath };
  }

  return {
    htmlDir: dirname(sourcePath),
    entryFile: basename(sourcePath),
  };
};

const createTemporaryHtmlRoot = (outputPath: string): string => {
  return joinPath(dirname(outputPath), `.chips-file-conversion-${createUuid()}`);
};

export const planConversion = (
  request: NormalizedConvertRequest,
  htmlSource: NormalizedHtmlSource | undefined,
): ConversionPlan => {
  const steps: PlannedStep[] = [];
  const htmlOptions = resolveIntermediateHtmlOptions(request.target.type, request.options.html);
  const cardToHtmlOptions = buildCardToHtmlOptions(htmlOptions, request);
  const htmlToPdfOptions = buildHtmlToPdfOptions(request);
  const htmlToImageOptions = buildHtmlToImageOptions(request);

  if (request.source.type === "card" && request.target.type === "html") {
    steps.push({
      capability: CARD_TO_HTML_CAPABILITY,
      method: "convert",
      progressStart: 5,
      progressEnd: 95,
      outputKind: request.options.html.packageMode === "directory" ? "html-directory" : "html-zip",
      outputPathField: "outputPath",
      defaultStage: "render-html",
      input: {
        cardFile: request.source.path,
        output: {
          path: request.output.path,
          packageMode: request.options.html.packageMode,
          overwrite: request.output.overwrite,
        },
        ...(cardToHtmlOptions ? { options: cardToHtmlOptions } : {}),
      },
    });
    return { request, steps };
  }

  if (request.source.type === "html") {
    if (!htmlSource) {
      throw createConversionError("CONVERTER_INPUT_INVALID", "Normalized html source is required for html conversions.");
    }

    if (request.target.type === "pdf") {
      steps.push({
        capability: HTML_TO_PDF_CAPABILITY,
        method: "convert",
        progressStart: 5,
        progressEnd: 95,
        outputKind: "pdf",
        outputPathField: "outputFile",
        defaultStage: "render-pdf",
        input: {
          htmlDir: htmlSource.htmlDir,
          entryFile: htmlSource.entryFile,
          outputFile: request.output.path,
          ...(htmlToPdfOptions ? { options: htmlToPdfOptions } : {}),
        },
      });
      return { request, steps };
    }

    if (request.target.type === "image") {
      steps.push({
        capability: HTML_TO_IMAGE_CAPABILITY,
        method: "convert",
        progressStart: 5,
        progressEnd: 95,
        outputKind: "image",
        outputPathField: "outputFile",
        defaultStage: "render-image",
        input: {
          htmlDir: htmlSource.htmlDir,
          entryFile: htmlSource.entryFile,
          outputFile: request.output.path,
          ...(htmlToImageOptions ? { options: htmlToImageOptions } : {}),
        },
      });
      return { request, steps };
    }
  }

  const temporaryHtmlRoot = createTemporaryHtmlRoot(request.output.path);
  const temporaryHtmlDir = joinPath(temporaryHtmlRoot, "html");

  steps.push({
    capability: CARD_TO_HTML_CAPABILITY,
    method: "convert",
    progressStart: 5,
    progressEnd: 55,
    outputKind: "html-directory",
    outputPathField: "outputPath",
    defaultStage: "render-html",
    input: {
      cardFile: request.source.path,
      output: {
        path: temporaryHtmlDir,
        packageMode: "directory",
        overwrite: true,
      },
      ...(cardToHtmlOptions ? { options: cardToHtmlOptions } : {}),
    },
  });

  if (request.target.type === "pdf") {
    steps.push({
      capability: HTML_TO_PDF_CAPABILITY,
      method: "convert",
      progressStart: 55,
      progressEnd: 95,
      outputKind: "pdf",
      outputPathField: "outputFile",
      defaultStage: "render-pdf",
      input: {
        htmlDir: temporaryHtmlDir,
        outputFile: request.output.path,
        ...(htmlToPdfOptions ? { options: htmlToPdfOptions } : {}),
      },
    });
    return { request, steps, temporaryHtmlDir, temporaryHtmlRoot };
  }

  if (request.target.type === "image") {
    steps.push({
      capability: HTML_TO_IMAGE_CAPABILITY,
      method: "convert",
      progressStart: 55,
      progressEnd: 95,
      outputKind: "image",
      outputPathField: "outputFile",
      defaultStage: "render-image",
      input: {
        htmlDir: temporaryHtmlDir,
        outputFile: request.output.path,
        ...(htmlToImageOptions ? { options: htmlToImageOptions } : {}),
      },
    });
    return { request, steps, temporaryHtmlDir, temporaryHtmlRoot };
  }

  throw createConversionError("CONVERTER_PIPELINE_NOT_FOUND", "No pipeline matches the requested conversion.", {
    sourceType: request.source.type,
    targetType: request.target.type,
  });
};

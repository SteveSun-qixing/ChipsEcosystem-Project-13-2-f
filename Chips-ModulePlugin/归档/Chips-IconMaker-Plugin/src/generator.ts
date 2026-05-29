import { normalizeBinaryPayload } from "./binary";
import { createIconMakerError } from "./errors";
import { createIcnsFileFromPng, createIcoFile } from "./encoders";
import type {
  HostFileStatLike,
  IconGenerateRequest,
  IconGenerateResult,
  IconMakerContext,
  IconOutputFormat,
} from "./types";

const VALID_FORMATS = new Set<IconOutputFormat>(["png", "ico", "icns"]);
const VALID_INPUT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const WINDOWS_ROOT_PATTERN = /^[A-Za-z]:[\\/]/;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const detectSeparator = (value: string): "/" | "\\" => {
  return value.includes("\\") || WINDOWS_ROOT_PATTERN.test(value) ? "\\" : "/";
};

const splitSegments = (value: string): string[] => value.split(/[\\/]+/).filter((segment) => segment.length > 0);

const trimTrailingSeparators = (value: string): string => value.replace(/[\\/]+$/, "");

const joinPath = (basePath: string, relativePath: string): string => {
  const separator = detectSeparator(basePath);
  const trimmedBase = trimTrailingSeparators(basePath);
  const relativeSegments = splitSegments(relativePath);
  if (relativeSegments.length === 0) {
    return trimmedBase;
  }
  return `${trimmedBase}${separator}${relativeSegments.join(separator)}`;
};

const dirname = (filePath: string): string => {
  const normalized = trimTrailingSeparators(filePath);
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

const basename = (filePath: string): string => splitSegments(filePath).at(-1) ?? filePath;

const extensionOf = (filePath: string): string => {
  const name = basename(filePath);
  const extensionIndex = name.lastIndexOf(".");
  return extensionIndex >= 0 ? name.slice(extensionIndex).toLowerCase() : "";
};

const stripExtension = (fileName: string): string => {
  const extensionIndex = fileName.lastIndexOf(".");
  return extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
};

const toSafeFileName = (name: string): string => {
  const normalized = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return normalized || "icon";
};

const randomId = (): string => {
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

const safeStat = async (ctx: IconMakerContext, filePath: string): Promise<HostFileStatLike | undefined> => {
  try {
    const response = await ctx.host.invoke<{ meta: unknown }>("file.stat", {
      path: filePath,
    });
    return toFileStat(response.meta);
  } catch {
    return undefined;
  }
};

const deletePathIfExists = async (ctx: IconMakerContext, targetPath: string): Promise<void> => {
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
    // Cleanup is best-effort; preserve the primary operation result or error.
  }
};

const reportProgress = async (
  ctx: IconMakerContext,
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

const throwIfCancelled = (ctx: IconMakerContext): void => {
  if (!ctx.job) {
    return;
  }
  if (ctx.job.signal.aborted || ctx.job.isCancelled()) {
    throw createIconMakerError("ICON_MAKER_JOB_CANCELLED", "Icon generation was cancelled.");
  }
};

const normalizeInput = (input: IconGenerateRequest): IconGenerateRequest => {
  if (!input || typeof input !== "object") {
    throw createIconMakerError("ICON_MAKER_INPUT_INVALID", "Icon generation input must be an object.");
  }

  const inputPath = asString(input.inputPath);
  const outputDir = asString(input.outputDir);
  const size = input.size;
  const formats = Array.isArray(input.formats) ? input.formats : [];
  const normalizedFormats = [...new Set(formats)];

  if (!inputPath) {
    throw createIconMakerError("ICON_MAKER_INPUT_INVALID", "inputPath is required.");
  }
  if (!outputDir) {
    throw createIconMakerError("ICON_MAKER_INPUT_INVALID", "outputDir is required.");
  }
  if (!Number.isInteger(size) || size < 16 || size > 1024) {
    throw createIconMakerError("ICON_MAKER_INPUT_INVALID", "size must be an integer between 16 and 1024.", {
      size,
    });
  }
  if (normalizedFormats.length === 0 || !normalizedFormats.every((format) => VALID_FORMATS.has(format))) {
    throw createIconMakerError("ICON_MAKER_INPUT_INVALID", "formats must include png, ico or icns.", {
      formats,
    });
  }

  const extension = extensionOf(inputPath);
  if (!VALID_INPUT_EXTENSIONS.has(extension)) {
    throw createIconMakerError("ICON_MAKER_INPUT_INVALID", "Input image extension is not supported.", {
      inputPath,
      supportedExtensions: [...VALID_INPUT_EXTENSIONS],
    });
  }

  return {
    inputPath,
    outputDir,
    size,
    formats: normalizedFormats,
  };
};

const ensurePaths = async (ctx: IconMakerContext, input: IconGenerateRequest): Promise<void> => {
  const inputStat = await safeStat(ctx, input.inputPath);
  if (!inputStat?.isFile) {
    throw createIconMakerError("ICON_MAKER_INPUT_NOT_FOUND", `Input image does not exist: ${input.inputPath}`, {
      inputPath: input.inputPath,
    });
  }

  const outputStat = await safeStat(ctx, input.outputDir);
  if (outputStat && !outputStat.isDirectory) {
    throw createIconMakerError("ICON_MAKER_OUTPUT_INVALID", `Output path is not a directory: ${input.outputDir}`, {
      outputDir: input.outputDir,
    });
  }
  if (!outputStat) {
    await ctx.host.invoke("file.mkdir", {
      path: input.outputDir,
      options: { recursive: true },
    });
  }
};

const fileUrlFromPath = (filePath: string): string => {
  if (filePath.startsWith("file://")) {
    return filePath;
  }
  const normalized = filePath.replace(/\\/g, "/");
  const prefixed = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `file://${prefixed.split("/").map((segment, index) => (index === 0 ? "" : encodeURIComponent(segment))).join("/")}`;
};

const escapeHtmlAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const createHtmlDocument = (inputPath: string, size: number): string => {
  const sourceUrl = escapeHtmlAttribute(fileUrlFromPath(inputPath));
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8" />',
    "<style>",
    "html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; overflow: hidden; }",
    ".icon-canvas { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: transparent; }",
    ".icon-canvas img { width: 100%; height: 100%; object-fit: contain; display: block; }",
    "</style>",
    "</head>",
    "<body>",
    `<main class="icon-canvas" style="width: ${size}px; height: ${size}px;">`,
    `<img src="${sourceUrl}" alt="" />`,
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
};

const writeBinaryFile = async (ctx: IconMakerContext, filePath: string, bytes: Uint8Array): Promise<void> => {
  try {
    await ctx.host.invoke("file.write", {
      path: filePath,
      content: bytes,
    });
  } catch (error) {
    throw createIconMakerError("ICON_MAKER_WRITE_FAILED", `Failed to write icon file: ${filePath}`, {
      filePath,
    }, error);
  }
};

const readBinaryFile = async (ctx: IconMakerContext, filePath: string): Promise<Uint8Array> => {
  const response = await ctx.host.invoke<{ content: unknown }>("file.read", {
    path: filePath,
    options: {
      encoding: "binary",
    },
  });
  return normalizeBinaryPayload(response.content);
};

const renderPng = async (
  ctx: IconMakerContext,
  input: IconGenerateRequest,
  tempDir: string,
): Promise<{ pngFile: string; pngBytes: Uint8Array }> => {
  const htmlFile = joinPath(tempDir, "index.html");
  const pngFile = joinPath(tempDir, "icon.png");
  await ctx.host.invoke("file.write", {
    path: htmlFile,
    content: createHtmlDocument(input.inputPath, input.size),
  });

  try {
    await ctx.host.invoke("platform.renderHtmlToImage", {
      htmlDir: tempDir,
      entryFile: "index.html",
      outputFile: pngFile,
      options: {
        format: "png",
        width: input.size,
        height: input.size,
        background: "transparent",
      },
    });
  } catch (error) {
    throw createIconMakerError("ICON_MAKER_RENDER_FAILED", "Failed to render source image as PNG icon.", {
      inputPath: input.inputPath,
      size: input.size,
    }, error);
  }

  return {
    pngFile,
    pngBytes: await readBinaryFile(ctx, pngFile),
  };
};

const resolveOutputBaseName = (inputPath: string): string => toSafeFileName(stripExtension(basename(inputPath)));

const buildOutputFile = (outputDir: string, baseName: string, format: IconOutputFormat): string =>
  joinPath(outputDir, `${baseName}-${format}.${format}`);

const writeRequestedFormats = async (
  ctx: IconMakerContext,
  input: IconGenerateRequest,
  pngBytes: Uint8Array,
): Promise<string[]> => {
  const outputBaseName = resolveOutputBaseName(input.inputPath);
  const files: string[] = [];

  for (const [index, format] of input.formats.entries()) {
    throwIfCancelled(ctx);
    const percent = 45 + Math.round(((index + 1) / input.formats.length) * 45);
    await reportProgress(ctx, `write-${format}`, percent, `Writing ${format.toUpperCase()} icon`);
    const outputFile = buildOutputFile(input.outputDir, outputBaseName, format);

    if (format === "png") {
      await writeBinaryFile(ctx, outputFile, pngBytes);
    } else if (format === "ico") {
      await writeBinaryFile(ctx, outputFile, createIcoFile([{ size: input.size, pngBytes }]));
    } else {
      await writeBinaryFile(ctx, outputFile, createIcnsFileFromPng(input.size, pngBytes));
    }

    files.push(outputFile);
  }

  return files;
};

export const generateIcons = async (
  ctx: IconMakerContext,
  rawInput: IconGenerateRequest,
): Promise<IconGenerateResult> => {
  const input = normalizeInput(rawInput);
  const tempDir = joinPath(input.outputDir, `.chips-iconmaker-${randomId()}`);

  try {
    await reportProgress(ctx, "prepare", 5, "Validating icon generation input");
    throwIfCancelled(ctx);
    await ensurePaths(ctx, input);
    await ctx.host.invoke("file.mkdir", {
      path: tempDir,
      options: { recursive: true },
    });

    await reportProgress(ctx, "render-png", 35, "Rendering source image to PNG");
    throwIfCancelled(ctx);
    const { pngBytes } = await renderPng(ctx, input, tempDir);

    const files = await writeRequestedFormats(ctx, input, pngBytes);
    await reportProgress(ctx, "completed", 100, "Icon generation completed");

    return {
      inputPath: input.inputPath,
      outputDir: input.outputDir,
      size: input.size,
      formats: input.formats,
      files,
    };
  } finally {
    await deletePathIfExists(ctx, tempDir);
  }
};

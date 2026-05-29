import type { Client, CommandInvocationContext } from "chips-sdk";
import { generateIconFiles } from "./generator";
import { createSourceIconImage, isSupportedIconSource } from "./image-loader";
import { DEFAULT_ICON_SETTINGS, ICON_FORMATS, type IconOutputFormat, type SourceIconImage } from "./types";

export interface IconMakerCliPayload {
  inputPath: string;
  outputDir: string;
  formats: IconOutputFormat[];
  size: number;
}

export interface IconMakerCliOutput {
  inputPath: string;
  outputDir: string;
  files: string[];
  formats: IconOutputFormat[];
  size: number;
}

export interface IconMakerCliRunInput {
  client: Client;
  payload?: Record<string, unknown>;
  context?: CommandInvocationContext;
  launchParams?: Record<string, unknown>;
}

const FORMAT_SET = new Set<IconOutputFormat>(ICON_FORMATS);
const DEFAULT_FORMATS = [...ICON_FORMATS];
const DEFAULT_SIZE = DEFAULT_ICON_SETTINGS.outputSize;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeFormats(value: unknown): IconOutputFormat[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : DEFAULT_FORMATS;
  const formats = values
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter((item): item is IconOutputFormat => FORMAT_SET.has(item as IconOutputFormat));

  return [...new Set(formats.length > 0 ? formats : DEFAULT_FORMATS)];
}

function normalizeSize(value: unknown): number {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : DEFAULT_SIZE;
  if (!Number.isInteger(raw) || raw < 16 || raw > 1024) {
    throw new Error("ICONMAKER_CLI_SIZE_INVALID");
  }
  return raw;
}

function normalizePathSegment(value: string): string {
  return value.replace(/[\\/]+$/g, "");
}

function joinPath(dir: string, fileName: string): string {
  const normalized = normalizePathSegment(dir);
  return `${normalized}/${fileName}`;
}

function inferMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function inferFileName(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() ?? "icon";
}

function createFileFromBytes(filePath: string, bytes: Uint8Array): File {
  const ownedBytes = new Uint8Array(bytes);
  return new File([ownedBytes.buffer], inferFileName(filePath), {
    type: inferMimeType(filePath),
    lastModified: Date.now(),
  });
}

function readTaskId(context?: CommandInvocationContext, launchParams?: Record<string, unknown>): string | undefined {
  if (typeof context?.taskId === "string" && context.taskId.length > 0) {
    return context.taskId;
  }
  const cliParams = isRecord(launchParams?.cli) ? launchParams.cli : undefined;
  const value = cliParams?.taskId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mergeCliPayload(
  payload?: Record<string, unknown>,
  launchParams?: Record<string, unknown>,
): Record<string, unknown> {
  const cliParams = isRecord(launchParams?.cli) ? launchParams.cli : undefined;
  const launchPayload = isRecord(cliParams?.payload) ? cliParams.payload : {};
  return {
    ...launchPayload,
    ...(payload ?? {}),
  };
}

export function normalizeIconMakerCliPayload(
  payload?: Record<string, unknown>,
  launchParams?: Record<string, unknown>,
): IconMakerCliPayload {
  const merged = mergeCliPayload(payload, launchParams);
  const inputPath = readString(merged, "inputPath");
  const outputDir = readString(merged, "outputDir");

  if (!inputPath) {
    throw new Error("ICONMAKER_CLI_INPUT_REQUIRED");
  }
  if (!outputDir) {
    throw new Error("ICONMAKER_CLI_OUTPUT_REQUIRED");
  }

  return {
    inputPath,
    outputDir,
    formats: normalizeFormats(merged.formats),
    size: normalizeSize(merged.size),
  };
}

async function reportProgress(client: Client, taskId: string | undefined, progress: Record<string, unknown>): Promise<void> {
  if (!taskId) {
    return;
  }
  await client.cliTask.progress(taskId, progress);
}

async function completeTask(client: Client, taskId: string | undefined, output: IconMakerCliOutput): Promise<void> {
  if (!taskId) {
    return;
  }
  await client.cliTask.complete(taskId, output);
}

async function failTask(client: Client, taskId: string | undefined, error: unknown): Promise<void> {
  if (!taskId) {
    return;
  }
  await client.cliTask.fail(taskId, error);
}

export async function runIconMakerCliCommand(input: IconMakerCliRunInput): Promise<IconMakerCliOutput> {
  const taskId = readTaskId(input.context, input.launchParams);
  let imageSource: SourceIconImage | null = null;

  try {
    const payload = normalizeIconMakerCliPayload(input.payload, input.launchParams);
    await reportProgress(input.client, taskId, { stage: "reading", percent: 5 });
    const content = await input.client.file.read(payload.inputPath, { encoding: "binary" });
    if (!(content instanceof Uint8Array)) {
      throw new Error("ICONMAKER_CLI_INPUT_NOT_BINARY");
    }

    const sourceFile = createFileFromBytes(payload.inputPath, content);
    if (!isSupportedIconSource(sourceFile)) {
      throw new Error("ICONMAKER_CLI_INPUT_UNSUPPORTED");
    }

    imageSource = await createSourceIconImage(sourceFile);
    await reportProgress(input.client, taskId, { stage: "generating", percent: 35 });
    const files = await generateIconFiles({
      size: payload.size,
      settings: {
        ...DEFAULT_ICON_SETTINGS,
        outputSize: payload.size,
        formats: payload.formats,
      },
      sourceMode: "image",
      imageSource,
      fontSource: {
        id: "cli-none",
        kind: "emoji",
        name: "CLI",
        family: "sans-serif",
        glyphs: [],
      },
      selectedGlyph: null,
    });

    await reportProgress(input.client, taskId, { stage: "writing", percent: 75 });
    await input.client.file.mkdir(payload.outputDir, { recursive: true });
    const outputFiles: string[] = [];
    for (const file of files) {
      const outputPath = joinPath(payload.outputDir, file.fileName);
      await input.client.file.write(outputPath, file.bytes, { encoding: "binary" });
      outputFiles.push(outputPath);
    }

    const output: IconMakerCliOutput = {
      inputPath: payload.inputPath,
      outputDir: payload.outputDir,
      files: outputFiles,
      formats: payload.formats,
      size: payload.size,
    };
    await reportProgress(input.client, taskId, { stage: "completed", percent: 100 });
    await input.client.log.write({
      level: "info",
      message: "IconMaker CLI generated icon files",
      metadata: { ...output },
    }).catch(() => undefined);
    await completeTask(input.client, taskId, output);
    return output;
  } catch (error) {
    await failTask(input.client, taskId, error).catch(() => undefined);
    throw error;
  } finally {
    if (imageSource) {
      URL.revokeObjectURL(imageSource.objectUrl);
    }
  }
}

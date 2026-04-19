import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { readBinaryFile } from "./binary";
import { asErrorCode, createColorPickerError } from "./errors";
import type { ColorPickRequest, ColorPickerContext, DecodedPng, HostFileStatLike } from "./types";

const DEFAULT_SAMPLE_SIZE = 96;
const MIN_SAMPLE_SIZE = 48;
const MAX_SAMPLE_SIZE = 160;
const SAMPLE_CACHE_LIMIT = 24;

export interface SampledImage extends DecodedPng {
  cacheKey: string;
  imagePath: string;
  sampleSize: number;
}

const clampSampleSize = (value: number | undefined): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_SAMPLE_SIZE;
  }

  return clamp(Math.round(value as number), MIN_SAMPLE_SIZE, MAX_SAMPLE_SIZE);
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const normalizeImagePath = (imagePath: string): string => {
  const trimmed = imagePath.trim();
  if (trimmed.length === 0) {
    throw createColorPickerError("COLOR_PICKER_INPUT_INVALID", "imagePath is required.");
  }

  if (trimmed.startsWith("file://")) {
    return fileURLToPath(trimmed);
  }

  if (/^[a-zA-Z]+:\/\//.test(trimmed)) {
    throw createColorPickerError("COLOR_PICKER_INPUT_INVALID", "Only local file paths or file:// URLs are supported.", {
      imagePath,
    });
  }

  return path.resolve(trimmed);
};

const sampledImageCache = new Map<string, SampledImage>();

const buildSampleCacheKey = (imagePath: string, sampleSize: number, meta: HostFileStatLike): string => {
  return `${imagePath}::${sampleSize}::${String(meta.size ?? "unknown")}::${String(meta.mtimeMs ?? "unknown")}`;
};

const rememberSample = (sample: SampledImage): void => {
  sampledImageCache.delete(sample.cacheKey);
  sampledImageCache.set(sample.cacheKey, sample);

  if (sampledImageCache.size <= SAMPLE_CACHE_LIMIT) {
    return;
  }

  const oldestKey = sampledImageCache.keys().next().value;
  if (typeof oldestKey === "string") {
    sampledImageCache.delete(oldestKey);
  }
};

const ensureSourceFile = async (ctx: ColorPickerContext, imagePath: string): Promise<HostFileStatLike> => {
  let response: { meta?: HostFileStatLike };
  try {
    response = await ctx.host.invoke<{ meta?: HostFileStatLike }>("file.stat", {
      path: imagePath,
    });
  } catch (error) {
    throw createColorPickerError("COLOR_PICKER_INPUT_NOT_FOUND", `Image file does not exist: ${imagePath}`, {
      imagePath,
    }, error);
  }

  if (!response.meta?.isFile) {
    throw createColorPickerError("COLOR_PICKER_INPUT_NOT_FOUND", `Image file does not exist: ${imagePath}`, {
      imagePath,
    });
  }

  return response.meta;
};

const reportProgress = async (
  ctx: ColorPickerContext,
  stage: string,
  percent: number,
  message: string,
): Promise<void> => {
  if (!ctx.job) {
    return;
  }

  await ctx.job.reportProgress({
    stage,
    percent,
    message,
  });
};

const toOwnedBytes = (input: Uint8Array): Uint8Array => {
  const output = new Uint8Array(input.byteLength);
  output.set(input);
  return output;
};

export const sampleImage = async (ctx: ColorPickerContext, input: ColorPickRequest): Promise<SampledImage> => {
  const imagePath = normalizeImagePath(input.imagePath);
  const sampleSize = clampSampleSize(input.options?.sampleSize);

  await reportProgress(ctx, "prepare", 5, "Validating image input");
  const sourceMeta = await ensureSourceFile(ctx, imagePath);
  const cacheKey = buildSampleCacheKey(imagePath, sampleSize, sourceMeta);
  const cached = sampledImageCache.get(cacheKey);

  if (cached) {
    sampledImageCache.delete(cacheKey);
    sampledImageCache.set(cacheKey, cached);
    ctx.logger.debug("Using cached sampled image.", {
      imagePath,
      sampleSize,
      cacheKey,
    });
    return cached;
  }

  ctx.logger.info("Sampling image for color analysis.", {
    imagePath,
    sampleSize,
  });

  try {
    await reportProgress(ctx, "sample-image", 35, "Rendering image sample");
    const imageBytes = await readBinaryFile(ctx, imagePath);
    const result = await sharp(Buffer.from(imageBytes.buffer, imageBytes.byteOffset, imageBytes.byteLength), {
      animated: false,
      failOn: "error",
    })
      .ensureAlpha()
      .resize(sampleSize, sampleSize, {
        fit: "contain",
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        },
        kernel: sharp.kernel.bilinear,
        fastShrinkOnLoad: true,
        withoutEnlargement: true,
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (result.info.width <= 0 || result.info.height <= 0 || result.info.channels !== 4) {
      throw createColorPickerError("COLOR_PICKER_IMAGE_SAMPLE_INVALID", "Decoded image sample is missing RGBA pixel data.", {
        imagePath,
        width: result.info.width,
        height: result.info.height,
        channels: result.info.channels,
      });
    }

    const sampled: SampledImage = {
      width: result.info.width,
      height: result.info.height,
      pixels: toOwnedBytes(new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength)),
      cacheKey,
      imagePath,
      sampleSize,
    };

    rememberSample(sampled);
    return sampled;
  } catch (error) {
    const code = asErrorCode(error);
    if (code === "FILE_NOT_FOUND") {
      throw createColorPickerError("COLOR_PICKER_INPUT_NOT_FOUND", `Image file does not exist: ${imagePath}`, { imagePath }, error);
    }

    if (error instanceof Error && "code" in error) {
      throw error;
    }

    throw createColorPickerError(
      "COLOR_PICKER_IMAGE_SAMPLE_FAILED",
      "Failed to sample the source image for color analysis.",
      { imagePath, sampleSize },
      error,
    );
  }
};

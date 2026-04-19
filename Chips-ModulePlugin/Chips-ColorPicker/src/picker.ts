import { analyzeColorSample } from "./color-analysis";
import { createColorPickerError } from "./errors";
import { sampleImage } from "./image-sampler";
import type { ColorPickRequest, ColorPickResult, ColorPickerContext } from "./types";

const RESULT_CACHE_LIMIT = 48;
const resultCache = new Map<string, ColorPickResult>();

const rememberResult = (cacheKey: string, result: ColorPickResult): void => {
  resultCache.delete(cacheKey);
  resultCache.set(cacheKey, result);

  if (resultCache.size <= RESULT_CACHE_LIMIT) {
    return;
  }

  const oldestKey = resultCache.keys().next().value;
  if (typeof oldestKey === "string") {
    resultCache.delete(oldestKey);
  }
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

export const pickImageColors = async (ctx: ColorPickerContext, input: ColorPickRequest): Promise<ColorPickResult> => {
  const sampled = await sampleImage(ctx, input);
  const cached = resultCache.get(sampled.cacheKey);

  if (cached) {
    resultCache.delete(sampled.cacheKey);
    resultCache.set(sampled.cacheKey, cached);
    ctx.logger.debug("Returning cached color picking result.", {
      imagePath: sampled.imagePath,
      sampleSize: sampled.sampleSize,
    });
    await reportProgress(ctx, "completed", 100, "Image color picking completed");
    return cached;
  }

  await reportProgress(ctx, "analyze", 80, "Analyzing representative colors");

  try {
    const result = analyzeColorSample(sampled);
    rememberResult(sampled.cacheKey, result);

    ctx.logger.info("Image color picking completed.", {
      imagePath: input.imagePath,
      backgroundColor: result.backgroundColor,
      accentColor: result.accentColor,
    });

    await reportProgress(ctx, "completed", 100, "Image color picking completed");
    return result;
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      throw error;
    }

    throw createColorPickerError("COLOR_PICKER_ANALYSIS_FAILED", "Failed to analyze image colors.", undefined, error);
  }
};

import { createConversionError, isConversionError } from "./errors";
import type {
  CardToHtmlResultLike,
  ChildModuleJobSnapshot,
  FileConvertArtifact,
  FileConvertResult,
  FileConvertWarning,
  FileModuleContext,
  FileStatLike,
  HtmlToImageResultLike,
  HtmlToPdfResultLike,
  PlannedStep,
  ConversionPlan,
} from "./types";

const POLL_INTERVAL_MS = 25;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const toFileStat = (value: unknown): FileStatLike | undefined => {
  const record = toRecord(value);
  if (!record) {
    return undefined;
  }
  return {
    isFile: typeof record.isFile === "boolean" ? record.isFile : undefined,
    isDirectory: typeof record.isDirectory === "boolean" ? record.isDirectory : undefined,
    size: typeof record.size === "number" ? record.size : undefined,
    mtimeMs: typeof record.mtimeMs === "number" ? record.mtimeMs : undefined,
  };
};

const toWarnings = (value: unknown): FileConvertWarning[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const record = toRecord(item);
    if (!record || typeof record.code !== "string" || typeof record.message !== "string") {
      return [];
    }
    return [{
      code: record.code,
      message: record.message,
      ...(typeof record.details !== "undefined" ? { details: record.details } : {}),
    }];
  });
};

const getMappedPercent = (start: number, end: number, rawPercent: unknown): number => {
  const numeric = typeof rawPercent === "number" && Number.isFinite(rawPercent) ? rawPercent : 0;
  const clamped = Math.max(0, Math.min(100, numeric));
  return start + ((end - start) * clamped) / 100;
};

const reportProgress = async (
  ctx: FileModuleContext,
  stage: string,
  percent: number,
  message?: string,
): Promise<void> => {
  await ctx.job?.reportProgress({
    stage,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    ...(message ? { message } : {}),
  });
};

const throwIfCancelled = async (
  ctx: FileModuleContext,
  childJobId?: string,
): Promise<void> => {
  if (!ctx.job?.signal.aborted && ctx.job?.isCancelled?.() !== true) {
    return;
  }

  if (childJobId) {
    try {
      await ctx.module.job.cancel(childJobId);
    } catch {
      // Best-effort child cancellation.
    }
  }

  throw createConversionError("CONVERTER_JOB_CANCELLED", "File conversion job was cancelled.");
};

const safeStat = async (ctx: FileModuleContext, filePath: string): Promise<FileStatLike | undefined> => {
  try {
    const result = await ctx.host.invoke<{ meta: unknown }>("file.stat", {
      path: filePath,
    });
    return toFileStat(result.meta);
  } catch {
    return undefined;
  }
};

const assertFinalOutputWritable = async (
  ctx: FileModuleContext,
  outputPath: string,
  overwrite: boolean,
): Promise<void> => {
  const existing = await safeStat(ctx, outputPath);
  if (!existing) {
    return;
  }

  if (!overwrite) {
    throw createConversionError("CONVERTER_OUTPUT_EXISTS", `Output already exists: ${outputPath}`, { outputPath });
  }
};

const ensureSourceExists = async (ctx: FileModuleContext, sourcePath: string): Promise<FileStatLike> => {
  const stat = await safeStat(ctx, sourcePath);
  if (!stat) {
    throw createConversionError("CONVERTER_INPUT_INVALID", `Source path does not exist: ${sourcePath}`, { sourcePath });
  }
  return stat;
};

const normalizeThrowable = (step: PlannedStep, error: unknown): Error => {
  if (isConversionError(error)) {
    return error;
  }

  const record = toRecord(error);
  const code = typeof record?.code === "string" ? record.code : undefined;
  const message = typeof record?.message === "string" ? record.message : undefined;
  if (code?.startsWith("CONVERTER_")) {
    return createConversionError(code, message ?? "Child module failed.", record?.details, record?.retryable === true);
  }

  if (code === "MODULE_PROVIDER_NOT_FOUND") {
    return createConversionError(
      "CONVERTER_PIPELINE_PROVIDER_MISSING",
      message ?? `No provider is available for ${step.capability}.`,
      {
        capability: step.capability,
        method: step.method,
        cause: record,
      },
      false,
    );
  }

  if (code === "MODULE_CAPABILITY_NOT_DECLARED" || code === "PERMISSION_DENIED" || code === "SERVICE_PERMISSION_DENIED") {
    return createConversionError(
      "CONVERTER_PIPELINE_PERMISSION_DENIED",
      message ?? `Permission denied while invoking ${step.capability}.`,
      {
        capability: step.capability,
        method: step.method,
        cause: record,
      },
      false,
    );
  }

  return createConversionError(
    "CONVERTER_PIPELINE_STEP_FAILED",
    `Pipeline step failed: ${step.capability}`,
    {
      capability: step.capability,
      method: step.method,
      cause: error,
    },
  );
};

const toChildJobSnapshot = (value: unknown): ChildModuleJobSnapshot | undefined => {
  const record = toRecord(value);
  if (!record || typeof record.jobId !== "string" || typeof record.status !== "string") {
    return undefined;
  }

  return {
    jobId: record.jobId,
    status: record.status as ChildModuleJobSnapshot["status"],
    progress: toRecord(record.progress),
    output: record.output,
    error: toRecord(record.error) as ChildModuleJobSnapshot["error"],
  };
};

const waitForChildJob = async (
  ctx: FileModuleContext,
  step: PlannedStep,
  jobId: string,
): Promise<unknown> => {
  let lastProgressKey = "";

  while (true) {
    await throwIfCancelled(ctx, jobId);

    const snapshot = toChildJobSnapshot(await ctx.module.job.get(jobId));
    if (!snapshot) {
      throw createConversionError("CONVERTER_PIPELINE_STEP_FAILED", "Child module returned an invalid job snapshot.", {
        capability: step.capability,
        jobId,
      });
    }

    const progress = snapshot.progress ?? {};
    const progressKey = JSON.stringify(progress);
    if (progressKey !== lastProgressKey && progressKey !== "{}") {
      lastProgressKey = progressKey;
      await reportProgress(
        ctx,
        typeof progress.stage === "string" ? progress.stage : step.defaultStage,
        getMappedPercent(step.progressStart, step.progressEnd, progress.percent),
        typeof progress.message === "string" ? progress.message : undefined,
      );
    }

    if (snapshot.status === "completed") {
      return snapshot.output;
    }

    if (snapshot.status === "failed" || snapshot.status === "cancelled") {
      const childError = snapshot.error;
      throw createConversionError(
        typeof childError?.code === "string" ? childError.code : "CONVERTER_PIPELINE_STEP_FAILED",
        typeof childError?.message === "string" ? childError.message : `Child job failed: ${step.capability}`,
        childError?.details,
        childError?.retryable,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }
};

const invokeStep = async (
  ctx: FileModuleContext,
  step: PlannedStep,
): Promise<unknown> => {
  await throwIfCancelled(ctx);
  await reportProgress(ctx, step.defaultStage, step.progressStart, `Invoking ${step.capability}`);

  try {
    const started = await ctx.module.invoke({
      capability: step.capability,
      method: step.method,
      input: step.input,
    });

    if (started.mode === "sync") {
      await reportProgress(ctx, step.defaultStage, step.progressEnd);
      return started.output;
    }

    if (started.mode === "job" && typeof started.jobId === "string") {
      const output = await waitForChildJob(ctx, step, started.jobId);
      await reportProgress(ctx, step.defaultStage, step.progressEnd);
      return output;
    }

    throw createConversionError("CONVERTER_PIPELINE_STEP_FAILED", "Child module returned an invalid invoke result.", {
      capability: step.capability,
      result: started,
    });
  } catch (error) {
    throw normalizeThrowable(step, error);
  }
};

const toArtifact = (step: PlannedStep, output: unknown): FileConvertArtifact => {
  const record = toRecord(output);
  if (!record) {
    throw createConversionError("CONVERTER_PIPELINE_STEP_FAILED", "Child module output must be an object.", {
      capability: step.capability,
      output,
    });
  }

  const rawPath = record[step.outputPathField];
  if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
    throw createConversionError("CONVERTER_PIPELINE_STEP_FAILED", "Child module output is missing its output path.", {
      capability: step.capability,
      output,
    });
  }

  if (step.outputKind === "html-zip" || step.outputKind === "html-directory") {
    const htmlOutput = record as CardToHtmlResultLike;
    return {
      type: step.outputKind,
      path: step.finalOutputPath ?? rawPath,
      entryFile: typeof htmlOutput.entryFile === "string" ? htmlOutput.entryFile : undefined,
      mimeType: step.outputKind === "html-zip" ? "application/zip" : "text/html",
    };
  }

  if (step.outputKind === "pdf") {
    return {
      type: "pdf",
      path: step.finalOutputPath ?? rawPath,
      mimeType: "application/pdf",
    };
  }

  const imageOutput = record as HtmlToImageResultLike;
  const format = imageOutput.format ?? "png";
  return {
    type: "image",
    path: step.finalOutputPath ?? rawPath,
    mimeType: `image/${format}`,
  };
};

const extractWarnings = (output: unknown): FileConvertWarning[] => {
  const record = toRecord(output);
  if (!record) {
    return [];
  }
  return toWarnings(record.warnings);
};

const ensureArtifactExists = async (
  ctx: FileModuleContext,
  step: PlannedStep,
  artifact: FileConvertArtifact,
): Promise<void> => {
  const statPath = step.stagedOutputPath ?? artifact.path;
  const stat = await safeStat(ctx, statPath);
  if (!stat) {
    throw createConversionError("CONVERTER_PIPELINE_STEP_FAILED", "Child module did not produce its declared artifact.", {
      capability: step.capability,
      artifact,
      stagedOutputPath: step.stagedOutputPath,
    });
  }

  if (artifact.type === "html-directory" && stat.isDirectory === false) {
    throw createConversionError("CONVERTER_PIPELINE_STEP_FAILED", "Child module produced an invalid html directory artifact.", {
      capability: step.capability,
      artifact,
      stat,
    });
  }

  if (artifact.type !== "html-directory" && stat.isFile === false) {
    throw createConversionError("CONVERTER_PIPELINE_STEP_FAILED", "Child module produced an invalid file artifact.", {
      capability: step.capability,
      artifact,
      stat,
    });
  }
};

const findPublishedStep = (plan: ConversionPlan): PlannedStep | undefined => {
  return plan.steps.find((step) => step.publishArtifact === true);
};

const createOutputCommitError = (
  plan: ConversionPlan,
  error: unknown,
  phase: "backup" | "publish",
): Error => {
  return createConversionError(
    "CONVERTER_OUTPUT_COMMIT_FAILED",
    `Failed to commit converted output: ${plan.request.output.path}`,
    {
      outputPath: plan.request.output.path,
      stagedOutputPath: plan.stagedFinalOutputPath,
      stagedBackupOutputPath: plan.stagedBackupOutputPath,
      phase,
      cause: error,
    },
  );
};

const commitStagedFinalOutput = async (
  ctx: FileModuleContext,
  plan: ConversionPlan,
): Promise<void> => {
  if (!plan.stagedFinalOutputPath) {
    return;
  }

  await throwIfCancelled(ctx);
  await reportProgress(ctx, "cleanup", 97, "Committing final output");

  let backupCreated = false;
  const publishedStep = findPublishedStep(plan);
  if (plan.request.output.overwrite) {
    const existing = await safeStat(ctx, plan.request.output.path);
    if (existing) {
      if (!plan.stagedBackupOutputPath) {
        throw createConversionError("CONVERTER_PIPELINE_STEP_FAILED", "Overwrite requires a staged backup path.", {
          outputPath: plan.request.output.path,
        });
      }
      try {
        await ctx.host.invoke("file.move", {
          sourcePath: plan.request.output.path,
          destPath: plan.stagedBackupOutputPath,
        });
      } catch (error) {
        throw createOutputCommitError(plan, error, "backup");
      }
      backupCreated = true;
    }
  }

  try {
    await ctx.host.invoke("file.move", {
      sourcePath: plan.stagedFinalOutputPath,
      destPath: plan.request.output.path,
    });
  } catch (error) {
    if (backupCreated && plan.stagedBackupOutputPath) {
      try {
        await ctx.host.invoke("file.move", {
          sourcePath: plan.stagedBackupOutputPath,
          destPath: plan.request.output.path,
        });
      } catch (restoreError) {
        ctx.logger.error("Failed to restore previous output after publish failure.", {
          outputPath: plan.request.output.path,
          backupPath: plan.stagedBackupOutputPath,
          error: restoreError,
        });
      }
    }
    throw createOutputCommitError(plan, error, "publish");
  }

  if (publishedStep) {
    publishedStep.stagedOutputPath = undefined;
  }
};

export const executePlan = async (
  ctx: FileModuleContext,
  plan: ConversionPlan,
): Promise<FileConvertResult> => {
  const warnings: FileConvertWarning[] = [];
  const artifacts: FileConvertArtifact[] = [];
  const pipeline = plan.steps.map((step) => ({
    capability: step.capability,
    method: step.method,
  }));

  await ensureSourceExists(ctx, plan.request.source.path);
  await assertFinalOutputWritable(ctx, plan.request.output.path, plan.request.output.overwrite);

  if (plan.temporaryHtmlRoot) {
    await ctx.host.invoke("file.mkdir", {
      path: plan.temporaryHtmlRoot,
      options: { recursive: true },
    });
  }

  if (plan.stagedFinalOutputDir) {
    await ctx.host.invoke("file.mkdir", {
      path: plan.stagedFinalOutputDir,
      options: { recursive: true },
    });
  }

  if (plan.stagedBackupOutputDir) {
    await ctx.host.invoke("file.mkdir", {
      path: plan.stagedBackupOutputDir,
      options: { recursive: true },
    });
  }

  try {
    for (const step of plan.steps) {
      const output = await invokeStep(ctx, step);
      warnings.push(...extractWarnings(output));
      const artifact = toArtifact(step, output);
      await ensureArtifactExists(ctx, step, artifact);
      artifacts.push(artifact);
    }

    await commitStagedFinalOutput(ctx, plan);
    await reportProgress(ctx, "cleanup", 98);

    return {
      sourceType: plan.request.source.type,
      targetType: plan.request.target.type,
      outputPath: plan.request.output.path,
      artifacts,
      pipeline,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } finally {
    if (plan.temporaryHtmlRoot) {
      try {
        await ctx.host.invoke("file.delete", {
          path: plan.temporaryHtmlRoot,
          options: { recursive: true },
        });
      } catch (error) {
        ctx.logger.warn("Failed to clean temporary html directory.", {
          temporaryHtmlRoot: plan.temporaryHtmlRoot,
          error,
        });
      }
    }
  }
};

import { executePlan } from "./executor";
import { normalizeRequest, planConversion, resolveHtmlSource } from "./planner";
import { createConversionError } from "./errors";
import type { FileConvertRequest, FileModuleContext } from "./types";

export type { FileConvertRequest, FileConvertResult } from "./types";

const resolveSourceShape = async (ctx: FileModuleContext, request: FileConvertRequest) => {
  if (request.source.type !== "html") {
    return undefined;
  }

  let stat: unknown;
  try {
    stat = (await ctx.host.invoke<{ meta: unknown }>("file.stat", {
      path: request.source.path,
    })).meta;
  } catch (error) {
    throw createConversionError("CONVERTER_INPUT_INVALID", `HTML source path does not exist: ${request.source.path}`, {
      sourcePath: request.source.path,
      cause: error,
    });
  }

  const isFile =
    Boolean(stat) &&
    typeof stat === "object" &&
    !Array.isArray(stat) &&
    (stat as Record<string, unknown>).isFile === true;

  return resolveHtmlSource(request.source.path, isFile);
};

const moduleDefinition = {
  providers: [
    {
      capability: "converter.file.convert",
      methods: {
        async convert(ctx: FileModuleContext, input: FileConvertRequest) {
          const normalizedRequest = normalizeRequest(input);
          const htmlSource = await resolveSourceShape(ctx, normalizedRequest);
          const plan = planConversion(normalizedRequest, htmlSource);

          ctx.logger.info("Starting file conversion.", {
            sourceType: normalizedRequest.source.type,
            targetType: normalizedRequest.target.type,
            outputPath: normalizedRequest.output.path,
            stepCount: plan.steps.length,
          });

          await ctx.job?.reportProgress({
            stage: "prepare",
            percent: 1,
            message: "Planning conversion pipeline",
          });

          const result = await executePlan(ctx, plan);

          await ctx.job?.reportProgress({
            stage: "completed",
            percent: 100,
            message: "File conversion completed",
          });

          return result;
        },
      },
    },
  ],
};

export default moduleDefinition;

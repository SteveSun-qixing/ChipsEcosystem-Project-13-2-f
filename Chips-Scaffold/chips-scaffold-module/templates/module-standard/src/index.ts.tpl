const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

class ModuleJobCancelledError extends Error {
  code = "MODULE_JOB_CANCELLED";

  constructor() {
    super("Module job was cancelled.");
    this.name = "ModuleJobCancelledError";
  }
}

export interface RunInput {
  sourceText: string;
  uppercase?: boolean;
  prefix?: string;
}

export interface RunAsyncInput extends RunInput {
  delayMs?: number;
}

export interface RunOutput {
  text: string;
  length: number;
  handledBy: string;
}

const toOutput = (sourceText: string, uppercase?: boolean, prefix?: string): RunOutput => {
  const normalized = uppercase ? sourceText.toUpperCase() : sourceText;
  const text = `${prefix ?? ""}${normalized}`;
  return {
    text,
    length: text.length,
    handledBy: "{{ PLUGIN_ID }}",
  };
};

type ModuleJobContext = {
  job?: {
    signal?: { aborted?: boolean };
    reportProgress(payload: Record<string, unknown>): Promise<void>;
    isCancelled?(): boolean;
  };
};

const throwIfCancelled = (ctx: ModuleJobContext): void => {
  if (ctx.job?.signal?.aborted || ctx.job?.isCancelled?.() === true) {
    throw new ModuleJobCancelledError();
  }
};

const moduleDefinition = {
  providers: [
    {
      capability: "{{ MODULE_CAPABILITY }}",
      methods: {
        async run(_ctx: unknown, input: RunInput): Promise<RunOutput> {
          return toOutput(input.sourceText, input.uppercase, input.prefix);
        },
        async runAsync(
          ctx: ModuleJobContext,
          input: RunAsyncInput
        ): Promise<RunOutput> {
          await ctx.job?.reportProgress({
            stage: "started",
            percent: 10,
          });
          throwIfCancelled(ctx);

          await sleep(typeof input.delayMs === "number" ? input.delayMs : 25);
          throwIfCancelled(ctx);

          await ctx.job?.reportProgress({
            stage: "completed",
            percent: 100,
          });

          return toOutput(input.sourceText, input.uppercase, input.prefix);
        },
      },
    },
  ],
};

export default moduleDefinition;

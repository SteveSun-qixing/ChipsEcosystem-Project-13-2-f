import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { FileConvertRequest, FileModuleContext } from "../../src/types";

const convert = moduleDefinition.providers[0]?.methods.convert;

type MutableFileStat = {
  isFile?: boolean;
  isDirectory?: boolean;
  size?: number;
  mtimeMs?: number;
};

const createContext = (
  fileStats: Record<string, MutableFileStat | undefined>,
  overrides?: Partial<FileModuleContext>,
): FileModuleContext => {
  const reportProgress = vi.fn().mockResolvedValue(undefined);
  const invoke = vi.fn();
  const getJob = vi.fn();
  const cancelJob = vi.fn().mockResolvedValue(undefined);
  const hostInvoke = vi.fn().mockImplementation(async (action: string, payload?: Record<string, unknown>) => {
    if (action === "file.stat") {
      const filePath = payload?.path as string;
      const meta = fileStats[filePath];
      if (!meta) {
        throw new Error(`ENOENT: ${filePath}`);
      }
      return { meta };
    }

    if (action === "file.mkdir") {
      const filePath = payload?.path as string;
      fileStats[filePath] = { isDirectory: true };
      return { ack: true };
    }

    if (action === "file.delete") {
      const filePath = payload?.path as string;
      delete fileStats[filePath];
      return { ack: true };
    }

    throw new Error(`Unexpected host action: ${action}`);
  });

  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    host: {
      invoke: hostInvoke,
    },
    module: {
      invoke,
      job: {
        get: getJob,
        cancel: cancelJob,
      },
    },
    job: {
      id: "job-1",
      signal: new AbortController().signal,
      reportProgress,
      isCancelled: vi.fn().mockReturnValue(false),
    },
    ...overrides,
  };
};

describe("file conversion module", () => {
  it("exposes the configured capability and convert method", () => {
    expect(moduleDefinition.providers[0]?.capability).toBe("converter.file.convert");
    expect(typeof convert).toBe("function");
  });

  it("invokes the card to html provider for direct html export", async () => {
    const request: FileConvertRequest = {
      source: { type: "card", path: "/workspace/demo.card" },
      target: { type: "html" },
      output: { path: "/workspace/output.zip" },
    };

    const fileStats: Record<string, MutableFileStat | undefined> = {
      "/workspace/demo.card": { isFile: true },
    };
    const ctx = createContext(fileStats);
    const invoke = vi.mocked(ctx.module.invoke);
    invoke.mockImplementation(async (started) => {
      fileStats["/workspace/output.zip"] = { isFile: true };
      expect(started).toEqual({
        capability: "converter.card.to-html",
        method: "convert",
        input: {
          cardFile: "/workspace/demo.card",
          output: {
            path: "/workspace/output.zip",
            packageMode: "zip",
            overwrite: false,
          },
        },
      });
      return {
        mode: "sync",
        output: {
          outputPath: "/workspace/output.zip",
          entryFile: "index.html",
          warnings: [{ code: "HTML_WARN", message: "minor issue" }],
        },
      };
    });

    const result = await convert?.(ctx, request);

    expect(result).toEqual({
      sourceType: "card",
      targetType: "html",
      outputPath: "/workspace/output.zip",
      artifacts: [
        {
          type: "html-zip",
          path: "/workspace/output.zip",
          entryFile: "index.html",
          mimeType: "application/zip",
        },
      ],
      pipeline: [{ capability: "converter.card.to-html", method: "convert" }],
      warnings: [{ code: "HTML_WARN", message: "minor issue" }],
    });
  });

  it("builds a two-step pipeline for card to pdf and cleans temporary output", async () => {
    const request: FileConvertRequest = {
      source: { type: "card", path: "/workspace/demo.card" },
      target: { type: "pdf" },
      output: { path: "/workspace/output.pdf", overwrite: true },
      options: {
        html: {
          includeAssets: false,
          includeManifest: false,
        },
        pdf: { pageSize: "A4" },
      },
    };

    const fileStats: Record<string, MutableFileStat | undefined> = {
      "/workspace/demo.card": { isFile: true },
      "/workspace/output.pdf": undefined,
    };
    const ctx = createContext(fileStats);
    const invoke = vi.mocked(ctx.module.invoke);
    let temporaryHtmlRoot = "";
    let temporaryHtmlDir = "";

    invoke
      .mockImplementationOnce(async (started) => {
        expect(started.capability).toBe("converter.card.to-html");
        const output = started.input.output as { path: string; packageMode: string; overwrite: boolean };
        expect(started.input.options).toEqual({
          includeAssets: true,
          includeManifest: true,
        });
        temporaryHtmlDir = output.path;
        temporaryHtmlRoot = output.path.replace(/\/html$/, "");
        fileStats[temporaryHtmlDir] = { isDirectory: true };
        return {
          mode: "sync",
          output: {
            outputPath: temporaryHtmlDir,
            entryFile: "index.html",
          },
        };
      })
      .mockImplementationOnce(async (started) => {
        expect(started).toEqual({
          capability: "converter.html.to-pdf",
          method: "convert",
          input: {
            htmlDir: temporaryHtmlDir,
            outputFile: "/workspace/output.pdf",
            options: { pageSize: "A4" },
          },
        });
        fileStats["/workspace/output.pdf"] = { isFile: true };
        return {
          mode: "sync",
          output: {
            outputFile: "/workspace/output.pdf",
          },
        };
      });

    const result = await convert?.(ctx, request);

    expect(ctx.host.invoke).toHaveBeenCalledWith("file.mkdir", {
      path: temporaryHtmlRoot,
      options: { recursive: true },
    });
    expect(ctx.host.invoke).toHaveBeenLastCalledWith("file.delete", {
      path: temporaryHtmlRoot,
      options: { recursive: true },
    });
    expect(result).toMatchObject({
      sourceType: "card",
      targetType: "pdf",
      outputPath: "/workspace/output.pdf",
      pipeline: [
        { capability: "converter.card.to-html", method: "convert" },
        { capability: "converter.html.to-pdf", method: "convert" },
      ],
    });
  });

  it("polls child jobs for async providers and forwards their result", async () => {
    const request: FileConvertRequest = {
      source: { type: "html", path: "/workspace/index.html" },
      target: { type: "pdf" },
      output: { path: "/workspace/output.pdf" },
    };

    const fileStats: Record<string, MutableFileStat | undefined> = {
      "/workspace/index.html": { isFile: true },
    };
    const ctx = createContext(fileStats);
    vi.mocked(ctx.module.invoke).mockResolvedValue({
      mode: "job",
      jobId: "child-job-1",
    });
    vi.mocked(ctx.module.job.get)
      .mockResolvedValueOnce({
        jobId: "child-job-1",
        status: "running",
        progress: {
          stage: "render-pdf",
          percent: 40,
          message: "still rendering",
        },
      })
      .mockImplementationOnce(async () => {
        fileStats["/workspace/output.pdf"] = { isFile: true };
        return {
          jobId: "child-job-1",
          status: "completed",
          output: {
            outputFile: "/workspace/output.pdf",
          },
        };
      });

    const result = await convert?.(ctx, request);

    expect(ctx.module.job.get).toHaveBeenCalledTimes(2);
    expect(ctx.module.invoke).toHaveBeenCalledWith({
      capability: "converter.html.to-pdf",
      method: "convert",
      input: {
        htmlDir: "/workspace",
        entryFile: "index.html",
        outputFile: "/workspace/output.pdf",
      },
    });
    expect(result).toMatchObject({
      sourceType: "html",
      targetType: "pdf",
      outputPath: "/workspace/output.pdf",
      artifacts: [{ type: "pdf", path: "/workspace/output.pdf" }],
    });
    expect(ctx.job?.reportProgress).toHaveBeenCalledWith({
      stage: "render-pdf",
      percent: 41,
      message: "still rendering",
    });
  });

  it("cancels the child job when the parent job is cancelled", async () => {
    const request: FileConvertRequest = {
      source: { type: "html", path: "/workspace/index.html" },
      target: { type: "image" },
      output: { path: "/workspace/output.png" },
    };

    const fileStats: Record<string, MutableFileStat | undefined> = {
      "/workspace/index.html": { isFile: true },
    };
    const ctx = createContext(fileStats);
    const isCancelled = vi
      .fn<() => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    ctx.job = {
      ...ctx.job!,
      isCancelled,
    };
    vi.mocked(ctx.module.invoke).mockResolvedValue({
      mode: "job",
      jobId: "child-job-2",
    });
    vi.mocked(ctx.module.job.get).mockResolvedValue({
      jobId: "child-job-2",
      status: "running",
      progress: { stage: "render-image", percent: 5 },
    });

    await expect(convert?.(ctx, request)).rejects.toMatchObject({
      code: "CONVERTER_JOB_CANCELLED",
    });
    expect(ctx.module.job.cancel).toHaveBeenCalledWith("child-job-2");
  });

  it("rejects unsupported html to html conversions before invoking child modules", async () => {
    const ctx = createContext({});

    await expect(
      convert?.(ctx, {
        source: { type: "html", path: "/workspace/index.html" },
        target: { type: "html" },
        output: { path: "/workspace/out.zip" },
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_INPUT_UNSUPPORTED",
    });
    expect(ctx.module.invoke).not.toHaveBeenCalled();
  });

  it("fails when the output already exists and overwrite is false", async () => {
    const request: FileConvertRequest = {
      source: { type: "card", path: "/workspace/demo.card" },
      target: { type: "html" },
      output: { path: "/workspace/output.zip", overwrite: false },
    };
    const ctx = createContext({
      "/workspace/demo.card": { isFile: true },
      "/workspace/output.zip": { isFile: true },
    });

    await expect(convert?.(ctx, request)).rejects.toMatchObject({
      code: "CONVERTER_OUTPUT_EXISTS",
    });
    expect(ctx.module.invoke).not.toHaveBeenCalled();
  });
});

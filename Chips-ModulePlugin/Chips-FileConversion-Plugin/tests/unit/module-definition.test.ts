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

    if (action === "file.move") {
      const sourcePath = payload?.sourcePath as string;
      const destPath = payload?.destPath as string;
      fileStats[destPath] = fileStats[sourcePath] ?? { isFile: true };
      delete fileStats[sourcePath];
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
      const output = started.input.output as { path: string; packageMode: string; overwrite: boolean };
      expect(started).toEqual({
        capability: "converter.card.to-html",
        method: "convert",
        input: {
          cardFile: "/workspace/demo.card",
          output: {
            path: output.path,
            packageMode: "zip",
            overwrite: false,
          },
        },
      });
      expect(output.path).not.toBe("/workspace/output.zip");
      fileStats[output.path] = { isFile: true };
      return {
        mode: "sync",
        output: {
          outputPath: output.path,
          entryFile: "index.html",
          warnings: [{ code: "HTML_WARN", message: "minor issue" }],
        },
      };
    });

    const result = await convert?.(ctx, request);

    expect(ctx.host.invoke).toHaveBeenCalledWith("file.move", {
      sourcePath: expect.stringContaining("/final/output.zip"),
      destPath: "/workspace/output.zip",
    });
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
        const outputFile = started.input.outputFile as string;
        expect(started).toEqual({
          capability: "converter.html.to-pdf",
          method: "convert",
          input: {
            htmlDir: temporaryHtmlDir,
            outputFile,
            options: { pageSize: "A4" },
          },
        });
        expect(outputFile).not.toBe("/workspace/output.pdf");
        fileStats[outputFile] = { isFile: true };
        return {
          mode: "sync",
          output: {
            outputFile,
          },
        };
      });

    const result = await convert?.(ctx, request);

    expect(ctx.host.invoke).toHaveBeenCalledWith("file.mkdir", {
      path: temporaryHtmlRoot,
      options: { recursive: true },
    });
    expect(ctx.host.invoke).toHaveBeenCalledWith("file.move", {
      sourcePath: expect.stringContaining("/final/output.pdf"),
      destPath: "/workspace/output.pdf",
    });
    expect(ctx.host.invoke).toHaveBeenLastCalledWith("file.delete", {
      path: temporaryHtmlRoot,
      options: { recursive: true },
    });
    expect(result).toMatchObject({
      sourceType: "card",
      targetType: "pdf",
      outputPath: "/workspace/output.pdf",
      artifacts: [
        { type: "html-directory", path: temporaryHtmlDir },
        { type: "pdf", path: "/workspace/output.pdf" },
      ],
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
        const invokeInput = vi.mocked(ctx.module.invoke).mock.calls[0]?.[0]?.input as { outputFile: string };
        fileStats[invokeInput.outputFile] = { isFile: true };
        return {
          jobId: "child-job-1",
          status: "completed",
          output: {
            outputFile: invokeInput.outputFile,
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
        outputFile: expect.stringContaining("/final/output.pdf"),
      },
    });
    expect(ctx.host.invoke).toHaveBeenCalledWith("file.move", {
      sourcePath: expect.stringContaining("/final/output.pdf"),
      destPath: "/workspace/output.pdf",
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

  it("maps missing downstream providers to a file conversion pipeline error", async () => {
    const request: FileConvertRequest = {
      source: { type: "html", path: "/workspace/index.html" },
      target: { type: "pdf" },
      output: { path: "/workspace/output.pdf" },
    };
    const ctx = createContext({
      "/workspace/index.html": { isFile: true },
    });
    vi.mocked(ctx.module.invoke).mockRejectedValue({
      code: "MODULE_PROVIDER_NOT_FOUND",
      message: "No matching module provider was found",
    });

    await expect(convert?.(ctx, request)).rejects.toMatchObject({
      code: "CONVERTER_PIPELINE_PROVIDER_MISSING",
      details: {
        capability: "converter.html.to-pdf",
        method: "convert",
      },
      retryable: false,
    });
  });

  it("maps permission failures without losing the required permission details", async () => {
    const request: FileConvertRequest = {
      source: { type: "html", path: "/workspace/index.html" },
      target: { type: "image" },
      output: { path: "/workspace/output.png" },
    };
    const ctx = createContext({
      "/workspace/index.html": { isFile: true },
    });
    vi.mocked(ctx.module.invoke).mockRejectedValue({
      code: "PERMISSION_DENIED",
      message: "module.invoke permission is required",
      details: {
        permission: {
          required: ["module.invoke"],
          granted: ["module.read"],
        },
      },
    });

    await expect(convert?.(ctx, request)).rejects.toMatchObject({
      code: "CONVERTER_PIPELINE_PERMISSION_DENIED",
      details: {
        capability: "converter.html.to-image",
        cause: {
          details: {
            permission: {
              required: ["module.invoke"],
              granted: ["module.read"],
            },
          },
        },
      },
      retryable: false,
    });
  });

  it("keeps the existing final output until all staged steps succeed", async () => {
    const request: FileConvertRequest = {
      source: { type: "card", path: "/workspace/demo.card" },
      target: { type: "image" },
      output: { path: "/workspace/output.png", overwrite: true },
    };
    const fileStats: Record<string, MutableFileStat | undefined> = {
      "/workspace/demo.card": { isFile: true },
      "/workspace/output.png": { isFile: true, size: 42 },
    };
    const ctx = createContext(fileStats);
    let temporaryHtmlRoot = "";
    vi.mocked(ctx.module.invoke)
      .mockImplementationOnce(async (started) => {
        const output = started.input.output as { path: string };
        temporaryHtmlRoot = output.path.replace(/\/html$/, "");
        fileStats[output.path] = { isDirectory: true };
        return {
          mode: "sync",
          output: {
            outputPath: output.path,
            entryFile: "index.html",
          },
        };
      })
      .mockRejectedValueOnce({
        code: "CONVERTER_IMAGE_RENDER_FAILED",
        message: "Host image rendering failed",
      });

    await expect(convert?.(ctx, request)).rejects.toMatchObject({
      code: "CONVERTER_IMAGE_RENDER_FAILED",
    });
    expect(fileStats["/workspace/output.png"]).toEqual({ isFile: true, size: 42 });
    expect(ctx.host.invoke).not.toHaveBeenCalledWith("file.delete", {
      path: "/workspace/output.png",
      options: expect.anything(),
    });
    expect(ctx.host.invoke).toHaveBeenCalledWith("file.delete", {
      path: temporaryHtmlRoot,
      options: { recursive: true },
    });
  });

  it("backs up and replaces existing final output only during the commit phase", async () => {
    const request: FileConvertRequest = {
      source: { type: "html", path: "/workspace/index.html" },
      target: { type: "pdf" },
      output: { path: "/workspace/output.pdf", overwrite: true },
    };
    const fileStats: Record<string, MutableFileStat | undefined> = {
      "/workspace/index.html": { isFile: true },
      "/workspace/output.pdf": { isFile: true, size: 11 },
    };
    const ctx = createContext(fileStats);
    let stagedOutputFile = "";
    vi.mocked(ctx.module.invoke).mockImplementation(async (started) => {
      stagedOutputFile = started.input.outputFile as string;
      expect(stagedOutputFile).not.toBe("/workspace/output.pdf");
      expect(fileStats["/workspace/output.pdf"]).toEqual({ isFile: true, size: 11 });
      fileStats[stagedOutputFile] = { isFile: true, size: 99 };
      return {
        mode: "sync",
        output: {
          outputFile: stagedOutputFile,
        },
      };
    });

    const result = await convert?.(ctx, request);

    expect(ctx.host.invoke).toHaveBeenCalledWith("file.move", {
      sourcePath: "/workspace/output.pdf",
      destPath: expect.stringContaining("/backup/output.pdf"),
    });
    expect(ctx.host.invoke).toHaveBeenCalledWith("file.move", {
      sourcePath: stagedOutputFile,
      destPath: "/workspace/output.pdf",
    });
    expect(fileStats["/workspace/output.pdf"]).toEqual({ isFile: true, size: 99 });
    expect(result).toMatchObject({
      outputPath: "/workspace/output.pdf",
      artifacts: [{ type: "pdf", path: "/workspace/output.pdf" }],
    });
  });

  it("maps backup failures during overwrite commit to output commit errors", async () => {
    const request: FileConvertRequest = {
      source: { type: "html", path: "/workspace/index.html" },
      target: { type: "pdf" },
      output: { path: "/workspace/output.pdf", overwrite: true },
    };
    const fileStats: Record<string, MutableFileStat | undefined> = {
      "/workspace/index.html": { isFile: true },
      "/workspace/output.pdf": { isFile: true, size: 11 },
    };
    const ctx = createContext(fileStats);
    const hostInvoke = vi.mocked(ctx.host.invoke);

    vi.mocked(ctx.module.invoke).mockImplementation(async (started) => {
      const stagedOutputFile = started.input.outputFile as string;
      fileStats[stagedOutputFile] = { isFile: true, size: 99 };
      return {
        mode: "sync",
        output: {
          outputFile: stagedOutputFile,
        },
      };
    });

    hostInvoke.mockImplementation(async (action: string, payload?: Record<string, unknown>) => {
      if (action === "file.move" && payload?.sourcePath === "/workspace/output.pdf") {
        throw Object.assign(new Error("backup denied"), {
          code: "SERVICE_PERMISSION_DENIED",
        });
      }
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
      if (action === "file.move") {
        const sourcePath = payload?.sourcePath as string;
        const destPath = payload?.destPath as string;
        fileStats[destPath] = fileStats[sourcePath] ?? { isFile: true };
        delete fileStats[sourcePath];
        return { ack: true };
      }
      throw new Error(`Unexpected host action: ${action}`);
    });

    await expect(convert?.(ctx, request)).rejects.toMatchObject({
      code: "CONVERTER_OUTPUT_COMMIT_FAILED",
      details: {
        outputPath: "/workspace/output.pdf",
        stagedOutputPath: expect.stringContaining("/final/output.pdf"),
        stagedBackupOutputPath: expect.stringContaining("/backup/output.pdf"),
        phase: "backup",
        cause: {
          code: "SERVICE_PERMISSION_DENIED",
        },
      },
    });
    expect(fileStats["/workspace/output.pdf"]).toEqual({ isFile: true, size: 11 });
    expect(hostInvoke).not.toHaveBeenCalledWith("file.move", {
      sourcePath: expect.stringContaining("/final/output.pdf"),
      destPath: "/workspace/output.pdf",
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

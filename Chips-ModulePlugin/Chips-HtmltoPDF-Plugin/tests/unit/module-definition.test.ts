import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { HtmlToPdfContext } from "../../src/types";

const convert = moduleDefinition.providers[0]?.methods.convert;

const createContext = (
  invokeImpl: (action: string, payload?: Record<string, unknown>) => Promise<unknown>,
  options?: {
    cancelled?: boolean;
  },
): HtmlToPdfContext => {
  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    host: {
      invoke: vi.fn(invokeImpl),
    },
    job: {
      id: "job-1",
      signal: new AbortController().signal,
      reportProgress: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi.fn().mockReturnValue(options?.cancelled === true),
    },
  };
};

describe("html to pdf module", () => {
  it("exports the formal converter.html.to-pdf capability", () => {
    expect(moduleDefinition.providers[0]?.capability).toBe("converter.html.to-pdf");
    expect(typeof convert).toBe("function");
  });

  it("validates html input and forwards the formal host export request", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const outputFile = path.resolve("/tmp/output.pdf");
    const entryPath = path.join(htmlDir, "index.html");

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === entryPath) {
          return { meta: { isDirectory: false, isFile: true } };
        }
        if (payload?.path === outputFile) {
          return { meta: { isDirectory: false, isFile: true } };
        }
      }

      if (action === "platform.renderHtmlToPdf") {
        expect(payload).toEqual({
          htmlDir,
          entryFile: "index.html",
          outputFile,
          options: {
            pageSize: "A4",
            landscape: true,
            marginMm: {
              top: 12,
            },
          },
        });
        return {
          outputFile,
          pageCount: 3,
        };
      }

      throw new Error(`Unexpected action: ${action}`);
    });

    const result = await convert?.(ctx, {
      htmlDir,
      outputFile,
      options: {
        pageSize: "A4",
        landscape: true,
        marginMm: {
          top: 12,
        },
      },
    });

    expect(result).toEqual({
      outputFile,
      pageCount: 3,
    });
    expect(ctx.job?.reportProgress).toHaveBeenNthCalledWith(1, {
      stage: "prepare",
      percent: 5,
      message: "Validating HTML input",
    });
    expect(ctx.job?.reportProgress).toHaveBeenNthCalledWith(2, {
      stage: "render-pdf",
      percent: 20,
      message: "Exporting HTML to PDF",
    });
    expect(ctx.job?.reportProgress).toHaveBeenNthCalledWith(3, {
      stage: "completed",
      percent: 100,
      message: "HTML to PDF conversion completed",
    });
  });

  it("rejects entry files that escape htmlDir", async () => {
    const ctx = createContext(async () => ({ meta: { isDirectory: true } }));

    await expect(
      convert?.(ctx, {
        htmlDir: path.resolve("/tmp/html-export"),
        entryFile: "../escape.html",
        outputFile: path.resolve("/tmp/output.pdf"),
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_INPUT_INVALID",
    });
  });

  it("rejects missing html entry files", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const entryPath = path.join(htmlDir, "index.html");
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === entryPath) {
          throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
        }
      }

      throw new Error(`Unexpected action: ${action}`);
    });

    await expect(
      convert?.(ctx, {
        htmlDir,
        outputFile: path.resolve("/tmp/output.pdf"),
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_INPUT_NOT_FOUND",
    });
  });

  it("maps host export failures to converter pdf errors", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const outputFile = path.resolve("/tmp/output.pdf");
    const entryPath = path.join(htmlDir, "index.html");
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === entryPath) {
          return { meta: { isDirectory: false, isFile: true } };
        }
      }

      if (action === "platform.renderHtmlToPdf") {
        throw {
          code: "PLATFORM_UNSUPPORTED",
          message: "printToPDF is unavailable",
          details: {
            runtime: "mock",
          },
          retryable: false,
        };
      }

      throw new Error(`Unexpected action: ${action}`);
    });

    await expect(
      convert?.(ctx, {
        htmlDir,
        outputFile,
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_PDF_PRINT_FAILED",
      message: "printToPDF is unavailable",
    });
  });

  it("rejects invalid pageSize values before calling host export", async () => {
    const ctx = createContext(async () => {
      throw new Error("should not run");
    });

    await expect(
      convert?.(ctx, {
        htmlDir: path.resolve("/tmp/html-export"),
        outputFile: path.resolve("/tmp/output.pdf"),
        options: {
          pageSize: "A5" as never,
        },
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_INPUT_INVALID",
    });
  });

  it("fails when host returns success but output file is missing", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const outputFile = path.resolve("/tmp/output.pdf");
    const entryPath = path.join(htmlDir, "index.html");
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === entryPath) {
          return { meta: { isDirectory: false, isFile: true } };
        }
        if (payload?.path === outputFile) {
          throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
        }
      }

      if (action === "platform.renderHtmlToPdf") {
        return {
          outputFile,
          pageCount: 2,
        };
      }

      throw new Error(`Unexpected action: ${action}`);
    });

    await expect(
      convert?.(ctx, {
        htmlDir,
        outputFile,
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_OUTPUT_NOT_FOUND",
    });
  });

  it("fails when host returns an invalid export result payload", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const outputFile = path.resolve("/tmp/output.pdf");
    const entryPath = path.join(htmlDir, "index.html");
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === entryPath) {
          return { meta: { isDirectory: false, isFile: true } };
        }
      }

      if (action === "platform.renderHtmlToPdf") {
        return {
          pageCount: 2,
        };
      }

      throw new Error(`Unexpected action: ${action}`);
    });

    await expect(
      convert?.(ctx, {
        htmlDir,
        outputFile,
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_PDF_PRINT_FAILED",
      message: "Host returned an invalid PDF export result.",
    });
  });

  it("stops before export when the parent job is already cancelled", async () => {
    const ctx = createContext(async () => {
      throw new Error("should not run");
    }, { cancelled: true });

    await expect(
      convert?.(ctx, {
        htmlDir: path.resolve("/tmp/html-export"),
        outputFile: path.resolve("/tmp/output.pdf"),
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_PIPELINE_CANCELLED",
    });
  });
});

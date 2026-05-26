import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { HtmlToPdfContext } from "../../src/types";

const convert = moduleDefinition.providers[0]?.methods.convert;

const createManifest = (entryFile = "index.html") => ({
  schemaVersion: "1.0.0",
  type: "card-to-html",
  generatedAt: "2026-05-26T00:00:00.000Z",
  source: {
    cardFile: "/workspace/source.card",
    title: "Export",
    semanticHash: "semantic-hash",
    locale: "zh-CN",
    themeId: "chips-default",
  },
  output: {
    entryFile,
    manifestFile: "conversion-manifest.json",
  },
  diagnostics: {
    renderDiagnostics: [
      {
        code: "CARD_RENDER_RESOURCE_MISSING",
        message: "missing resource",
      },
    ],
    renderConsistency: {
      status: "passed",
    },
    contentFiles: ["index.html", entryFile],
  },
});

const createContext = (
  invokeImpl: (action: string, payload?: Record<string, unknown>) => Promise<unknown>,
  options?: {
    cancelled?: boolean;
  },
): HtmlToPdfContext => {
  const hostInvoke = vi.fn(invokeImpl) as unknown as HtmlToPdfContext["host"]["invoke"];
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

  it("validates card-to-html manifest and publishes a staged PDF output", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const outputFile = path.resolve("/tmp/output.pdf");
    const entryPath = path.join(htmlDir, "index.html");
    const manifestPath = path.join(htmlDir, "conversion-manifest.json");
    let stagedOutputFile = "";

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === manifestPath || payload?.path === entryPath || payload?.path === stagedOutputFile) {
          return { meta: { isDirectory: false, isFile: true, size: 2048 } };
        }
        if (payload?.path === outputFile) {
          return stagedOutputFile ? { meta: { isDirectory: false, isFile: true, size: 2048 } } : { meta: undefined };
        }
      }

      if (action === "file.read" && payload?.path === manifestPath) {
        return {
          content: JSON.stringify(createManifest()),
        };
      }

      if (action === "file.mkdir") {
        return { ack: true };
      }

      if (action === "platform.renderHtmlToPdf") {
        expect(payload).toMatchObject({
          htmlDir,
          entryFile: "index.html",
          options: {
            pageSize: "A4",
            landscape: true,
            printBackground: true,
            preferCSSPageSize: true,
            marginMm: {
              top: 12,
            },
            headerFooter: {
              enabled: true,
              headerTemplate: "<span class=\"title\"></span>",
            },
            wait: {
              timeoutMs: 12000,
              quietMs: 250,
              waitForImages: true,
            },
          },
        });
        stagedOutputFile = String(payload?.outputFile);
        expect(stagedOutputFile).not.toBe(outputFile);
        return {
          outputFile: stagedOutputFile,
          pageCount: 3,
          diagnostics: [
            {
              code: "PDF_LINKS_PRESERVED",
            },
          ],
          warnings: [
            {
              code: "CONVERTER_PDF_RESOURCE_WARNING",
              message: "One resource loaded slowly.",
            },
          ],
        };
      }

      if (action === "file.move" && payload?.sourcePath === stagedOutputFile && payload?.destPath === outputFile) {
        return { ack: true };
      }

      if (action === "file.delete") {
        return { ack: true };
      }

      throw new Error(`Unexpected action: ${action}`);
    });

    const result = await convert?.(ctx, {
      htmlDir,
      outputFile,
      options: {
        pageSize: "A4",
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        marginMm: {
          top: 12,
        },
        headerFooter: {
          enabled: true,
          headerTemplate: "<span class=\"title\"></span>",
        },
        wait: {
          timeoutMs: 12000,
          quietMs: 250,
          waitForImages: true,
        },
      },
    });

    expect(result).toEqual({
      outputFile,
      entryFile: "index.html",
      mimeType: "application/pdf",
      pageCount: 3,
      byteLength: 2048,
      manifest: {
        schemaVersion: "1.0.0",
        generatedAt: "2026-05-26T00:00:00.000Z",
        semanticHash: "semantic-hash",
        locale: "zh-CN",
        themeId: "chips-default",
        renderDiagnostics: [
          {
            code: "CARD_RENDER_RESOURCE_MISSING",
            message: "missing resource",
          },
        ],
        renderConsistency: {
          status: "passed",
        },
        contentFiles: ["index.html", "index.html"],
      },
      diagnostics: [
        {
          code: "PDF_LINKS_PRESERVED",
        },
      ],
      warnings: [
        {
          code: "CONVERTER_PDF_RESOURCE_WARNING",
          message: "One resource loaded slowly.",
          details: undefined,
        },
      ],
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
      stage: "cleanup",
      percent: 90,
      message: "Committing PDF output",
    });
    expect(ctx.job?.reportProgress).toHaveBeenNthCalledWith(4, {
      stage: "completed",
      percent: 100,
      message: "HTML to PDF conversion completed",
    });
  });

  it("uses the manifest entry file when input omits entryFile", async () => {
    const htmlDir = path.resolve("/tmp/html-export-manifest-entry");
    const outputFile = path.resolve("/tmp/manifest-entry.pdf");
    const entryPath = path.join(htmlDir, "print.html");
    const manifestPath = path.join(htmlDir, "conversion-manifest.json");
    let stagedOutputFile = "";

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true } };
        }
        if (payload?.path === manifestPath || payload?.path === entryPath || payload?.path === stagedOutputFile) {
          return { meta: { isFile: true, size: 512 } };
        }
        if (payload?.path === outputFile) {
          return stagedOutputFile ? { meta: { isFile: true, size: 512 } } : { meta: undefined };
        }
        return { meta: undefined };
      }
      if (action === "file.read") {
        return { content: JSON.stringify(createManifest("print.html")) };
      }
      if (action === "file.mkdir" || action === "file.move" || action === "file.delete") {
        return { ack: true };
      }
      if (action === "platform.renderHtmlToPdf") {
        expect(payload?.entryFile).toBe("print.html");
        stagedOutputFile = String(payload?.outputFile);
        return { outputFile: stagedOutputFile, pageCount: 1 };
      }
      throw new Error(`Unexpected action: ${action}`);
    });

    await expect(convert?.(ctx, { htmlDir, outputFile })).resolves.toMatchObject({
      outputFile,
      entryFile: "print.html",
      mimeType: "application/pdf",
      pageCount: 1,
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

  it("rejects missing conversion manifests", async () => {
    const htmlDir = path.resolve("/tmp/html-export-missing-manifest");
    const manifestPath = path.join(htmlDir, "conversion-manifest.json");
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat" && payload?.path === htmlDir) {
        return { meta: { isDirectory: true, isFile: false } };
      }
      if (action === "file.stat" && payload?.path === manifestPath) {
        return { meta: undefined };
      }

      throw new Error(`Unexpected action: ${action}`);
    });

    await expect(
      convert?.(ctx, {
        htmlDir,
        outputFile: path.resolve("/tmp/output.pdf"),
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_HTML_MANIFEST_INVALID",
    });
  });

  it("rejects missing html entry files after manifest resolution", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const entryPath = path.join(htmlDir, "index.html");
    const manifestPath = path.join(htmlDir, "conversion-manifest.json");
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === manifestPath) {
          return { meta: { isDirectory: false, isFile: true } };
        }
        if (payload?.path === entryPath) {
          return { meta: undefined };
        }
      }
      if (action === "file.read") {
        return { content: JSON.stringify(createManifest()) };
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

  it("maps host export failures to converter pdf errors and cleans staged output", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const outputFile = path.resolve("/tmp/output.pdf");
    const entryPath = path.join(htmlDir, "index.html");
    const manifestPath = path.join(htmlDir, "conversion-manifest.json");
    const deleteCalls: unknown[] = [];
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === manifestPath || payload?.path === entryPath) {
          return { meta: { isDirectory: false, isFile: true } };
        }
        return { meta: undefined };
      }
      if (action === "file.read") {
        return { content: JSON.stringify(createManifest()) };
      }
      if (action === "file.mkdir") {
        return { ack: true };
      }
      if (action === "file.delete") {
        deleteCalls.push(payload);
        return { ack: true };
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
    expect(deleteCalls.length).toBeGreaterThan(0);
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

  it("fails when host returns success but the staged output file is missing", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const outputFile = path.resolve("/tmp/output.pdf");
    const entryPath = path.join(htmlDir, "index.html");
    const manifestPath = path.join(htmlDir, "conversion-manifest.json");
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === manifestPath || payload?.path === entryPath) {
          return { meta: { isDirectory: false, isFile: true } };
        }
        return { meta: undefined };
      }
      if (action === "file.read") {
        return { content: JSON.stringify(createManifest()) };
      }
      if (action === "file.mkdir" || action === "file.delete") {
        return { ack: true };
      }
      if (action === "platform.renderHtmlToPdf") {
        return {
          outputFile: String(payload?.outputFile),
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
    const manifestPath = path.join(htmlDir, "conversion-manifest.json");
    let stagedOutputFile = "";
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true, isFile: false } };
        }
        if (payload?.path === manifestPath || payload?.path === entryPath || payload?.path === stagedOutputFile) {
          return { meta: { isDirectory: false, isFile: true } };
        }
        return { meta: undefined };
      }
      if (action === "file.read") {
        return { content: JSON.stringify(createManifest()) };
      }
      if (action === "file.mkdir" || action === "file.delete") {
        return { ack: true };
      }
      if (action === "platform.renderHtmlToPdf") {
        stagedOutputFile = String(payload?.outputFile);
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

  it("rejects existing output unless overwrite is true", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const outputFile = path.resolve("/tmp/output.pdf");
    const entryPath = path.join(htmlDir, "index.html");
    const manifestPath = path.join(htmlDir, "conversion-manifest.json");
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true } };
        }
        if (payload?.path === manifestPath || payload?.path === entryPath || payload?.path === outputFile) {
          return { meta: { isFile: true } };
        }
      }
      if (action === "file.read") {
        return { content: JSON.stringify(createManifest()) };
      }
      throw new Error(`Unexpected action: ${action}`);
    });

    await expect(convert?.(ctx, { htmlDir, outputFile })).rejects.toMatchObject({
      code: "CONVERTER_OUTPUT_EXISTS",
    });
  });

  it("backs up and restores existing output when overwrite commit fails", async () => {
    const htmlDir = path.resolve("/tmp/html-export");
    const outputFile = path.resolve("/tmp/output.pdf");
    const entryPath = path.join(htmlDir, "index.html");
    const manifestPath = path.join(htmlDir, "conversion-manifest.json");
    let stagedOutputFile = "";
    let backupOutputFile = "";
    const moveCalls: unknown[] = [];
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === htmlDir) {
          return { meta: { isDirectory: true } };
        }
        if (payload?.path === manifestPath || payload?.path === entryPath || payload?.path === outputFile || payload?.path === stagedOutputFile) {
          return { meta: { isFile: true, size: 1024 } };
        }
        return { meta: undefined };
      }
      if (action === "file.read") {
        return { content: JSON.stringify(createManifest()) };
      }
      if (action === "file.mkdir" || action === "file.delete") {
        return { ack: true };
      }
      if (action === "platform.renderHtmlToPdf") {
        stagedOutputFile = String(payload?.outputFile);
        return { outputFile: stagedOutputFile, pageCount: 1 };
      }
      if (action === "file.move") {
        moveCalls.push(payload);
        if (payload?.sourcePath === outputFile) {
          backupOutputFile = String(payload?.destPath);
          return { ack: true };
        }
        if (payload?.sourcePath === stagedOutputFile && payload?.destPath === outputFile) {
          throw Object.assign(new Error("commit failed"), { code: "FILE_MOVE_FAILED" });
        }
        if (payload?.sourcePath === backupOutputFile && payload?.destPath === outputFile) {
          return { ack: true };
        }
      }
      throw new Error(`Unexpected action: ${action}`);
    });

    await expect(convert?.(ctx, { htmlDir, outputFile, overwrite: true })).rejects.toMatchObject({
      code: "CONVERTER_OUTPUT_COMMIT_FAILED",
    });
    expect(moveCalls).toContainEqual({
      sourcePath: backupOutputFile,
      destPath: outputFile,
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

import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { HtmlToPdfContext } from "../../src/types";
import {
  assertExistingMaterialPath,
  createOfficialHtmlIntermediateFixture,
  readMaterialText,
  statHostPath,
} from "../../../tests/real-materials";

const convert = moduleDefinition.providers[0]?.methods.convert;

const createContext = (manifest: string): { ctx: HtmlToPdfContext; hostInvoke: ReturnType<typeof vi.fn> } => {
  const stagedOutputStats = new Map<string, { isFile: boolean; size: number }>();
  const hostInvoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
    if (action === "file.stat") {
      const targetPath = String(payload?.path ?? "");
      const staged = stagedOutputStats.get(targetPath);
      if (staged) {
        return { meta: staged };
      }
      return { meta: await statHostPath(targetPath) };
    }

    if (action === "file.read") {
      return { content: manifest };
    }

    if (action === "file.mkdir") {
      return { ack: true };
    }

    if (action === "platform.renderHtmlToPdf") {
      expect(payload).toMatchObject({
        entryFile: "index.html",
        options: {
          pageSize: "A4",
          printBackground: true,
          preferCSSPageSize: true,
          wait: {
            waitForFonts: true,
            waitForImages: true,
            waitForFrames: true,
            waitForCompositeReady: true,
          },
        },
      });
      const outputFile = String(payload?.outputFile ?? "");
      stagedOutputStats.set(outputFile, { isFile: true, size: 8192 });
      return {
        outputFile,
        pageCount: 2,
        diagnostics: [
          {
            code: "REAL_HTML_PRINT_READY",
          },
        ],
      };
    }

    if (action === "file.move") {
      const sourcePath = String(payload?.sourcePath ?? "");
      const destPath = String(payload?.destPath ?? "");
      const source = stagedOutputStats.get(sourcePath);
      if (source) {
        stagedOutputStats.delete(sourcePath);
        stagedOutputStats.set(destPath, source);
      }
      return { ack: true };
    }

    if (action === "file.delete") {
      return { ack: true };
    }

    throw new Error(`Unexpected host action: ${action}`);
  });

  return {
    ctx: {
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      host: {
        invoke: hostInvoke as HtmlToPdfContext["host"]["invoke"],
      },
      job: {
        id: "job-html-to-pdf-real-material",
        signal: new AbortController().signal,
        reportProgress: vi.fn().mockResolvedValue(undefined),
        isCancelled: vi.fn().mockReturnValue(false),
      },
    },
    hostInvoke,
  };
};

describe("html to pdf real finished materials", () => {
  it("prints the real 昙花 HTML directory and preserves CardToHTML requested theme and locale diagnostics", async () => {
    const entryFile = await assertExistingMaterialPath("昙花/index.html");
    const stylesFile = await assertExistingMaterialPath("昙花/styles.css");
    const html = await readMaterialText("昙花/index.html");
    const manifest = JSON.stringify({
      schemaVersion: "1.0.0",
      type: "card-to-html",
      generatedAt: "2026-05-26T00:00:00.000Z",
      source: {
        cardFile: "ProductFinishedProductTestingSpace/昙花/index.html",
        title: "昙花夜放",
        semanticHash: "real-tanhua-html",
        requestedThemeId: "chips-official.default-dark-theme",
        requestedLocale: "zh-CN",
      },
      output: {
        entryFile: "index.html",
        manifestFile: "conversion-manifest.json",
      },
      diagnostics: {
        renderDiagnostics: [{ code: "REAL_HTML_DIRECTORY", entryFile }],
        renderConsistency: { status: "passed" },
        contentFiles: [entryFile, stylesFile],
      },
    });
    const htmlDir = await createOfficialHtmlIntermediateFixture("昙花", "tanhua-pdf", JSON.parse(manifest) as Record<string, unknown>);
    const outputFile = path.join(path.dirname(htmlDir), "..", "task05604-html-to-pdf", "昙花.pdf");
    const { ctx, hostInvoke } = createContext(manifest);

    expect(html).toContain("昙花把最盛大的时刻");

    const output = await convert?.(ctx, {
      htmlDir,
      outputFile,
      options: {
        pageSize: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        wait: {
          waitForFonts: true,
          waitForImages: true,
          waitForFrames: true,
          waitForCompositeReady: true,
        },
      },
    });

    expect(hostInvoke).toHaveBeenCalledWith("platform.renderHtmlToPdf", {
      htmlDir,
      entryFile: "index.html",
      outputFile: expect.stringContaining(".chips-html-to-pdf-"),
      options: {
        pageSize: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        wait: {
          waitForFonts: true,
          waitForImages: true,
          waitForFrames: true,
          waitForCompositeReady: true,
        },
      },
    });
    expect(output).toMatchObject({
      outputFile,
      entryFile: "index.html",
      mimeType: "application/pdf",
      pageCount: 2,
      byteLength: 8192,
      manifest: {
        schemaVersion: "1.0.0",
        generatedAt: "2026-05-26T00:00:00.000Z",
        semanticHash: "real-tanhua-html",
        locale: "zh-CN",
        themeId: "chips-official.default-dark-theme",
        renderConsistency: { status: "passed" },
      },
      diagnostics: [
        {
          code: "REAL_HTML_PRINT_READY",
        },
      ],
    });
  });
});

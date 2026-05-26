import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { HtmlToImageContext } from "../../src/types";
import {
  assertExistingMaterialPath,
  createOfficialHtmlIntermediateFixture,
  readMaterialText,
  statHostPath,
} from "../../../tests/real-materials";

const createContext = (manifest: string): { ctx: HtmlToImageContext; hostInvoke: ReturnType<typeof vi.fn> } => {
  const stagedOutputStats = new Map<string, { isFile: boolean; size: number }>();
  const hostInvoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
    if (action === "file.stat") {
      const targetPath = String(payload?.path ?? "");
      return { meta: stagedOutputStats.get(targetPath) ?? await statHostPath(targetPath) };
    }

    if (action === "file.read") {
      return { content: manifest };
    }

    if (action === "platform.renderHtmlToImage") {
      expect(payload).toMatchObject({
        entryFile: "index.html",
        options: {
          format: "png",
          width: 1440,
          height: 1080,
          scaleFactor: 1,
          background: "theme",
        },
      });
      const outputFile = String(payload?.outputFile ?? "");
      stagedOutputStats.set(outputFile, { isFile: true, size: 4096 });
      return {
        outputFile,
        width: 1440,
        height: 1080,
        format: "png",
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
        invoke: hostInvoke as HtmlToImageContext["host"]["invoke"],
      },
      job: {
        id: "job-html-to-image-real-material",
        signal: new AbortController().signal,
        reportProgress: vi.fn().mockResolvedValue(undefined),
        isCancelled: vi.fn().mockReturnValue(false),
      },
    },
    hostInvoke,
  };
};

describe("html to image real finished materials", () => {
  it("captures the real 昙花 HTML directory through the Host image export action with CardToHTML diagnostics", async () => {
    const entryFile = await assertExistingMaterialPath("昙花/index.html");
    const stylesFile = await assertExistingMaterialPath("昙花/styles.css");
    const scriptFile = await assertExistingMaterialPath("昙花/script.js");
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
      assets: {
        included: true,
        root: ".",
        count: 3,
      },
      diagnostics: {
        renderDiagnostics: [{ code: "REAL_HTML_DIRECTORY", entryFile }],
        renderConsistency: { status: "passed" },
        contentFiles: [entryFile, stylesFile, scriptFile],
      },
    });
    const htmlDir = await createOfficialHtmlIntermediateFixture("昙花", "tanhua-image", JSON.parse(manifest) as Record<string, unknown>);
    const outputFile = path.join(path.dirname(htmlDir), "..", "task05604-html-to-image", "昙花.png");
    const { ctx, hostInvoke } = createContext(manifest);

    expect(html).toContain("<title>昙花夜放</title>");

    const output = await moduleDefinition.providers[0]!.methods.convert(ctx, {
      htmlDir,
      outputFile,
      options: {
        format: "png",
        width: 1440,
        height: 1080,
        scaleFactor: 1,
        background: "theme",
      },
    });

    expect(hostInvoke).toHaveBeenCalledWith("platform.renderHtmlToImage", {
      htmlDir,
      entryFile: "index.html",
      outputFile: expect.stringContaining(".chips-html-to-image-"),
      options: {
        format: "png",
        width: 1440,
        height: 1080,
        scaleFactor: 1,
        background: "theme",
      },
    });
    expect(output).toMatchObject({
      outputFile,
      width: 1440,
      height: 1080,
      format: "png",
      diagnostics: {
        html: {
          manifestFile: "conversion-manifest.json",
          schemaVersion: "1.0.0",
          entryFile: "index.html",
          type: "card-to-html",
        },
        resources: {
          assetsIncluded: true,
          assetRoot: ".",
          assetCount: 3,
          renderConsistency: { status: "passed" },
        },
        render: {
          hostAction: "platform.renderHtmlToImage",
          waitUntil: "managed",
          background: "theme",
          scaleFactor: 1,
        },
        output: {
          file: outputFile,
          width: 1440,
          height: 1080,
          format: "png",
          mimeType: "image/png",
        },
      },
    });
  });
});

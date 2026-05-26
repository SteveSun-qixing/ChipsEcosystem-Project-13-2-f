import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { FileModuleContext } from "../../src/types";
import {
  assertExistingMaterialDirectory,
  assertExistingMaterialPath,
  readStoreZipArchive,
  statHostPath,
  toMaterialPath,
} from "../../../tests/real-materials";

const convert = moduleDefinition.providers[0]?.methods.convert;

const createContext = (): FileModuleContext & {
  hostInvoke: ReturnType<typeof vi.fn>;
  moduleInvoke: ReturnType<typeof vi.fn>;
  fileStats: Map<string, { isFile?: boolean; isDirectory?: boolean; size?: number }>;
} => {
  const fileStats = new Map<string, { isFile?: boolean; isDirectory?: boolean; size?: number }>();
  const hostInvoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
    if (action === "file.stat") {
      const targetPath = String(payload?.path ?? "");
      return { meta: fileStats.get(targetPath) ?? await statHostPath(targetPath) };
    }

    if (action === "file.mkdir") {
      fileStats.set(String(payload?.path ?? ""), { isDirectory: true });
      return { ack: true };
    }

    if (action === "file.move") {
      const sourcePath = String(payload?.sourcePath ?? "");
      const destPath = String(payload?.destPath ?? "");
      fileStats.set(destPath, fileStats.get(sourcePath) ?? { isFile: true, size: 1 });
      fileStats.delete(sourcePath);
      return { ack: true };
    }

    if (action === "file.delete") {
      fileStats.delete(String(payload?.path ?? ""));
      return { ack: true };
    }

    throw new Error(`Unexpected host action: ${action}`);
  });
  const moduleInvoke = vi.fn();

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
      invoke: moduleInvoke,
      job: {
        get: vi.fn(),
        cancel: vi.fn().mockResolvedValue(undefined),
      },
    },
    job: {
      id: "job-file-conversion-real-material",
      signal: new AbortController().signal,
      reportProgress: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi.fn().mockReturnValue(false),
    },
    hostInvoke,
    moduleInvoke,
    fileStats,
  };
};

describe("file conversion real finished materials", () => {
  it("plans a real card to image pipeline through module.invoke and publishes only the final image output", async () => {
    const archive = await readStoreZipArchive("富文本基础卡片.card");
    const cardFile = archive.filePath;
    const outputFile = path.join(toMaterialPath("."), "..", "test-results", "task05604-file-conversion", "富文本基础卡片.png");
    const ctx = createContext();

    ctx.moduleInvoke
      .mockImplementationOnce(async (request) => {
        expect(request).toEqual({
          capability: "converter.card.to-html",
          method: "convert",
          input: {
            cardFile,
            output: {
              path: expect.stringMatching(/\.chips-file-conversion-.+[\\/]html$/u),
              packageMode: "directory",
              overwrite: true,
            },
            options: {
              includeAssets: true,
              includeManifest: true,
              locale: "zh-CN",
              themeId: "chips-official.default-dark-theme",
            },
          },
        });
        const htmlOutputPath = String(request.input.output.path);
        ctx.fileStats.set(htmlOutputPath, { isDirectory: true });
        return {
          mode: "sync",
          output: {
            packageMode: "directory",
            outputPath: htmlOutputPath,
            entryFile: "index.html",
            manifestFile: "conversion-manifest.json",
            semanticHash: "real-richtext-semantic-hash",
            assetCount: archive.entries.length,
          },
        };
      })
      .mockImplementationOnce(async (request) => {
        expect(request).toEqual({
          capability: "converter.html.to-image",
          method: "convert",
          input: {
            htmlDir: expect.stringMatching(/\.chips-file-conversion-.+[\\/]html$/u),
            outputFile: expect.stringMatching(/\.chips-file-conversion-.+[\\/]final[\\/]富文本基础卡片\.png$/u),
            options: {
              format: "png",
              width: 1280,
              background: "theme",
            },
          },
        });
        const imageOutputFile = String(request.input.outputFile);
        ctx.fileStats.set(imageOutputFile, { isFile: true, size: 8192 });
        return {
          mode: "sync",
          output: {
            outputFile: imageOutputFile,
            format: "png",
            width: 1280,
            height: 960,
          },
        };
      });

    const result = await convert?.(ctx, {
      source: {
        type: "card",
        path: cardFile,
      },
      target: {
        type: "image",
      },
      output: {
        path: outputFile,
        overwrite: true,
      },
      options: {
        locale: "zh-CN",
        themeId: "chips-official.default-dark-theme",
        image: {
          format: "png",
          width: 1280,
          background: "theme",
        },
      },
    });

    expect(result).toMatchObject({
      sourceType: "card",
      targetType: "image",
      outputPath: outputFile,
      artifacts: [
        {
          type: "html-directory",
          entryFile: "index.html",
          mimeType: "text/html",
        },
        {
          type: "image",
          path: outputFile,
          mimeType: "image/png",
        },
      ],
      pipeline: [
        { capability: "converter.card.to-html", method: "convert" },
        { capability: "converter.html.to-image", method: "convert" },
      ],
    });
    expect(ctx.hostInvoke).toHaveBeenCalledWith("file.move", {
      sourcePath: expect.stringMatching(/\.chips-file-conversion-.+[\\/]final[\\/]富文本基础卡片\.png$/u),
      destPath: outputFile,
    });
    expect(ctx.hostInvoke).toHaveBeenLastCalledWith("file.delete", {
      path: expect.stringContaining(".chips-file-conversion-"),
      options: { recursive: true },
    });
  });

  it.each([
    ["image", "图片.jpg", "image"],
    ["audio", "测试音频.mp3", "audio"],
    ["video", "测试视频.mp4", "video"],
    ["web archive", "昙花网页.zip", "web-archive"],
  ])("returns a structured unsupported-source diagnostic for real %s material", async (_label, relativePath, sourceType) => {
    const sourcePath = await assertExistingMaterialPath(relativePath);
    const ctx = createContext();

    await expect(
      convert?.(ctx, {
        source: {
          type: sourceType,
          path: sourcePath,
        } as never,
        target: {
          type: "pdf",
        },
        output: {
          path: path.join(toMaterialPath("."), "..", "test-results", "task05604-file-conversion", `${relativePath}.pdf`),
        },
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_INPUT_INVALID",
    });
    expect(ctx.moduleInvoke).not.toHaveBeenCalled();
  });

  it("normalizes a real HTML directory source and invokes the PDF provider with index.html as entry", async () => {
    const htmlDir = await assertExistingMaterialDirectory("昙花");
    const entryFile = await assertExistingMaterialPath("昙花/index.html");
    const outputFile = path.join(toMaterialPath("."), "..", "test-results", "task05604-file-conversion", "昙花.pdf");
    const ctx = createContext();

    ctx.moduleInvoke.mockImplementationOnce(async (request) => {
      expect(request).toEqual({
        capability: "converter.html.to-pdf",
        method: "convert",
        input: {
          htmlDir,
          entryFile: undefined,
          outputFile: expect.stringMatching(/\.chips-file-conversion-output-.+[\\/]final[\\/]昙花\.pdf$/u),
          options: {
            pageSize: "A4",
            printBackground: true,
          },
        },
      });
      const pdfOutputFile = String(request.input.outputFile);
      ctx.fileStats.set(pdfOutputFile, { isFile: true, size: 4096 });
      return {
        mode: "sync",
        output: {
          outputFile: pdfOutputFile,
        },
      };
    });

    const result = await convert?.(ctx, {
      source: {
        type: "html",
        path: htmlDir,
      },
      target: {
        type: "pdf",
      },
      output: {
        path: outputFile,
      },
      options: {
        pdf: {
          pageSize: "A4",
          printBackground: true,
        },
      },
    });

    expect(await statHostPath(entryFile)).toMatchObject({ isFile: true });
    expect(result).toMatchObject({
      sourceType: "html",
      targetType: "pdf",
      outputPath: outputFile,
      artifacts: [
        {
          type: "pdf",
          path: outputFile,
          mimeType: "application/pdf",
        },
      ],
      pipeline: [{ capability: "converter.html.to-pdf", method: "convert" }],
    });
  });
});

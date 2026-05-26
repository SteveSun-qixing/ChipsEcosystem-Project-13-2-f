import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { HtmlToImageContext } from "../../src/types";

type FileStat = {
  isFile?: boolean;
  isDirectory?: boolean;
  size?: number;
  mtimeMs?: number;
};

const createLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const createJob = () => ({
  id: "job-1",
  signal: new AbortController().signal,
  reportProgress: vi.fn().mockResolvedValue(undefined),
  isCancelled: vi.fn().mockReturnValue(false),
});

const createManifest = (overrides: Record<string, unknown> = {}): string => {
  return JSON.stringify({
    schemaVersion: "1.0.0",
    type: "card-to-html",
    generatedAt: "2026-05-26T00:00:00.000Z",
    source: {
      cardFile: "/workspace/demo.card",
      semanticHash: "hash-demo",
      requestedThemeId: "chips.default",
      requestedLocale: "zh-CN",
    },
    output: {
      entryFile: "index.html",
      manifestFile: "conversion-manifest.json",
    },
    assets: {
      included: true,
      root: "assets/content",
      count: 3,
    },
    diagnostics: {
      renderDiagnostics: [{ code: "CARD_RENDER_OK" }],
      renderConsistency: { status: "passed" },
      contentFiles: ["card-a.html"],
    },
    warnings: [
      {
        code: "UPSTREAM_WARN",
        message: "Upstream warning",
      },
    ],
    ...overrides,
  });
};

const createContext = (options?: {
  manifest?: string;
  fileStats?: Record<string, FileStat | undefined>;
  hostResult?: Record<string, unknown>;
  hostError?: Error & { code?: string };
  job?: ReturnType<typeof createJob>;
}): { ctx: HtmlToImageContext; hostInvoke: ReturnType<typeof vi.fn>; fileStats: Record<string, FileStat | undefined> } => {
  const fileStats: Record<string, FileStat | undefined> = {
    "/workspace/export": { isDirectory: true },
    "/workspace/export/conversion-manifest.json": { isFile: true, size: 256 },
    "/workspace/export/index.html": { isFile: true, size: 1024 },
    ...(options?.fileStats ?? {}),
  };
  const manifest = options?.manifest ?? createManifest();
  const hostResult = options?.hostResult;
  const hostError = options?.hostError;

  const invoke: HtmlToImageContext["host"]["invoke"] = async <TOutput,>(
    action: string,
    payload?: Record<string, unknown>,
  ): Promise<TOutput> => {
    switch (action) {
      case "file.stat": {
        const meta = fileStats[payload?.path as string];
        return { meta } as TOutput;
      }
      case "file.read":
        return { content: manifest } as TOutput;
      case "file.delete":
        delete fileStats[payload?.path as string];
        return { ack: true } as TOutput;
      case "file.move": {
        const sourcePath = payload?.sourcePath as string;
        const destPath = payload?.destPath as string;
        fileStats[destPath] = fileStats[sourcePath] ?? { isFile: true, size: 1 };
        delete fileStats[sourcePath];
        return { ack: true } as TOutput;
      }
      case "platform.renderHtmlToImage": {
        if (hostError) {
          throw hostError;
        }
        const outputFile = payload?.outputFile as string;
        const format = (payload?.options as { format?: string } | undefined)?.format ?? "png";
        fileStats[outputFile] = { isFile: true, size: 4096 };
        return {
          outputFile,
          width: 1920,
          height: 1080,
          format,
          ...(hostResult ?? {}),
        } as TOutput;
      }
      default:
        throw new Error(`Unexpected action: ${action}`);
    }
  };
  const hostInvoke = vi.fn(invoke);

  return {
    ctx: {
      logger: createLogger(),
      host: {
        invoke: hostInvoke as HtmlToImageContext["host"]["invoke"],
      },
      ...(options?.job ? { job: options.job } : {}),
    },
    hostInvoke,
    fileStats,
  };
};

describe("HtmltoImage module definition", () => {
  it("exposes converter.html.to-image and commits a successful host export with diagnostics", async () => {
    const job = createJob();
    const { ctx, hostInvoke } = createContext({ job });

    expect(moduleDefinition.providers[0]?.capability).toBe("converter.html.to-image");

    const output = await moduleDefinition.providers[0]?.methods.convert(ctx, {
      htmlDir: "/workspace/export",
      outputFile: "/workspace/out/result.png",
      options: {
        format: "png",
        width: 1280,
        height: 720,
        scaleFactor: 2,
        background: "theme",
      },
    });

    expect(hostInvoke).toHaveBeenCalledWith("platform.renderHtmlToImage", {
      htmlDir: "/workspace/export",
      entryFile: "index.html",
      outputFile: expect.stringContaining("/workspace/out/.chips-html-to-image-"),
      options: {
        format: "png",
        width: 1280,
        height: 720,
        scaleFactor: 2,
        background: "theme",
      },
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.move", {
      sourcePath: expect.stringContaining("/workspace/out/.chips-html-to-image-"),
      destPath: "/workspace/out/result.png",
    });
    expect(output).toMatchObject({
      outputFile: "/workspace/out/result.png",
      width: 1920,
      height: 1080,
      format: "png",
      diagnostics: {
        html: {
          manifestFile: "conversion-manifest.json",
          schemaVersion: "1.0.0",
          generatedAt: "2026-05-26T00:00:00.000Z",
          entryFile: "index.html",
          type: "card-to-html",
        },
        resources: {
          assetsIncluded: true,
          assetRoot: "assets/content",
          assetCount: 3,
          contentFiles: ["card-a.html"],
          renderDiagnostics: [{ code: "CARD_RENDER_OK" }],
          renderConsistency: { status: "passed" },
          upstreamWarnings: [{ code: "UPSTREAM_WARN", message: "Upstream warning" }],
        },
        render: {
          hostAction: "platform.renderHtmlToImage",
          waitUntil: "managed",
          background: "theme",
          scaleFactor: 2,
        },
        output: {
          file: "/workspace/out/result.png",
          sizeBytes: 4096,
          width: 1920,
          height: 1080,
          format: "png",
          mimeType: "image/png",
        },
      },
    });
    expect(output?.warnings).toEqual([{ code: "UPSTREAM_WARN", message: "Upstream warning" }]);

    expect(job.reportProgress).toHaveBeenNthCalledWith(1, {
      stage: "prepare",
      percent: 5,
      message: "Preparing HTML to image conversion",
    });
    expect(job.reportProgress).toHaveBeenNthCalledWith(2, {
      stage: "render-image",
      percent: 30,
      message: "Rendering HTML and capturing image",
    });
    expect(job.reportProgress).toHaveBeenNthCalledWith(3, {
      stage: "cleanup",
      percent: 90,
      message: "Committing image output",
    });
    expect(job.reportProgress).toHaveBeenNthCalledWith(4, {
      stage: "completed",
      percent: 100,
      message: "HTML to image conversion completed",
    });
  });

  it("normalizes transparent JPEG background to white and returns a warning", async () => {
    const { ctx, hostInvoke } = createContext({
      manifest: createManifest({
        warnings: [],
      }),
      hostResult: {
        width: 800,
        height: 600,
        format: "jpeg",
      },
    });

    const output = await moduleDefinition.providers[0]?.methods.convert(ctx, {
      htmlDir: "/workspace/export",
      outputFile: "/workspace/out/result.jpg",
      options: {
        format: "jpeg",
        background: "transparent",
      },
    });

    expect(hostInvoke).toHaveBeenCalledWith("platform.renderHtmlToImage", {
      htmlDir: "/workspace/export",
      entryFile: "index.html",
      outputFile: expect.stringContaining("/workspace/out/.chips-html-to-image-"),
      options: {
        format: "jpeg",
        background: "white",
      },
    });

    expect(output).toMatchObject({
      outputFile: "/workspace/out/result.jpg",
      width: 800,
      height: 600,
      format: "jpeg",
      warnings: [
        {
          code: "CONVERTER_IMAGE_BACKGROUND_FALLBACK",
          message: "JPEG does not support transparent background. Background was normalized to white.",
          details: {
            requestedBackground: "transparent",
            appliedBackground: "white",
          },
        },
      ],
      diagnostics: {
        render: {
          background: "white",
        },
        output: {
          file: "/workspace/out/result.jpg",
          format: "jpeg",
          mimeType: "image/jpeg",
        },
      },
    });
  });

  it("fails when conversion-manifest.json is missing", async () => {
    const { ctx } = createContext({
      fileStats: {
        "/workspace/export/conversion-manifest.json": undefined,
      },
    });

    await expect(
      moduleDefinition.providers[0]?.methods.convert(ctx, {
        htmlDir: "/workspace/export",
        outputFile: "/workspace/out/result.png",
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_HTML_MANIFEST_INVALID",
    });
  });

  it("maps unsupported webp export to a converter error", async () => {
    const error = new Error("Current Electron runtime does not expose WEBP image export") as Error & { code: string };
    error.code = "PLATFORM_UNSUPPORTED";
    const { ctx } = createContext({ hostError: error });

    await expect(
      moduleDefinition.providers[0]?.methods.convert(ctx, {
        htmlDir: "/workspace/export",
        outputFile: "/workspace/out/result.webp",
        options: {
          format: "webp",
        },
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_IMAGE_UNSUPPORTED_FORMAT",
    });
  });

  it("keeps the existing image until overwrite commit succeeds", async () => {
    const { ctx, hostInvoke, fileStats } = createContext({
      fileStats: {
        "/workspace/out/result.png": { isFile: true, size: 11 },
      },
    });

    await expect(
      moduleDefinition.providers[0]?.methods.convert(ctx, {
        htmlDir: "/workspace/export",
        outputFile: "/workspace/out/result.png",
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_OUTPUT_EXISTS",
    });
    expect(fileStats["/workspace/out/result.png"]).toEqual({ isFile: true, size: 11 });
    expect(hostInvoke).not.toHaveBeenCalledWith("platform.renderHtmlToImage", expect.anything());

    const output = await moduleDefinition.providers[0]?.methods.convert(ctx, {
      htmlDir: "/workspace/export",
      outputFile: "/workspace/out/result.png",
      overwrite: true,
    });

    expect(hostInvoke).toHaveBeenCalledWith("file.move", {
      sourcePath: "/workspace/out/result.png",
      destPath: expect.stringContaining("/workspace/out/.chips-html-to-image-"),
    });
    expect(output).toMatchObject({
      outputFile: "/workspace/out/result.png",
      format: "png",
    });
    expect(fileStats["/workspace/out/result.png"]).toEqual({ isFile: true, size: 4096 });
  });
});

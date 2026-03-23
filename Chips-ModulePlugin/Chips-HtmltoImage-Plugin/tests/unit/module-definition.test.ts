import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { HtmlToImageContext } from "../../src/types";

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

describe("HtmltoImage module definition", () => {
  it("exposes converter.html.to-image and maps a successful host export", async () => {
    const logger = createLogger();
    const job = createJob();
    const hostInvoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
      switch (action) {
        case "file.stat":
          if (payload?.path === "/workspace/export") {
            return { meta: { isDirectory: true } };
          }
          if (payload?.path === "/workspace/export/conversion-manifest.json") {
            return { meta: { isFile: true } };
          }
          if (payload?.path === "/workspace/export/index.html") {
            return { meta: { isFile: true } };
          }
          return { meta: undefined };
        case "file.read":
          return {
            content: JSON.stringify({
              schemaVersion: "1.0.0",
              type: "card-to-html",
              output: {
                entryFile: "index.html",
                manifestFile: "conversion-manifest.json",
              },
            }),
          };
        case "platform.renderHtmlToImage":
          return {
            outputFile: "/workspace/out/result.png",
            width: 1920,
            height: 1080,
            format: "png",
          };
        default:
          throw new Error(`Unexpected action: ${action}`);
      }
    });

    const ctx: HtmlToImageContext = {
      logger,
      host: {
        invoke: hostInvoke,
      },
      job,
    };

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

    expect(output).toEqual({
      outputFile: "/workspace/out/result.png",
      width: 1920,
      height: 1080,
      format: "png",
    });

    expect(hostInvoke).toHaveBeenCalledWith("platform.renderHtmlToImage", {
      htmlDir: "/workspace/export",
      entryFile: "index.html",
      outputFile: "/workspace/out/result.png",
      options: {
        format: "png",
        width: 1280,
        height: 720,
        scaleFactor: 2,
        background: "theme",
      },
    });

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
      stage: "completed",
      percent: 100,
      message: "HTML to image conversion completed",
    });
  });

  it("normalizes transparent JPEG background to white and returns a warning", async () => {
    const hostInvoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
      switch (action) {
        case "file.stat":
          if (payload?.path === "/workspace/export") {
            return { meta: { isDirectory: true } };
          }
          if (payload?.path === "/workspace/export/conversion-manifest.json") {
            return { meta: { isFile: true } };
          }
          if (payload?.path === "/workspace/export/index.html") {
            return { meta: { isFile: true } };
          }
          return { meta: undefined };
        case "file.read":
          return {
            content: JSON.stringify({
              type: "card-to-html",
              output: {
                entryFile: "index.html",
              },
            }),
          };
        case "platform.renderHtmlToImage":
          return {
            outputFile: "/workspace/out/result.jpg",
            width: 800,
            height: 600,
            format: "jpeg",
          };
        default:
          throw new Error(`Unexpected action: ${action}`);
      }
    });

    const output = await moduleDefinition.providers[0]?.methods.convert(
      {
        logger: createLogger(),
        host: { invoke: hostInvoke },
      },
      {
        htmlDir: "/workspace/export",
        outputFile: "/workspace/out/result.jpg",
        options: {
          format: "jpeg",
          background: "transparent",
        },
      },
    );

    expect(hostInvoke).toHaveBeenCalledWith("platform.renderHtmlToImage", {
      htmlDir: "/workspace/export",
      entryFile: "index.html",
      outputFile: "/workspace/out/result.jpg",
      options: {
        format: "jpeg",
        background: "white",
      },
    });

    expect(output).toEqual({
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
    });
  });

  it("fails when conversion-manifest.json is missing", async () => {
    const ctx: HtmlToImageContext = {
      logger: createLogger(),
      host: {
        invoke: vi.fn(async (action: string, payload?: Record<string, unknown>) => {
          if (action === "file.stat" && payload?.path === "/workspace/export") {
            return { meta: { isDirectory: true } };
          }
          if (action === "file.stat" && payload?.path === "/workspace/export/conversion-manifest.json") {
            return { meta: undefined };
          }
          throw new Error(`Unexpected action: ${action}`);
        }),
      },
    };

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
    const ctx: HtmlToImageContext = {
      logger: createLogger(),
      host: {
        invoke: vi.fn(async (action: string, payload?: Record<string, unknown>) => {
          switch (action) {
            case "file.stat":
              if (payload?.path === "/workspace/export") {
                return { meta: { isDirectory: true } };
              }
              if (payload?.path === "/workspace/export/conversion-manifest.json") {
                return { meta: { isFile: true } };
              }
              if (payload?.path === "/workspace/export/index.html") {
                return { meta: { isFile: true } };
              }
              return { meta: undefined };
            case "file.read":
              return {
                content: JSON.stringify({
                  type: "card-to-html",
                  output: {
                    entryFile: "index.html",
                  },
                }),
              };
            case "platform.renderHtmlToImage": {
              const error = new Error("Current Electron runtime does not expose WEBP image export") as Error & {
                code: string;
              };
              error.code = "PLATFORM_UNSUPPORTED";
              throw error;
            }
            default:
              throw new Error(`Unexpected action: ${action}`);
          }
        }),
      },
    };

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
});

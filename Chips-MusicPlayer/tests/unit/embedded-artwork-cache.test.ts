import { describe, expect, it, vi } from "vitest";
import { persistEmbeddedArtworkPngToWorkspace } from "../../src/utils/embedded-artwork-cache";

describe("embedded artwork workspace cache", () => {
  it("persists TIFF artwork through the Host conversion route and returns a resolved PNG uri", async () => {
    const writes: Array<{ path: string; content: string | Uint8Array }> = [];
    const deletes: string[] = [];
    const mkdir = vi.fn(async () => {});
    const stat = vi.fn(async () => {
      throw new Error("missing");
    });
    const convertTiffToPng = vi.fn(
      async (_request: {
        resourceId: string;
        outputFile: string;
        overwrite?: boolean;
      }) => ({}),
    );
    const resolve = vi.fn(async (resourceId: string) => ({ uri: `file://${resourceId}` }));

    const result = await persistEmbeddedArtworkPngToWorkspace({
      workspacePath: "/tmp/chips-host",
      sourceId: "/tmp/demo.mp3",
      fileName: "测试音频.mp3",
      artwork: {
        mimeType: "image/tiff",
        bytes: Uint8Array.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08]),
      },
      client: {
        file: {
          stat,
          mkdir,
          write: vi.fn(async (path: string, content: string | Uint8Array) => {
            writes.push({ path, content });
          }),
          delete: vi.fn(async (path: string) => {
            deletes.push(path);
          }),
        },
        resource: {
          convertTiffToPng,
          resolve,
        },
      },
    });

    expect(mkdir).toHaveBeenCalledWith("/tmp/chips-host/.music-player-artwork-cache");
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path.endsWith(".tiff")).toBe(true);
    expect(convertTiffToPng).toHaveBeenCalledTimes(1);
    const conversionInput = convertTiffToPng.mock.calls[0]?.[0];
    expect(conversionInput).toBeDefined();
    const normalizedConversionInput = conversionInput as {
      resourceId: string;
      outputFile: string;
      overwrite?: boolean;
    };
    expect(normalizedConversionInput.resourceId.endsWith(".tiff")).toBe(true);
    expect(normalizedConversionInput.outputFile.endsWith(".png")).toBe(true);
    expect(normalizedConversionInput.overwrite).toBe(true);
    expect(deletes).toEqual([normalizedConversionInput.resourceId]);
    expect(resolve).toHaveBeenCalledWith(normalizedConversionInput.outputFile);
    expect(result).toEqual({
      filePath: normalizedConversionInput.outputFile,
      uri: `file://${normalizedConversionInput.outputFile}`,
    });
  });

  it("writes PNG artwork directly into the Host workspace cache directory", async () => {
    const writes: Array<{ path: string; content: string | Uint8Array }> = [];
    const resolve = vi.fn(async (resourceId: string) => ({ uri: `file://${resourceId}` }));

    const result = await persistEmbeddedArtworkPngToWorkspace({
      workspacePath: "/tmp/chips-host",
      sourceId: "/tmp/demo.mp3",
      fileName: "cover.png",
      artwork: {
        mimeType: "image/png",
        bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
      },
      client: {
        file: {
          stat: vi.fn(async () => ({ isDirectory: true })),
          mkdir: vi.fn(async () => {}),
          write: vi.fn(async (path: string, content: string | Uint8Array) => {
            writes.push({ path, content });
          }),
          delete: vi.fn(async () => {}),
        },
        resource: {
          convertTiffToPng: vi.fn(async () => ({})),
          resolve,
        },
      },
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]?.path.endsWith(".png")).toBe(true);
    expect(Array.from(writes[0]?.content as Uint8Array)).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(result?.uri).toBe(`file://${writes[0]?.path}`);
  });

  it("returns null when no Host workspace path is available", async () => {
    const result = await persistEmbeddedArtworkPngToWorkspace({
      workspacePath: "   ",
      sourceId: "/tmp/demo.mp3",
      fileName: "demo.mp3",
      artwork: {
        mimeType: "image/png",
        bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
      },
      client: {
        file: {
          stat: vi.fn(async () => ({ isDirectory: true })),
          mkdir: vi.fn(async () => {}),
          write: vi.fn(async () => {}),
          delete: vi.fn(async () => {}),
        },
        resource: {
          convertTiffToPng: vi.fn(async () => ({})),
          resolve: vi.fn(async () => ({ uri: "" })),
        },
      },
    });

    expect(result).toBeNull();
  });
});

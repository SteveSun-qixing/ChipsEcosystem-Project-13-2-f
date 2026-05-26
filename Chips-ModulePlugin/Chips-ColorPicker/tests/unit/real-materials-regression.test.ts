import fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { ColorPickerContext } from "../../src/types";
import { assertExistingMaterialPath, statHostPath } from "../../../tests/real-materials";

const createContext = (): ColorPickerContext & { hostInvoke: ReturnType<typeof vi.fn> } => {
  const hostInvoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
    const targetPath = String(payload?.path ?? "");
    if (action === "file.stat") {
      return { meta: await statHostPath(targetPath) };
    }

    if (action === "file.read") {
      return { content: await fs.readFile(targetPath) };
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
      invoke: hostInvoke as ColorPickerContext["host"]["invoke"],
    },
    job: {
      id: "job-color-picker-real-material",
      signal: new AbortController().signal,
      reportProgress: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi.fn().mockReturnValue(false),
    },
    hostInvoke,
  };
};

describe("ColorPicker real finished materials", () => {
  it("extracts stable colors from the real 图片.jpg material through file.read", async () => {
    const imagePath = await assertExistingMaterialPath("图片.jpg");
    const ctx = createContext();

    const output = await moduleDefinition.providers[0]!.methods.pick(ctx, {
      imagePath,
      options: {
        sampleSize: 96,
      },
    });

    expect(output.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(output.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(output.backgroundColor).not.toBe(output.accentColor);
    expect(output.palette.length).toBeGreaterThanOrEqual(2);
    expect(output.palette.length).toBeLessThanOrEqual(8);
    expect(output.palette[0]).toMatchObject({
      role: "background",
      color: output.backgroundColor,
    });
    expect(output.palette[1]).toMatchObject({
      role: "accent",
      color: output.accentColor,
    });
    expect(output.metadata).toMatchObject({
      algorithm: "oklab-kmeans-v1",
      source: {
        imagePath,
      },
      image: {
        format: "jpeg",
        animated: false,
        pageCount: 1,
      },
      sample: {
        sampleSize: 96,
      },
    });
    expect(output.metadata.source?.sizeBytes).toBeGreaterThan(100_000);
    expect(output.metadata.image.width).toBeGreaterThan(0);
    expect(output.metadata.image.height).toBeGreaterThan(0);
    expect(output.metadata.sample.visiblePixelRatio).toBeGreaterThan(0.5);
    expect(output.metadata.sample.transparentPixelRatio).toBeLessThan(0.5);
    expect(ctx.hostInvoke).toHaveBeenCalledWith("file.stat", { path: imagePath });
    expect(ctx.hostInvoke).toHaveBeenCalledWith("file.read", {
      path: imagePath,
      options: {
        encoding: "binary",
      },
    });
  });
});

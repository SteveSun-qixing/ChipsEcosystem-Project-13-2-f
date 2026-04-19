import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { ColorPickerContext } from "../../src/types";

const hexToRgb = (input: string): { r: number; g: number; b: number } => {
  const normalized = input.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const relativeLuminance = (input: { r: number; g: number; b: number }): number => {
  return (0.2126 * input.r + 0.7152 * input.g + 0.0722 * input.b) / 255;
};

let statIdentitySeed = 1;

const createPosterPng = async (): Promise<Buffer> => {
  const width = 8;
  const height = 8;
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;

      if (x < 6) {
        pixels[offset] = 20;
        pixels[offset + 1] = 36;
        pixels[offset + 2] = 92;
      } else {
        pixels[offset] = 246;
        pixels[offset + 1] = 112;
        pixels[offset + 2] = 48;
      }

      pixels[offset + 3] = 255;
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
};

const createContext = (imageBytes: Uint8Array): ColorPickerContext & { hostInvoke: ReturnType<typeof vi.fn> } => {
  const reportProgress = vi.fn().mockResolvedValue(undefined);
  const statIdentity = statIdentitySeed;
  statIdentitySeed += 1;
  const hostInvoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
    if (action === "file.stat") {
      if (payload?.path === "/workspace/poster.png") {
        return { meta: { isFile: true, size: imageBytes.byteLength, mtimeMs: statIdentity } };
      }
      return { meta: undefined };
    }

    if (action === "file.read") {
      if (payload?.path === "/workspace/poster.png") {
        return { content: imageBytes };
      }
      throw new Error(`Unexpected read path: ${String(payload?.path)}`);
    }

    throw new Error(`Unexpected action: ${action}`);
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
      id: "job-color-picker",
      signal: new AbortController().signal,
      reportProgress,
      isCancelled: vi.fn().mockReturnValue(false),
    },
    hostInvoke,
  };
};

describe("ColorPicker module definition", () => {
  it("exposes image.color.pick and returns a stable background range plus a vivid accent range", async () => {
    const imageBytes = new Uint8Array(await createPosterPng());
    const ctx = createContext(imageBytes);
    const provider = moduleDefinition.providers[0];

    expect(provider?.capability).toBe("image.color.pick");
    expect(provider).toBeDefined();

    const output = await provider!.methods.pick(ctx, {
      imagePath: "/workspace/poster.png",
      options: {
        sampleSize: 96,
      },
    });

    expect(output.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(output.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(output.backgroundColor).not.toBe(output.accentColor);

    const background = hexToRgb(output.backgroundColor);
    const accent = hexToRgb(output.accentColor);

    expect(background.b).toBeGreaterThan(background.r);
    expect(background.b).toBeGreaterThan(background.g);
    expect(accent.r).toBeGreaterThan(accent.g);
    expect(accent.r).toBeGreaterThan(accent.b);
    expect(relativeLuminance(accent)).toBeGreaterThan(relativeLuminance(background));
    expect(relativeLuminance(background)).toBeGreaterThan(0.22);
    expect(relativeLuminance(accent)).toBeGreaterThan(0.45);

    expect(ctx.job?.reportProgress).toHaveBeenNthCalledWith(1, {
      stage: "prepare",
      percent: 5,
      message: "Validating image input",
    });
    expect(ctx.job?.reportProgress).toHaveBeenNthCalledWith(2, {
      stage: "sample-image",
      percent: 35,
      message: "Rendering image sample",
    });
    expect(ctx.job?.reportProgress).toHaveBeenNthCalledWith(3, {
      stage: "analyze",
      percent: 80,
      message: "Analyzing representative colors",
    });
    expect(ctx.job?.reportProgress).toHaveBeenNthCalledWith(4, {
      stage: "completed",
      percent: 100,
      message: "Image color picking completed",
    });
  });

  it("reuses cached results for the same file identity instead of reading the file again", async () => {
    const imageBytes = new Uint8Array(await createPosterPng());
    const ctx = createContext(imageBytes);
    const provider = moduleDefinition.providers[0];

    const first = await provider!.methods.pick(ctx, {
      imagePath: "/workspace/poster.png",
    });
    const second = await provider!.methods.pick(ctx, {
      imagePath: "/workspace/poster.png",
    });

    expect(second).toEqual(first);
    expect(ctx.hostInvoke.mock.calls.filter(([action]) => action === "file.read")).toHaveLength(1);
  });

  it("fails when the image file does not exist", async () => {
    const ctx: ColorPickerContext = {
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      host: {
        invoke: (vi.fn(async (action: string) => {
          if (action === "file.stat") {
            return { meta: undefined };
          }
          throw new Error(`Unexpected action: ${action}`);
        }) as unknown) as ColorPickerContext["host"]["invoke"],
      },
    };

    await expect(
      moduleDefinition.providers[0]!.methods.pick(ctx, {
        imagePath: "/workspace/missing.png",
      }),
    ).rejects.toMatchObject({
      code: "COLOR_PICKER_INPUT_NOT_FOUND",
    });
  });
});

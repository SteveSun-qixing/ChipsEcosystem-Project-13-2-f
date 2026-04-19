import { describe, expect, it } from "vitest";
import { analyzeColorSample } from "../../src/color-analysis";
import type { DecodedPng } from "../../src/types";

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

const createSample = (
  width: number,
  height: number,
  fill: (x: number, y: number) => { r: number; g: number; b: number; a?: number },
): DecodedPng => {
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const color = fill(x, y);
      pixels[offset] = color.r;
      pixels[offset + 1] = color.g;
      pixels[offset + 2] = color.b;
      pixels[offset + 3] = color.a ?? 255;
    }
  }

  return { width, height, pixels };
};

describe("analyzeColorSample", () => {
  it("finds a blue background and warm accent in a poster-like sample", () => {
    const sample = createSample(10, 10, (x, y) => {
      if (x < 7) {
        return { r: 24, g: 34, b: 94 };
      }

      if (y < 7) {
        return { r: 242, g: 112, b: 56 };
      }

      return { r: 210, g: 84, b: 150 };
    });

    const result = analyzeColorSample(sample);
    const background = hexToRgb(result.backgroundColor);
    const accent = hexToRgb(result.accentColor);

    expect(background.b).toBeGreaterThan(background.r);
    expect(background.b).toBeGreaterThan(background.g);
    expect(accent.r).toBeGreaterThan(accent.b);
    expect(relativeLuminance(accent)).toBeGreaterThan(relativeLuminance(background));
    expect(relativeLuminance(background)).toBeGreaterThan(0.22);
    expect(relativeLuminance(accent)).toBeGreaterThan(0.45);
  });

  it("returns two separated neutral colors for grayscale imagery", () => {
    const sample = createSample(6, 6, (x) => {
      if (x < 3) {
        return { r: 70, g: 70, b: 70 };
      }
      return { r: 205, g: 205, b: 205 };
    });

    const result = analyzeColorSample(sample);
    const background = hexToRgb(result.backgroundColor);
    const accent = hexToRgb(result.accentColor);

    expect(result.backgroundColor).not.toBe(result.accentColor);
    expect(relativeLuminance(background)).toBeLessThan(relativeLuminance(accent));
    expect(relativeLuminance(background)).toBeGreaterThan(0.22);
    expect(relativeLuminance(accent)).toBeGreaterThan(0.45);
  });
});

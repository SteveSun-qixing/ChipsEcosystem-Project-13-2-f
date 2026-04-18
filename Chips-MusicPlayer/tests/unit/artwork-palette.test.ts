import { describe, expect, it } from "vitest";
import { relativeLuminance } from "../../src/utils/color";
import { extractArtworkPalette } from "../../src/utils/artwork-palette";

function createPixelBuffer(rows: number[][][]): { width: number; height: number; data: Uint8ClampedArray } {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const data = new Uint8ClampedArray(width * height * 4);

  rows.forEach((row, y) => {
    row.forEach((pixel, x) => {
      const index = (y * width + x) * 4;
      data[index] = pixel[0] ?? 0;
      data[index + 1] = pixel[1] ?? 0;
      data[index + 2] = pixel[2] ?? 0;
      data[index + 3] = 255;
    });
  });

  return {
    width,
    height,
    data,
  };
}

describe("artwork palette extraction", () => {
  it("removes extreme black and white bias before selecting the accent color", () => {
    const black = [8, 8, 10];
    const white = [248, 248, 248];
    const green = [62, 216, 112];
    const pink = [230, 158, 196];
    const buffer = createPixelBuffer([
      [black, black, black, green, green, green, white, white],
      [black, black, black, green, green, green, white, white],
      [black, black, black, green, green, green, white, white],
      [black, black, black, green, green, green, pink, pink],
      [black, black, black, green, green, green, pink, pink],
      [black, black, black, green, green, green, pink, pink],
      [black, black, black, black, green, green, pink, pink],
      [black, black, black, black, green, green, pink, pink],
    ]);

    const palette = extractArtworkPalette(buffer, 4);

    expect(palette).toHaveLength(4);
    expect(palette[0]?.[1] ?? 0).toBeGreaterThan(palette[0]?.[0] ?? 0);
    expect(palette[0]?.[1] ?? 0).toBeGreaterThan(palette[0]?.[2] ?? 0);
    expect(relativeLuminance(palette[0]!)).toBeGreaterThan(0.2);
    expect(relativeLuminance(palette[0]!)).toBeLessThan(0.9);
  });

  it("returns smooth supporting colors even when the cover is mostly flat", () => {
    const teal = [78, 176, 168];
    const blue = [64, 118, 204];
    const rows = Array.from({ length: 6 }, (_, rowIndex) =>
      Array.from({ length: 6 }, (_, columnIndex) => (rowIndex + columnIndex > 5 ? blue : teal)),
    );
    const palette = extractArtworkPalette(createPixelBuffer(rows), 4);

    expect(palette).toHaveLength(4);
    expect(palette.some((color) => color[2] > color[1])).toBe(true);
    expect(palette.some((color) => color[1] >= color[2])).toBe(true);
  });
});

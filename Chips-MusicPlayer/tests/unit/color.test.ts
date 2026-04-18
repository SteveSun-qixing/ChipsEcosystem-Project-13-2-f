import { describe, expect, it } from "vitest";
import {
  hslToRgb,
  relativeLuminance,
  resolveAccentSourceColor,
  resolveBrightestColor,
  resolveControlAccentPalette,
  rgbToHsl,
  rgbToHsv,
} from "../../src/utils/color";

describe("color utilities", () => {
  it("finds the brightest color in a palette", () => {
    expect(resolveBrightestColor([[20, 30, 40], [220, 180, 40], [140, 160, 180]])).toEqual([220, 180, 40]);
  });

  it("prefers a vivid bright accent color over washed-out highlights", () => {
    expect(
      resolveAccentSourceColor([
        [16, 16, 18],
        [84, 214, 126],
        [250, 246, 246],
        [234, 182, 214],
      ]),
    ).toEqual([84, 214, 126]);
  });

  it("round-trips rgb and hsl reasonably", () => {
    const source = [120, 200, 255] as const;
    const hsl = rgbToHsl(source);
    const roundTripped = hslToRgb(hsl[0], hsl[1], hsl[2]);
    expect(roundTripped[0]).toBeGreaterThanOrEqual(118);
    expect(roundTripped[0]).toBeLessThanOrEqual(122);
    expect(roundTripped[1]).toBeGreaterThanOrEqual(198);
    expect(roundTripped[1]).toBeLessThanOrEqual(202);
    expect(roundTripped[2]).toBeGreaterThanOrEqual(253);
    expect(roundTripped[2]).toBeLessThanOrEqual(255);
  });

  it("keeps hsv conversion stable enough for vivid colors", () => {
    const [hue, saturation, value] = rgbToHsv([84, 214, 126]);
    expect(hue).toBeGreaterThan(0.35);
    expect(hue).toBeLessThan(0.4);
    expect(saturation).toBeGreaterThan(0.55);
    expect(value).toBeGreaterThan(0.8);
  });

  it("builds a brighter accent palette from the brightest artwork color", () => {
    const palette = resolveControlAccentPalette([
      [50, 60, 70],
      [164, 226, 130],
      [20, 30, 40],
    ]);

    const [, strongSaturation] = rgbToHsl(palette.strong);
    expect(relativeLuminance(palette.strong)).toBeGreaterThan(relativeLuminance([164, 226, 130]) * 0.82);
    expect(relativeLuminance(palette.glow)).toBeGreaterThan(relativeLuminance(palette.base));
    expect(strongSaturation).toBeGreaterThan(0.45);
    expect(palette.strong[1]).toBeGreaterThan(palette.strong[0]);
    expect(palette.strong[1]).toBeGreaterThan(palette.strong[2]);
  });
});

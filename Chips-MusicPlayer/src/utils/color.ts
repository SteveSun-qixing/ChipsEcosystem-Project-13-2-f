export type RGBColor = readonly [number, number, number];

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampChannel(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

export function relativeLuminance(color: RGBColor): number {
  const [red, green, blue] = color.map((channel) => channel / 255) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function rgbToHsl(color: RGBColor): readonly [number, number, number] {
  const red = color[0] / 255;
  const green = color[1] / 255;
  const blue = color[2] / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return [0, 0, lightness];
  }

  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  return [hue / 6, saturation, lightness];
}

export function rgbToHsv(color: RGBColor): readonly [number, number, number] {
  const red = color[0] / 255;
  const green = color[1] / 255;
  const blue = color[2] / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) {
    return [0, 0, max];
  }

  let hue = 0;

  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  return [hue / 6, max === 0 ? 0 : delta / max, max];
}

export function hslToRgb(hue: number, saturation: number, lightness: number): RGBColor {
  const normalizedHue = ((hue % 1) + 1) % 1;
  const normalizedSaturation = clampUnit(saturation);
  const normalizedLightness = clampUnit(lightness);

  if (normalizedSaturation === 0) {
    const channel = clampChannel(normalizedLightness * 255);
    return [channel, channel, channel];
  }

  const hueToRgb = (p: number, q: number, t: number): number => {
    let next = t;
    if (next < 0) {
      next += 1;
    }
    if (next > 1) {
      next -= 1;
    }
    if (next < 1 / 6) {
      return p + (q - p) * 6 * next;
    }
    if (next < 1 / 2) {
      return q;
    }
    if (next < 2 / 3) {
      return p + (q - p) * (2 / 3 - next) * 6;
    }
    return p;
  };

  const q =
    normalizedLightness < 0.5
      ? normalizedLightness * (1 + normalizedSaturation)
      : normalizedLightness + normalizedSaturation - normalizedLightness * normalizedSaturation;
  const p = 2 * normalizedLightness - q;

  return [
    clampChannel(hueToRgb(p, q, normalizedHue + 1 / 3) * 255),
    clampChannel(hueToRgb(p, q, normalizedHue) * 255),
    clampChannel(hueToRgb(p, q, normalizedHue - 1 / 3) * 255),
  ];
}

export function resolveBrightestColor(colors: readonly RGBColor[]): RGBColor {
  if (colors.length === 0) {
    return [255, 255, 255];
  }

  return colors.reduce((brightest, current) =>
    relativeLuminance(current) > relativeLuminance(brightest) ? current : brightest,
  );
}

export function resolveAccentSourceColor(colors: readonly RGBColor[]): RGBColor {
  if (colors.length === 0) {
    return [255, 255, 255];
  }

  const resolveScore = (color: RGBColor): number => {
    const luminance = relativeLuminance(color);
    const [, saturation, lightness] = rgbToHsl(color);
    const [, valueSaturation, value] = rgbToHsv(color);
    const lightnessBalance = 1 - Math.min(1, Math.abs(lightness - 0.56) / 0.56);
    const luminanceBalance = 1 - Math.min(1, Math.abs(luminance - 0.48) / 0.48);
    const chromaStrength = saturation * valueSaturation;
    const vividBonus = saturation >= 0.42 && value >= 0.34 ? 0.08 : 0;
    const neutralPenalty = saturation < 0.18 || valueSaturation < 0.18 ? 0.24 : 0;
    const extremePenalty = luminance > 0.93 || luminance < 0.08 ? 0.18 : 0;

    return (
      saturation * 0.34
      + valueSaturation * 0.24
      + chromaStrength * 0.18
      + lightnessBalance * 0.12
      + luminanceBalance * 0.12
      + vividBonus
      - neutralPenalty
      - extremePenalty
    );
  };

  return colors.reduce((best, current) => (resolveScore(current) > resolveScore(best) ? current : best));
}

export interface ControlAccentPalette {
  base: RGBColor;
  strong: RGBColor;
  rim: RGBColor;
  glow: RGBColor;
  foreground: RGBColor;
}

export function resolveControlAccentPalette(colors: readonly RGBColor[]): ControlAccentPalette {
  const accentSource = resolveAccentSourceColor(colors);
  const [hue, saturation, lightness] = rgbToHsl(accentSource);

  const base = hslToRgb(
    hue,
    clampUnit(Math.max(0.56, saturation * 1.06 + 0.08)),
    clampUnit(Math.max(0.46, Math.min(0.64, lightness * 0.82 + 0.12))),
  );
  const strong = hslToRgb(
    hue,
    clampUnit(Math.max(0.72, saturation * 1.16 + 0.12)),
    clampUnit(Math.max(0.54, Math.min(0.74, lightness * 0.72 + 0.18))),
  );
  const rim = hslToRgb(
    hue,
    clampUnit(Math.max(0.82, saturation * 1.22 + 0.14)),
    clampUnit(Math.max(0.62, Math.min(0.82, lightness * 0.64 + 0.26))),
  );
  const glow = hslToRgb(
    hue,
    clampUnit(Math.max(0.88, saturation * 1.3 + 0.18)),
    clampUnit(Math.max(0.56, Math.min(0.76, lightness * 0.7 + 0.2))),
  );
  const foreground = rim;

  return {
    base,
    strong,
    rim,
    glow,
    foreground,
  };
}

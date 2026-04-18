import { hslToRgb, relativeLuminance, rgbToHsl, rgbToHsv, type RGBColor } from "./color";

export interface PixelBufferLike {
  readonly width: number;
  readonly height: number;
  readonly data: ArrayLike<number>;
}

interface WeightedColor {
  color: RGBColor;
  weight: number;
}

interface PaletteCell extends WeightedColor {
  prominence: number;
}

const MAX_COLOR_DISTANCE = Math.sqrt(255 ** 2 * 3);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function colorDistance(left: RGBColor, right: RGBColor): number {
  return Math.sqrt(
    (left[0] - right[0]) ** 2 +
    (left[1] - right[1]) ** 2 +
    (left[2] - right[2]) ** 2,
  );
}

function averageWeightedColors(colors: readonly WeightedColor[], fallback: RGBColor): RGBColor {
  if (colors.length === 0) {
    return fallback;
  }

  let totalWeight = 0;
  let totalRed = 0;
  let totalGreen = 0;
  let totalBlue = 0;

  for (const entry of colors) {
    totalWeight += entry.weight;
    totalRed += entry.color[0] * entry.weight;
    totalGreen += entry.color[1] * entry.weight;
    totalBlue += entry.color[2] * entry.weight;
  }

  if (totalWeight <= 0) {
    return fallback;
  }

  return [
    Math.round(totalRed / totalWeight),
    Math.round(totalGreen / totalWeight),
    Math.round(totalBlue / totalWeight),
  ];
}

function quantile(values: readonly number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = clamp(Math.round((sorted.length - 1) * ratio), 0, sorted.length - 1);
  return sorted[index] ?? 0;
}

function createDownsampledGrid(buffer: PixelBufferLike, targetSize: number): { width: number; height: number; cells: WeightedColor[] } {
  const scale = Math.min(1, targetSize / Math.max(buffer.width, buffer.height));
  const gridWidth = Math.max(1, Math.round(buffer.width * scale));
  const gridHeight = Math.max(1, Math.round(buffer.height * scale));
  const blockWidth = buffer.width / gridWidth;
  const blockHeight = buffer.height / gridHeight;
  const cells: WeightedColor[] = [];

  for (let cellY = 0; cellY < gridHeight; cellY += 1) {
    for (let cellX = 0; cellX < gridWidth; cellX += 1) {
      const xStart = Math.floor(cellX * blockWidth);
      const xEnd = Math.min(buffer.width, Math.ceil((cellX + 1) * blockWidth));
      const yStart = Math.floor(cellY * blockHeight);
      const yEnd = Math.min(buffer.height, Math.ceil((cellY + 1) * blockHeight));
      let totalRed = 0;
      let totalGreen = 0;
      let totalBlue = 0;
      let totalWeight = 0;

      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          const pixelIndex = (y * buffer.width + x) * 4;
          const alpha = Number(buffer.data[pixelIndex + 3] ?? 0);
          if (alpha < 200) {
            continue;
          }

          const weight = alpha / 255;
          totalRed += Number(buffer.data[pixelIndex] ?? 0) * weight;
          totalGreen += Number(buffer.data[pixelIndex + 1] ?? 0) * weight;
          totalBlue += Number(buffer.data[pixelIndex + 2] ?? 0) * weight;
          totalWeight += weight;
        }
      }

      cells.push({
        color: totalWeight > 0
          ? [
              Math.round(totalRed / totalWeight),
              Math.round(totalGreen / totalWeight),
              Math.round(totalBlue / totalWeight),
            ]
          : [0, 0, 0],
        weight: totalWeight,
      });
    }
  }

  return {
    width: gridWidth,
    height: gridHeight,
    cells,
  };
}

function buildGaussianKernel(radius: number, sigma: number): number[] {
  const kernel: number[] = [];
  let total = 0;

  for (let index = -radius; index <= radius; index += 1) {
    const value = Math.exp(-(index ** 2) / (2 * sigma ** 2));
    kernel.push(value);
    total += value;
  }

  return kernel.map((value) => value / total);
}

function applyGaussianBlurPass(
  gridWidth: number,
  gridHeight: number,
  cells: readonly WeightedColor[],
  kernel: readonly number[],
  axis: "x" | "y",
): WeightedColor[] {
  const blurred: WeightedColor[] = [];
  const radius = Math.floor(kernel.length / 2);

  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      let totalRed = 0;
      let totalGreen = 0;
      let totalBlue = 0;
      let totalWeight = 0;

      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleX = axis === "x" ? clamp(x + offset, 0, gridWidth - 1) : x;
        const sampleY = axis === "y" ? clamp(y + offset, 0, gridHeight - 1) : y;
        const sample = cells[sampleY * gridWidth + sampleX];
        if (!sample || sample.weight <= 0) {
          continue;
        }

        const kernelWeight = kernel[offset + radius] ?? 0;
        const weight = sample.weight * kernelWeight;
        totalRed += sample.color[0] * weight;
        totalGreen += sample.color[1] * weight;
        totalBlue += sample.color[2] * weight;
        totalWeight += weight;
      }

      blurred.push({
        color: totalWeight > 0
          ? [
              Math.round(totalRed / totalWeight),
              Math.round(totalGreen / totalWeight),
              Math.round(totalBlue / totalWeight),
            ]
          : [0, 0, 0],
        weight: totalWeight,
      });
    }
  }

  return blurred;
}

function applyGaussianBlurGrid(
  gridWidth: number,
  gridHeight: number,
  cells: readonly WeightedColor[],
  radius: number,
  sigma: number,
): WeightedColor[] {
  const kernel = buildGaussianKernel(radius, sigma);
  const horizontal = applyGaussianBlurPass(gridWidth, gridHeight, cells, kernel, "x");
  return applyGaussianBlurPass(gridWidth, gridHeight, horizontal, kernel, "y");
}

function resolveProminence(color: RGBColor, baseline: RGBColor): number {
  const luminance = relativeLuminance(color);
  const [, saturation, lightness] = rgbToHsl(color);
  const [, valueSaturation, value] = rgbToHsv(color);
  const balance = 1 - Math.min(1, Math.abs(luminance - 0.52) / 0.52);
  const contrast = colorDistance(color, baseline) / MAX_COLOR_DISTANCE;
  const chroma = saturation * valueSaturation;
  const vividBonus = saturation >= 0.38 && value >= 0.32 ? 0.08 : 0;
  const neutralPenalty = saturation < 0.16 || valueSaturation < 0.16 ? 0.24 : 0;
  const extremePenalty = luminance < 0.06 || luminance > 0.94 ? 0.24 : 0;

  return (
    saturation * 0.28 +
    valueSaturation * 0.22 +
    value * 0.16 +
    chroma * 0.14 +
    balance * 0.1 +
    contrast * 0.1 +
    vividBonus -
    neutralPenalty -
    extremePenalty
  );
}

function createPaletteVariants(seed: RGBColor): RGBColor[] {
  const [hue, saturation, lightness] = rgbToHsl(seed);

  return [
    seed,
    hslToRgb(hue, clamp(saturation * 0.78 + 0.04, 0, 1), clamp(lightness * 0.84 + 0.04, 0, 1)),
    hslToRgb(hue, clamp(saturation * 0.62 + 0.02, 0, 1), clamp(lightness * 1.08 + 0.06, 0, 1)),
    hslToRgb(hue, clamp(saturation * 0.9 + 0.03, 0, 1), clamp(lightness * 0.68 + 0.14, 0, 1)),
  ];
}

export function extractArtworkPalette(buffer: PixelBufferLike, colorCount: number = 4): RGBColor[] {
  if (buffer.width <= 0 || buffer.height <= 0) {
    return [];
  }

  const downsampled = createDownsampledGrid(buffer, 18);
  const blurredCells = applyGaussianBlurGrid(downsampled.width, downsampled.height, downsampled.cells, 2, 1.15)
    .filter((cell) => cell.weight > 0);

  if (blurredCells.length === 0) {
    return [];
  }

  const luminances = blurredCells.map((cell) => relativeLuminance(cell.color));
  const lowCutoff = Math.max(0.05, quantile(luminances, 0.08));
  const highCutoff = Math.min(0.92, quantile(luminances, 0.92));
  const trimmedCells = blurredCells.filter((cell) => {
    const luminance = relativeLuminance(cell.color);
    return luminance >= lowCutoff && luminance <= highCutoff;
  });
  const workingCells = trimmedCells.length >= 4 ? trimmedCells : blurredCells;
  const baseline = averageWeightedColors(workingCells, [128, 128, 128]);
  const bucketMap = new Map<string, { totalRed: number; totalGreen: number; totalBlue: number; totalWeight: number; totalScore: number }>();
  const rankedCells: PaletteCell[] = [];

  for (const cell of workingCells) {
    const prominence = resolveProminence(cell.color, baseline);
    rankedCells.push({
      color: cell.color,
      weight: cell.weight,
      prominence,
    });

    if (prominence <= 0) {
      continue;
    }

    const [hue] = rgbToHsl(cell.color);
    const [, , value] = rgbToHsv(cell.color);
    const bucketKey = `${Math.round(hue * 18)}:${Math.round(value * 6)}`;
    const existing = bucketMap.get(bucketKey);
    const weightedScore = prominence * cell.weight;

    if (!existing) {
      bucketMap.set(bucketKey, {
        totalRed: cell.color[0] * weightedScore,
        totalGreen: cell.color[1] * weightedScore,
        totalBlue: cell.color[2] * weightedScore,
        totalWeight: weightedScore,
        totalScore: weightedScore,
      });
      continue;
    }

    existing.totalRed += cell.color[0] * weightedScore;
    existing.totalGreen += cell.color[1] * weightedScore;
    existing.totalBlue += cell.color[2] * weightedScore;
    existing.totalWeight += weightedScore;
    existing.totalScore += weightedScore;
  }

  const bucketColors = [...bucketMap.values()]
    .sort((left, right) => right.totalScore - left.totalScore)
    .map((entry) => [
      Math.round(entry.totalRed / entry.totalWeight),
      Math.round(entry.totalGreen / entry.totalWeight),
      Math.round(entry.totalBlue / entry.totalWeight),
    ] as const satisfies RGBColor);

  const palette: RGBColor[] = [];

  const pushUniqueColor = (color: RGBColor): void => {
    if (palette.length >= colorCount) {
      return;
    }

    const isUnique = palette.every((existing) => colorDistance(existing, color) >= 42);
    if (isUnique) {
      palette.push(color);
    }
  };

  for (const color of bucketColors) {
    pushUniqueColor(color);
  }

  for (const cell of [...rankedCells].sort((left, right) => right.prominence - left.prominence)) {
    pushUniqueColor(cell.color);
  }

  if (palette.length < colorCount) {
    for (const variant of createPaletteVariants(baseline)) {
      pushUniqueColor(variant);
    }
  }

  while (palette.length > 0 && palette.length < colorCount) {
    palette.push(palette[palette.length % palette.length] ?? baseline);
  }

  return palette.slice(0, colorCount);
}

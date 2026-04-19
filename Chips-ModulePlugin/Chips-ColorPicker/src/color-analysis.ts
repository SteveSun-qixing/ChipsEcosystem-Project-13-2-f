import { createColorPickerError } from "./errors";
import type { ColorPickResult, DecodedPng } from "./types";

interface QuantizedPoint {
  r: number;
  g: number;
  b: number;
  weight: number;
  centerWeight: number;
  edgeWeight: number;
  labL: number;
  labA: number;
  labB: number;
  lightness: number;
  chroma: number;
  hue?: number;
}

interface MutableQuantizedPoint {
  rSum: number;
  gSum: number;
  bSum: number;
  weight: number;
  centerWeight: number;
  edgeWeight: number;
}

interface Centroid {
  l: number;
  a: number;
  b: number;
}

interface Cluster {
  r: number;
  g: number;
  b: number;
  weight: number;
  centerWeight: number;
  edgeWeight: number;
  labL: number;
  labA: number;
  labB: number;
  lightness: number;
  chroma: number;
  hue?: number;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface OklabColor {
  l: number;
  a: number;
  b: number;
}

interface OklchColor {
  l: number;
  c: number;
  h?: number;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const roundChannel = (value: number): number => {
  return Math.round(clamp(value, 0, 255));
};

const srgbToLinear = (channel: number): number => {
  const normalized = clamp(channel / 255, 0, 1);
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
};

const linearToSrgb = (channel: number): number => {
  if (channel <= 0.0031308) {
    return channel * 12.92;
  }
  return 1.055 * channel ** (1 / 2.4) - 0.055;
};

const rgbToOklab = ({ r, g, b }: RgbColor): OklabColor => {
  const red = srgbToLinear(r);
  const green = srgbToLinear(g);
  const blue = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};

const oklabToRgbFloat = ({ l, a, b }: OklabColor): { r: number; g: number; b: number } => {
  const lComponent = l + 0.3963377774 * a + 0.2158037573 * b;
  const mComponent = l - 0.1055613458 * a - 0.0638541728 * b;
  const sComponent = l - 0.0894841775 * a - 1.291485548 * b;

  const lCube = lComponent ** 3;
  const mCube = mComponent ** 3;
  const sCube = sComponent ** 3;

  const red = linearToSrgb(4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube);
  const green = linearToSrgb(-1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube);
  const blue = linearToSrgb(-0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube);

  return { r: red * 255, g: green * 255, b: blue * 255 };
};

const oklabToRgb = ({ l, a, b }: OklabColor): RgbColor => {
  const rgb = oklabToRgbFloat({ l, a, b });
  return {
    r: roundChannel(rgb.r),
    g: roundChannel(rgb.g),
    b: roundChannel(rgb.b),
  };
};

const oklabToOklch = ({ l, a, b }: OklabColor): OklchColor => {
  const c = Math.sqrt(a * a + b * b);
  if (c < 1e-7) {
    return { l, c: 0 };
  }
  return { l, c, h: Math.atan2(b, a) };
};

const oklchToRgb = ({ l, c, h }: OklchColor): RgbColor => {
  if (h === undefined || c <= 1e-7) {
    return oklabToRgb({ l, a: 0, b: 0 });
  }

  return oklabToRgb({
    l,
    a: Math.cos(h) * c,
    b: Math.sin(h) * c,
  });
};

const isInRgbGamut = (color: OklchColor): boolean => {
  const rgb =
    color.h === undefined || color.c <= 1e-7
      ? oklabToRgbFloat({ l: color.l, a: 0, b: 0 })
      : oklabToRgbFloat({
          l: color.l,
          a: Math.cos(color.h) * color.c,
          b: Math.sin(color.h) * color.c,
        });
  return rgb.r >= 0 && rgb.r <= 255 && rgb.g >= 0 && rgb.g <= 255 && rgb.b >= 0 && rgb.b <= 255;
};

const fitOklchToRgb = (color: OklchColor): RgbColor => {
  if (color.h === undefined || color.c <= 1e-7) {
    return oklchToRgb({ l: color.l, c: 0 });
  }

  if (isInRgbGamut(color)) {
    return oklchToRgb(color);
  }

  let low = 0;
  let high = color.c;
  let best = oklchToRgb({ l: color.l, c: 0, h: color.h });

  for (let iteration = 0; iteration < 18; iteration += 1) {
    const mid = (low + high) / 2;
    const candidateColor = { l: color.l, c: mid, h: color.h };
    const candidateRgb = oklchToRgb(candidateColor);
    if (isInRgbGamut(candidateColor)) {
      low = mid;
      best = candidateRgb;
    } else {
      high = mid;
    }
  }

  return best;
};

const rgbToHex = ({ r, g, b }: RgbColor): string => {
  return `#${roundChannel(r).toString(16).padStart(2, "0")}${roundChannel(g).toString(16).padStart(2, "0")}${roundChannel(b)
    .toString(16)
    .padStart(2, "0")}`;
};

const labDistance = (left: Pick<Cluster, "labL" | "labA" | "labB">, right: Pick<Cluster, "labL" | "labA" | "labB">): number => {
  const deltaL = left.labL - right.labL;
  const deltaA = left.labA - right.labA;
  const deltaB = left.labB - right.labB;
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
};

const closeness = (value: number, target: number, tolerance: number): number => {
  if (tolerance <= 0) {
    return 0;
  }
  return clamp(1 - Math.abs(value - target) / tolerance, 0, 1);
};

const normalizeChroma = (value: number): number => {
  return clamp(value / 0.22, 0, 1);
};

const isNeutralLike = (color: Pick<OklchColor, "c" | "h">): boolean => {
  return color.h === undefined || color.c < 0.028;
};

const collectQuantizedPoints = (sample: DecodedPng): QuantizedPoint[] => {
  const bins = new Map<string, MutableQuantizedPoint>();
  const edgeThresholdX = Math.max(1, sample.width * 0.14);
  const edgeThresholdY = Math.max(1, sample.height * 0.14);
  const maxDistance = Math.sqrt(0.5 * 0.5 + 0.5 * 0.5);

  for (let y = 0; y < sample.height; y += 1) {
    for (let x = 0; x < sample.width; x += 1) {
      const pixelOffset = (y * sample.width + x) * 4;
      const alpha = (sample.pixels[pixelOffset + 3] ?? 0) / 255;

      if (alpha < 0.08) {
        continue;
      }

      const red = sample.pixels[pixelOffset] ?? 0;
      const green = sample.pixels[pixelOffset + 1] ?? 0;
      const blue = sample.pixels[pixelOffset + 2] ?? 0;
      const quantizedRed = red >> 4;
      const quantizedGreen = green >> 4;
      const quantizedBlue = blue >> 4;
      const key = `${quantizedRed}:${quantizedGreen}:${quantizedBlue}`;

      const normalizedX = (x + 0.5) / sample.width - 0.5;
      const normalizedY = (y + 0.5) / sample.height - 0.5;
      const centerWeight = 1 - clamp(Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY) / maxDistance, 0, 1);
      const edgeWeight =
        x < edgeThresholdX || x >= sample.width - edgeThresholdX || y < edgeThresholdY || y >= sample.height - edgeThresholdY ? 1 : 0;

      const bucket = bins.get(key) ?? {
        rSum: 0,
        gSum: 0,
        bSum: 0,
        weight: 0,
        centerWeight: 0,
        edgeWeight: 0,
      };

      bucket.rSum += red * alpha;
      bucket.gSum += green * alpha;
      bucket.bSum += blue * alpha;
      bucket.weight += alpha;
      bucket.centerWeight += centerWeight * alpha;
      bucket.edgeWeight += edgeWeight * alpha;
      bins.set(key, bucket);
    }
  }

  const points: QuantizedPoint[] = [];
  for (const bucket of bins.values()) {
    if (bucket.weight <= 0) {
      continue;
    }

    const rgb = {
      r: bucket.rSum / bucket.weight,
      g: bucket.gSum / bucket.weight,
      b: bucket.bSum / bucket.weight,
    };
    const lab = rgbToOklab(rgb);
    const lch = oklabToOklch(lab);

    points.push({
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      weight: bucket.weight,
      centerWeight: bucket.centerWeight,
      edgeWeight: bucket.edgeWeight,
      labL: lab.l,
      labA: lab.a,
      labB: lab.b,
      lightness: lch.l,
      chroma: lch.c,
      hue: lch.h,
    });
  }

  if (points.length === 0) {
    throw createColorPickerError("COLOR_PICKER_IMAGE_EMPTY", "The sampled image did not contain visible pixels.");
  }

  return points;
};

const selectClusterCount = (points: QuantizedPoint[]): number => {
  if (points.length <= 1) {
    return 1;
  }
  if (points.length <= 4) {
    return Math.max(2, points.length);
  }
  return Math.min(8, Math.max(3, Math.round(Math.sqrt(points.length / 3))));
};

const initializeCentroids = (points: QuantizedPoint[], clusterCount: number): Centroid[] => {
  const centroids: Centroid[] = [];
  const first = [...points].sort((left, right) => {
    const leftScore = left.weight * (1 + normalizeChroma(left.chroma));
    const rightScore = right.weight * (1 + normalizeChroma(right.chroma));
    return rightScore - leftScore;
  })[0];

  if (!first) {
    return centroids;
  }

  centroids.push({ l: first.labL, a: first.labA, b: first.labB });

  while (centroids.length < clusterCount) {
    let bestPoint: QuantizedPoint | undefined;
    let bestScore = -1;

    for (const point of points) {
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const centroid of centroids) {
        const deltaL = point.labL - centroid.l;
        const deltaA = point.labA - centroid.a;
        const deltaB = point.labB - centroid.b;
        const distance = deltaL * deltaL + deltaA * deltaA + deltaB * deltaB;
        nearestDistance = Math.min(nearestDistance, distance);
      }

      const score = point.weight * nearestDistance;
      if (score > bestScore) {
        bestScore = score;
        bestPoint = point;
      }
    }

    if (!bestPoint) {
      break;
    }

    centroids.push({ l: bestPoint.labL, a: bestPoint.labA, b: bestPoint.labB });
  }

  return centroids;
};

const clusterPoints = (points: QuantizedPoint[]): Cluster[] => {
  const clusterCount = selectClusterCount(points);
  const centroids = initializeCentroids(points, clusterCount);

  if (centroids.length === 0) {
    throw createColorPickerError("COLOR_PICKER_ANALYSIS_FAILED", "Failed to initialize representative color clusters.");
  }

  const assignments = new Int32Array(points.length).fill(-1);

  for (let iteration = 0; iteration < 12; iteration += 1) {
    let changed = false;

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      if (!point) {
        continue;
      }
      let bestClusterIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let centroidIndex = 0; centroidIndex < centroids.length; centroidIndex += 1) {
        const centroid = centroids[centroidIndex];
        if (!centroid) {
          continue;
        }
        const deltaL = point.labL - centroid.l;
        const deltaA = point.labA - centroid.a;
        const deltaB = point.labB - centroid.b;
        const distance = deltaL * deltaL + deltaA * deltaA + deltaB * deltaB;

        if (distance < bestDistance) {
          bestDistance = distance;
          bestClusterIndex = centroidIndex;
        }
      }

      if (assignments[index] !== bestClusterIndex) {
        assignments[index] = bestClusterIndex;
        changed = true;
      }
    }

    const nextCentroids = centroids.map(() => ({
      weight: 0,
      labL: 0,
      labA: 0,
      labB: 0,
    }));

    for (let index = 0; index < points.length; index += 1) {
      const clusterIndex = assignments[index];
      const point = points[index];
      if (clusterIndex === undefined || clusterIndex < 0 || !point) {
        continue;
      }
      const bucket = nextCentroids[clusterIndex];
      if (!bucket) {
        continue;
      }

      bucket.weight += point.weight;
      bucket.labL += point.labL * point.weight;
      bucket.labA += point.labA * point.weight;
      bucket.labB += point.labB * point.weight;
    }

    for (let index = 0; index < nextCentroids.length; index += 1) {
      const bucket = nextCentroids[index];
      if (!bucket) {
        continue;
      }
      if (bucket.weight > 0) {
        centroids[index] = {
          l: bucket.labL / bucket.weight,
          a: bucket.labA / bucket.weight,
          b: bucket.labB / bucket.weight,
        };
      }
    }

    if (!changed) {
      break;
    }
  }

  const clusterBuckets = centroids.map(() => ({
    rSum: 0,
    gSum: 0,
    bSum: 0,
    weight: 0,
    centerWeight: 0,
    edgeWeight: 0,
  }));

  for (let index = 0; index < points.length; index += 1) {
    const clusterIndex = assignments[index];
    const point = points[index];
    if (clusterIndex === undefined || clusterIndex < 0 || !point) {
      continue;
    }
    const bucket = clusterBuckets[clusterIndex];
    if (!bucket) {
      continue;
    }

    bucket.rSum += point.r * point.weight;
    bucket.gSum += point.g * point.weight;
    bucket.bSum += point.b * point.weight;
    bucket.weight += point.weight;
    bucket.centerWeight += point.centerWeight;
    bucket.edgeWeight += point.edgeWeight;
  }

  return clusterBuckets
    .filter((bucket) => bucket.weight > 0)
    .map((bucket) => {
      const rgb = {
        r: bucket.rSum / bucket.weight,
        g: bucket.gSum / bucket.weight,
        b: bucket.bSum / bucket.weight,
      };
      const lab = rgbToOklab(rgb);
      const lch = oklabToOklch(lab);

      return {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        weight: bucket.weight,
        centerWeight: bucket.centerWeight,
        edgeWeight: bucket.edgeWeight,
        labL: lab.l,
        labA: lab.a,
        labB: lab.b,
        lightness: lch.l,
        chroma: lch.c,
        hue: lch.h,
      };
    })
    .sort((left, right) => right.weight - left.weight);
};

const chooseBackgroundCluster = (clusters: Cluster[], totalWeight: number): Cluster => {
  const initialCluster = clusters[0];
  if (!initialCluster) {
    throw createColorPickerError("COLOR_PICKER_ANALYSIS_FAILED", "No representative color clusters were produced.");
  }

  let bestCluster = initialCluster;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const cluster of clusters) {
    const share = cluster.weight / totalWeight;
    const edgeRatio = cluster.edgeWeight / Math.max(cluster.weight, 1e-6);
    const score =
      share * 4.2 +
      normalizeChroma(cluster.chroma) * 2 +
      closeness(cluster.lightness, 0.54, 0.2) * 2.7 +
      edgeRatio * 0.45 -
      (share < 0.04 ? 1.1 : 0) -
      (cluster.lightness < 0.24 ? 1.5 : 0) -
      (cluster.lightness > 0.78 ? 1.2 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestCluster = cluster;
    }
  }

  return bestCluster;
};

const chooseAccentCluster = (clusters: Cluster[], background: Cluster, totalWeight: number): Cluster | undefined => {
  let bestCluster: Cluster | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const cluster of clusters) {
    if (cluster === background && clusters.length > 1) {
      continue;
    }

    const share = cluster.weight / totalWeight;
    const centerRatio = cluster.centerWeight / Math.max(cluster.weight, 1e-6);
    const separation = labDistance(cluster, background);
    const score =
      normalizeChroma(cluster.chroma) * 3.4 +
      closeness(cluster.lightness, 0.58, 0.2) * 2.1 +
      Math.min(share, 0.2) * 1.5 +
      centerRatio * 0.35 +
      Math.min(separation / 0.16, 1) * 1.1 -
      (share < 0.008 ? 1.1 : 0) -
      (cluster.lightness < 0.18 ? 1.4 : 0) -
      (cluster.lightness > 0.84 ? 0.45 : 0) -
      (separation < 0.05 ? 1.5 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestCluster = cluster;
    }
  }

  return bestCluster;
};

const tuneBackgroundColor = (cluster: Cluster): RgbColor => {
  const color = oklabToOklch({
    l: cluster.labL,
    a: cluster.labA,
    b: cluster.labB,
  });

  if (isNeutralLike(color)) {
    return fitOklchToRgb({
      l: clamp(color.l * 0.7 + 0.16, 0.48, 0.62),
      c: clamp(color.c, 0, 0.045),
      h: color.h,
    });
  }

  const tuned: OklchColor = {
    l: clamp(color.l * 0.72 + 0.14, 0.48, 0.62),
    c: clamp(Math.max(color.c * 1.08, 0.11), 0.11, 0.2),
    h: color.h,
  };

  return fitOklchToRgb(tuned);
};

const tuneAccentColor = (cluster: Cluster): RgbColor => {
  const color = oklabToOklch({
    l: cluster.labL,
    a: cluster.labA,
    b: cluster.labB,
  });

  if (isNeutralLike(color)) {
    return fitOklchToRgb({
      l: clamp(Math.max(color.l + 0.2, 0.72), 0.72, 0.84),
      c: clamp(color.c * 1.35, 0, 0.065),
      h: color.h,
    });
  }

  const tuned: OklchColor = {
    l: clamp(Math.max(color.l * 0.62 + 0.34, 0.72), 0.72, 0.84),
    c: clamp(Math.max(color.c * 1.62, 0.18), 0.18, 0.3),
    h: color.h,
  };

  return fitOklchToRgb(tuned);
};

const createFallbackAccent = (background: Cluster): RgbColor => {
  const color = oklabToOklch({
    l: background.labL,
    a: background.labA,
    b: background.labB,
  });

  if (isNeutralLike(color)) {
    return fitOklchToRgb({
      l: clamp(Math.max(color.l + 0.22, 0.74), 0.74, 0.86),
      c: clamp(color.c * 1.4, 0, 0.07),
      h: color.h,
    });
  }

  const tuned: OklchColor = {
    l: clamp(Math.max(color.l + 0.18, 0.74), 0.74, 0.86),
    c: clamp(Math.max(color.c * 1.8, 0.18), 0.18, 0.3),
    h: color.h,
  };

  return fitOklchToRgb(tuned);
};

const ensureFinalSeparation = (backgroundRgb: RgbColor, accentRgb: RgbColor, accentSource: Cluster): RgbColor => {
  const backgroundLab = rgbToOklab(backgroundRgb);
  const accentLab = rgbToOklab(accentRgb);
  const separation = labDistance(
    { labL: backgroundLab.l, labA: backgroundLab.a, labB: backgroundLab.b },
    { labL: accentLab.l, labA: accentLab.a, labB: accentLab.b },
  );

  if (separation >= 0.12) {
    return accentRgb;
  }

  const accentLch = oklabToOklch({
    l: accentSource.labL,
    a: accentSource.labA,
    b: accentSource.labB,
  });

  if (isNeutralLike(accentLch)) {
    return fitOklchToRgb({
      l: clamp(Math.max(accentLch.l + 0.24, 0.76), 0.76, 0.88),
      c: clamp(accentLch.c * 1.4, 0, 0.07),
      h: accentLch.h,
    });
  }

  return fitOklchToRgb({
    l: clamp(Math.max(accentLch.l + 0.24, 0.78), 0.78, 0.88),
    c: clamp(Math.max(accentLch.c * 1.9, 0.2), 0.2, 0.32),
    h: accentLch.h,
  });
};

export const analyzeColorSample = (sample: DecodedPng): ColorPickResult => {
  const points = collectQuantizedPoints(sample);
  const totalWeight = points.reduce((sum, point) => sum + point.weight, 0);
  if (totalWeight <= 0) {
    throw createColorPickerError("COLOR_PICKER_IMAGE_EMPTY", "The sampled image did not contain visible color information.");
  }

  const clusters = clusterPoints(points);
  const backgroundCluster = chooseBackgroundCluster(clusters, totalWeight);
  const accentCluster = chooseAccentCluster(clusters, backgroundCluster, totalWeight);

  const backgroundRgb = tuneBackgroundColor(backgroundCluster);
  const accentRgb = ensureFinalSeparation(
    backgroundRgb,
    accentCluster ? tuneAccentColor(accentCluster) : createFallbackAccent(backgroundCluster),
    accentCluster ?? backgroundCluster,
  );

  return {
    backgroundColor: rgbToHex(backgroundRgb),
    accentColor: rgbToHex(accentRgb),
  };
};

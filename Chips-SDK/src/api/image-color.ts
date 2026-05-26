export interface ImageColorPickInput {
  imagePath: string;
  options?: {
    sampleSize?: number;
  };
}

export type ImageColorPaletteRole = "background" | "accent" | "representative";

export interface ImageColorPaletteEntry {
  color: string;
  role: ImageColorPaletteRole;
  population: number;
  lightness: number;
  chroma: number;
}

export interface ImageColorPickMetadata {
  algorithm: "oklab-kmeans-v1";
  source?: {
    imagePath: string;
    sizeBytes?: number;
    mtimeMs?: number;
  };
  image: {
    width: number;
    height: number;
    format?: string;
    animated: boolean;
    pageCount: number;
    hasAlpha: boolean;
    orientation?: number;
  };
  sample: {
    width: number;
    height: number;
    sampleSize: number;
    visiblePixelRatio: number;
    transparentPixelRatio: number;
    clusterCount: number;
  };
}

export interface ImageColorPickOutput {
  backgroundColor: string;
  accentColor: string;
  palette: ImageColorPaletteEntry[];
  metadata: ImageColorPickMetadata;
}

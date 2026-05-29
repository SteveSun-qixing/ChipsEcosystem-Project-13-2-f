import { stripExtension, toSafeFileName } from "./file-names";
import type { SourceIconImage } from "./types";

const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

export function isSupportedIconSource(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    SUPPORTED_TYPES.has(file.type) ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].some((extension) => lowerName.endsWith(extension))
  );
}

export function loadImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
    image.src = objectUrl;
  });
}

export async function createSourceIconImage(file: File): Promise<SourceIconImage> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    return {
      id: `${file.name}-${file.size}-${file.lastModified}`,
      fileName: file.name,
      baseName: toSafeFileName(stripExtension(file.name)),
      objectUrl,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      file,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

import type { BookCardOpenPayload, PlatformLaunchContext } from "chips-sdk";
import { resolveFileName } from "./image-viewer";

export interface LaunchImageResource {
  sourceId: string;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  title?: string;
  relativePath?: string;
}

export interface LaunchImageTarget {
  images: LaunchImageResource[];
  initialIndex: number;
  title?: string;
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readBookPayload(value: unknown): BookCardOpenPayload | null {
  const payload = readRecord(value);
  if (
    payload?.kind !== "chips.book-card" ||
    payload.version !== "1.0.0" ||
    payload.cardType !== "base.book" ||
    payload.mode !== "image-sequence"
  ) {
    return null;
  }

  const resources = readRecord(payload.resources);
  if (!Array.isArray(resources?.images)) {
    return null;
  }

  return payload as unknown as BookCardOpenPayload;
}

function readPayloadImageResource(value: unknown): LaunchImageResource | null {
  const record = readRecord(value);
  const sourceId = readNonEmptyString(record?.resourceId);
  const relativePath = readNonEmptyString(record?.relativePath);
  const resolvedSourceId = sourceId ?? relativePath;
  if (!resolvedSourceId) {
    return null;
  }

  return {
    sourceId: resolvedSourceId,
    fileName: readNonEmptyString(record?.fileName) ?? resolveFileName(relativePath ?? resolvedSourceId),
    mimeType: readNonEmptyString(record?.mimeType),
    relativePath,
  };
}

export function resolveLaunchImageTarget(launchContext: PlatformLaunchContext): LaunchImageTarget | null {
  const launchParams = readRecord(launchContext.launchParams) ?? {};
  const resourceOpen = readRecord(launchParams.resourceOpen);
  const bookPayload = readBookPayload(resourceOpen?.payload);

  if (bookPayload) {
    const images = (bookPayload.resources.images ?? [])
      .map(readPayloadImageResource)
      .filter((image): image is LaunchImageResource => image !== null);
    if (images.length > 0) {
      const directSources = [
        readNonEmptyString(resourceOpen?.resourceId),
        readNonEmptyString(resourceOpen?.filePath),
      ].filter((item): item is string => Boolean(item));
      const initialIndex = directSources.length > 0
        ? images.findIndex((image) => (
          directSources.includes(image.sourceId) ||
          (image.relativePath ? directSources.includes(image.relativePath) : false)
        ))
        : 0;

      return {
        images,
        initialIndex: initialIndex < 0 ? 0 : initialIndex,
        title: bookPayload.display.title,
      };
    }
  }

  const directTargetPath = readNonEmptyString(launchParams.targetPath);
  const resourceFilePath = readNonEmptyString(resourceOpen?.filePath);
  const resourceId = readNonEmptyString(resourceOpen?.resourceId);
  const sourceId = resourceFilePath ?? directTargetPath ?? resourceId;
  if (!sourceId) {
    return null;
  }

  return {
    images: [
      {
        sourceId,
        filePath: resourceFilePath ?? directTargetPath,
        fileName: readNonEmptyString(resourceOpen?.fileName) ?? resolveFileName(sourceId),
        mimeType: readNonEmptyString(resourceOpen?.mimeType),
        title: readNonEmptyString(resourceOpen?.title),
      },
    ],
    initialIndex: 0,
    title: readNonEmptyString(resourceOpen?.title),
  };
}

export function resolveLaunchImagePath(launchContext: PlatformLaunchContext): string | null {
  return resolveLaunchImageTarget(launchContext)?.images[0]?.sourceId ?? null;
}

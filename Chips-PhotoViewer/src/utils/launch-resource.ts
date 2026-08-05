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

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePlainPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function isSourceForRelativePath(sourceId: string, relativePath: string | undefined): boolean {
  if (!relativePath) {
    return false;
  }

  if (sourceId === relativePath) {
    return true;
  }

  try {
    const parsed = new URL(sourceId);
    const sourceSegments = parsed.pathname.split("/").filter(Boolean).map(decodePathSegment);
    const relativeSegments = normalizePlainPath(relativePath).split("/").filter(Boolean);
    return relativeSegments.length > 0
      && sourceSegments.slice(-relativeSegments.length).join("/") === relativeSegments.join("/");
  } catch {
    const normalizedSource = normalizePlainPath(sourceId);
    const normalizedRelative = normalizePlainPath(relativePath);
    return normalizedSource.endsWith(`/${normalizedRelative}`) || normalizedSource === normalizedRelative;
  }
}

function resolveResourceBaseFromDirectSource(
  directSource: string | undefined,
  directRelativePath: string | undefined,
): string | undefined {
  if (!directSource || !directRelativePath || !isSourceForRelativePath(directSource, directRelativePath)) {
    return undefined;
  }

  const relativeSegments = normalizePlainPath(directRelativePath).split("/").filter(Boolean);
  if (relativeSegments.length === 0) {
    return undefined;
  }

  try {
    const parsed = new URL(directSource);
    const sourceSegments = parsed.pathname.split("/").filter(Boolean);
    parsed.pathname = `/${sourceSegments.slice(0, -relativeSegments.length).join("/")}/`;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    const normalizedSource = normalizePlainPath(directSource);
    const normalizedRelative = normalizePlainPath(directRelativePath);
    if (normalizedSource.endsWith(normalizedRelative)) {
      return normalizedSource.slice(0, normalizedSource.length - normalizedRelative.length);
    }
  }

  return undefined;
}

function resolvePayloadSourceId(
  sourceId: string | undefined,
  relativePath: string | undefined,
  resourceBaseUrl: string | undefined,
): string | undefined {
  if (sourceId && (!relativePath || sourceId !== relativePath)) {
    return sourceId;
  }

  if (relativePath && resourceBaseUrl) {
    try {
      return new URL(relativePath, resourceBaseUrl).toString();
    } catch {
      return `${resourceBaseUrl}${relativePath}`;
    }
  }

  return sourceId ?? relativePath;
}

function readPayloadImageResource(value: unknown, resourceBaseUrl?: string): LaunchImageResource | null {
  const record = readRecord(value);
  const sourceId = readNonEmptyString(record?.resourceId);
  const relativePath = readNonEmptyString(record?.relativePath);
  const resolvedSourceId = resolvePayloadSourceId(sourceId, relativePath, resourceBaseUrl);
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
    const rawImages = bookPayload.resources.images ?? [];
    const directSources = [
      readNonEmptyString(resourceOpen?.resourceId),
      readNonEmptyString(resourceOpen?.filePath),
    ].filter((item): item is string => Boolean(item));
    const directImage = rawImages.find((image) => {
      const record = readRecord(image);
      const sourceId = readNonEmptyString(record?.resourceId);
      const relativePath = readNonEmptyString(record?.relativePath);
      return directSources.some((directSource) => (
        directSource === sourceId
        || directSource === relativePath
        || isSourceForRelativePath(directSource, relativePath)
      ));
    });
    const directImageRecord = readRecord(directImage);
    const directRelativePath = readNonEmptyString(directImageRecord?.relativePath)
      ?? readNonEmptyString(directImageRecord?.resourceId);
    const directSource = directSources.find((source) => (
      source === directRelativePath || isSourceForRelativePath(source, directRelativePath)
    ));
    const resourceBaseUrl = resolveResourceBaseFromDirectSource(directSource, directRelativePath);
    const images = rawImages
      .map((image) => readPayloadImageResource(image, resourceBaseUrl))
      .filter((image): image is LaunchImageResource => image !== null);
    if (images.length > 0) {
      const initialIndex = directSources.length > 0
        ? images.findIndex((image) => (
          directSources.includes(image.sourceId) ||
          (image.relativePath ? directSources.includes(image.relativePath) || directSources.some((source) => isSourceForRelativePath(source, image.relativePath)) : false)
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

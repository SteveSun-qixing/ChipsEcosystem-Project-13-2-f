import type { BookCardOpenPayload, PlatformLaunchContext } from "chips-sdk";
import { resolveFileName, type LaunchBookTarget } from "./book-reader";

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
    payload.mode !== "ebook"
  ) {
    return null;
  }

  const resources = readRecord(payload.resources);
  if (!readRecord(resources?.book)) {
    return null;
  }

  return payload as unknown as BookCardOpenPayload;
}

export function resolveLaunchBookTarget(launchContext: PlatformLaunchContext): LaunchBookTarget | null {
  const launchParams = readRecord(launchContext.launchParams) ?? {};
  const resourceOpen = readRecord(launchParams.resourceOpen);
  const bookPayload = readBookPayload(resourceOpen?.payload);

  if (bookPayload?.resources.book) {
    const bookResource = readRecord(bookPayload.resources.book);
    const sourceId =
      readNonEmptyString(bookResource?.resourceId) ??
      readNonEmptyString(bookResource?.relativePath);
    if (sourceId) {
      const display = readRecord(bookPayload.display) ?? {};
      const filePath = readNonEmptyString(resourceOpen?.filePath);
      const fileName =
        readNonEmptyString(bookResource?.fileName) ??
        readNonEmptyString(resourceOpen?.fileName) ??
        resolveFileName(filePath ?? sourceId);

      return {
        sourceId,
        filePath,
        fileName,
        mimeType: readNonEmptyString(bookResource?.mimeType) ?? readNonEmptyString(resourceOpen?.mimeType),
        title: readNonEmptyString(display.title) ?? readNonEmptyString(resourceOpen?.title),
        author: readNonEmptyString(display.author),
        relativePath: readNonEmptyString(bookResource?.relativePath),
      };
    }
  }

  const resourceFilePath = readNonEmptyString(resourceOpen?.filePath);
  const targetPath = readNonEmptyString(launchParams.targetPath);
  const resourceId = readNonEmptyString(resourceOpen?.resourceId);
  const sourceId = resourceFilePath ?? targetPath ?? resourceId;

  if (!sourceId) {
    return null;
  }

  const filePath = resourceFilePath ?? targetPath;

  return {
    sourceId,
    filePath,
    fileName: readNonEmptyString(resourceOpen?.fileName) ?? resolveFileName(filePath ?? sourceId),
    mimeType: readNonEmptyString(resourceOpen?.mimeType),
    title: readNonEmptyString(resourceOpen?.title),
  };
}

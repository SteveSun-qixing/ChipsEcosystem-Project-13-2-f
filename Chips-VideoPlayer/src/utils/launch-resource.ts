import type { PlatformLaunchContext } from "chips-sdk";
import { resolveFileName, type LaunchVideoTarget } from "./video-player";

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function resolveLaunchVideoTarget(launchContext: PlatformLaunchContext): LaunchVideoTarget | null {
  const launchParams = readRecord(launchContext.launchParams) ?? {};
  const resourceOpen = readRecord(launchParams.resourceOpen);
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

import type { MusicCardOpenPayload, PlatformLaunchContext } from "chips-sdk";
import { resolveFileName, type LaunchAudioTarget } from "./music-player";

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function isMusicCardOpenResource(value: unknown): boolean {
  const record = readRecord(value);
  return Boolean(record && readNonEmptyString(record.resourceId) && readNonEmptyString(record.relativePath));
}

function isMusicCardOpenPayload(value: unknown): value is MusicCardOpenPayload {
  const record = readRecord(value);
  if (!record) {
    return false;
  }

  if (record.kind !== "chips.music-card" || record.version !== "1.0.0" || record.cardType !== "base.music") {
    return false;
  }

  const config = readRecord(record.config);
  const resources = readRecord(record.resources);
  const display = readRecord(record.display);
  if (!config || !resources || !display) {
    return false;
  }

  if (config.card_type !== "MusicCard" || !Array.isArray(config.production_team) || !isMusicCardOpenResource(resources.audio)) {
    return false;
  }

  return typeof display.title === "string" && typeof display.artist === "string";
}

export function resolveLaunchAudioTarget(launchContext: PlatformLaunchContext): LaunchAudioTarget | null {
  const launchParams = readRecord(launchContext.launchParams) ?? {};
  const resourceOpen = readRecord(launchParams.resourceOpen);
  const musicCard = isMusicCardOpenPayload(resourceOpen?.payload) ? resourceOpen.payload : undefined;
  const audioDescriptor = readRecord(musicCard?.resources.audio);
  const resourceFilePath = readNonEmptyString(resourceOpen?.filePath);
  const targetPath = readNonEmptyString(launchParams.targetPath);
  const resourceId = readNonEmptyString(resourceOpen?.resourceId) ?? readNonEmptyString(audioDescriptor?.resourceId);
  const sourceId = resourceFilePath ?? targetPath ?? resourceId;

  if (!sourceId) {
    return null;
  }

  const filePath = resourceFilePath ?? targetPath;

  return {
    sourceId,
    filePath,
    fileName:
      readNonEmptyString(resourceOpen?.fileName) ??
      readNonEmptyString(audioDescriptor?.fileName) ??
      resolveFileName(filePath ?? sourceId),
    mimeType: readNonEmptyString(resourceOpen?.mimeType) ?? readNonEmptyString(audioDescriptor?.mimeType),
    title: readNonEmptyString(resourceOpen?.title) ?? readNonEmptyString(musicCard?.display.title),
    ...(musicCard ? { musicCard } : undefined),
  };
}

export function resolveLaunchWorkspacePath(launchContext: PlatformLaunchContext): string | undefined {
  const launchParams = readRecord(launchContext.launchParams) ?? {};
  return readNonEmptyString(launchParams.workspacePath);
}

import type { PlatformLaunchContext, VideoCardOpenPayload } from "chips-sdk";
import { resolveFileName, type LaunchVideoTarget } from "./video-player";

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readVideoCardResource(value: unknown): Record<string, unknown> | null {
  const record = readRecord(value);
  return record && readNonEmptyString(record.resourceId) && readNonEmptyString(record.relativePath)
    ? record
    : null;
}

function readVideoCardPayload(value: unknown): VideoCardOpenPayload | null {
  const payload = readRecord(value);
  if (!payload || payload.kind !== "chips.video-card" || payload.version !== "1.0.0" || payload.cardType !== "base.video") {
    return null;
  }

  const config = readRecord(payload.config);
  const resources = readRecord(payload.resources);
  const display = readRecord(payload.display);
  const playback = readRecord(payload.playback);
  if (!config || !resources || !display || !playback) {
    return null;
  }

  if (config.card_type !== "VideoCard" || !Array.isArray(config.subtitles) || !readVideoCardResource(resources.video)) {
    return null;
  }

  if (
    typeof display.title !== "string" ||
    typeof playback.autoplay !== "boolean" ||
    typeof playback.loop !== "boolean" ||
    typeof playback.muted !== "boolean" ||
    typeof playback.playbackRate !== "number" ||
    typeof playback.startTime !== "number"
  ) {
    return null;
  }

  return payload as unknown as VideoCardOpenPayload;
}

export function resolveLaunchVideoTarget(launchContext: PlatformLaunchContext): LaunchVideoTarget | null {
  const launchParams = readRecord(launchContext.launchParams) ?? {};
  const resourceOpen = readRecord(launchParams.resourceOpen);
  const videoCard = readVideoCardPayload(resourceOpen?.payload);
  const videoDescriptor = readRecord(videoCard?.resources.video);
  const resourceFilePath = readNonEmptyString(resourceOpen?.filePath);
  const targetPath = readNonEmptyString(launchParams.targetPath);
  const resourceId = readNonEmptyString(resourceOpen?.resourceId) ?? readNonEmptyString(videoDescriptor?.resourceId);
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
      readNonEmptyString(videoDescriptor?.fileName) ??
      resolveFileName(filePath ?? sourceId),
    mimeType: readNonEmptyString(resourceOpen?.mimeType) ?? readNonEmptyString(videoDescriptor?.mimeType),
    title: readNonEmptyString(resourceOpen?.title) ?? readNonEmptyString(videoCard?.display.title),
    ...(videoCard ? { videoCard } : undefined),
  };
}

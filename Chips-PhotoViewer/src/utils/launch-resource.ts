import type { PlatformLaunchContext } from "chips-sdk";

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function resolveLaunchImagePath(launchContext: PlatformLaunchContext): string | null {
  const directTargetPath = readNonEmptyString(launchContext.launchParams.targetPath);
  if (directTargetPath) {
    return directTargetPath;
  }

  const resourceOpen =
    launchContext.launchParams.resourceOpen &&
    typeof launchContext.launchParams.resourceOpen === "object" &&
    !Array.isArray(launchContext.launchParams.resourceOpen)
      ? (launchContext.launchParams.resourceOpen as Record<string, unknown>)
      : null;

  const resourceFilePath = readNonEmptyString(resourceOpen?.filePath);
  if (resourceFilePath) {
    return resourceFilePath;
  }

  return readNonEmptyString(resourceOpen?.resourceId);
}

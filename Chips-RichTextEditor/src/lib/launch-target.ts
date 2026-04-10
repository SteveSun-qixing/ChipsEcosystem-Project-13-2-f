import type { PlatformLaunchContext } from "chips-sdk";

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function resolveLaunchCardPath(launchContext: PlatformLaunchContext): string | null {
  const targetPath = readNonEmptyString(launchContext.launchParams.targetPath);
  if (targetPath && targetPath.toLowerCase().endsWith(".card")) {
    return targetPath;
  }
  return null;
}

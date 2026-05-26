import type { Client, PlatformLaunchContext } from "chips-sdk";

export function readLaunchContext(client: Client): PlatformLaunchContext {
  try {
    return client.platform.getLaunchContext();
  } catch {
    return { launchParams: {} };
  }
}

export function resolveLaunchParams(launchContext: PlatformLaunchContext): Record<string, unknown> {
  return {
    ...launchContext.launchParams,
    ...launchContext.surfaceContext?.launchParams,
  };
}

export function resolveHostSceneId(launchContext: PlatformLaunchContext, fallbackSceneId: string): string {
  return launchContext.surfaceContext?.sceneId ?? launchContext.sceneId ?? fallbackSceneId;
}

export function resolveSurfaceKind(launchContext: PlatformLaunchContext): string {
  return launchContext.surfaceContext?.kind ?? launchContext.kind ?? "window";
}


import type { Client, PlatformLaunchContext, SurfaceContext } from "chips-sdk";
import { appConfig } from "../../config/app-config";

export function createFallbackSurfaceContext(launchContext: PlatformLaunchContext | null = null): SurfaceContext {
  return {
    sceneId: launchContext?.sceneId ?? appConfig.defaultSceneId,
    surfaceId: launchContext?.surfaceId,
    pluginId: launchContext?.pluginId ?? appConfig.appId,
    sessionId: launchContext?.sessionId,
    kind: launchContext?.kind ?? "window",
    presentation: {
      title: "视频播放器",
      width: 960,
      height: 600,
      resizable: true,
      ...launchContext?.presentation,
    },
    launchParams: {
      ...launchContext?.launchParams,
      ...launchContext?.surfaceContext?.launchParams,
    },
  };
}

export function readLaunchContext(client: Client): PlatformLaunchContext {
  const launchContext = client.platform.getLaunchContext();
  const surfaceContext = launchContext.surfaceContext ?? createFallbackSurfaceContext(launchContext);

  return {
    ...launchContext,
    pluginId: launchContext.pluginId ?? surfaceContext.pluginId ?? appConfig.appId,
    sceneId: launchContext.sceneId ?? surfaceContext.sceneId ?? appConfig.defaultSceneId,
    surfaceId: launchContext.surfaceId ?? surfaceContext.surfaceId,
    kind: launchContext.kind ?? surfaceContext.kind,
    presentation: launchContext.presentation ?? surfaceContext.presentation,
    surfaceContext,
    launchParams: {
      ...surfaceContext.launchParams,
      ...launchContext.launchParams,
    },
  };
}


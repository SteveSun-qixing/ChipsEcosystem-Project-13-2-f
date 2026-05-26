import { appConfig } from "../../config/app-config";

export type VideoPlayerSceneId = "main";

export interface VideoPlayerSceneDefinition {
  id: VideoPlayerSceneId;
  hostSceneId: string;
  titleKey: string;
  descriptionKey: string;
}

export const videoPlayerSceneDefinition: VideoPlayerSceneDefinition = {
  id: "main",
  hostSceneId: appConfig.defaultSceneId,
  titleKey: "video-player.app.title",
  descriptionKey: "video-player.app.description",
};

export function getSceneDefinition(hostSceneId?: string): VideoPlayerSceneDefinition {
  if (hostSceneId === videoPlayerSceneDefinition.hostSceneId) {
    return videoPlayerSceneDefinition;
  }

  return videoPlayerSceneDefinition;
}


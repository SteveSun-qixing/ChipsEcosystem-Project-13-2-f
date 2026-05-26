export type MusicPlayerSceneId = "player";

export interface MusicPlayerSceneDefinition {
  id: MusicPlayerSceneId;
  titleKey: string;
  surfaceMode: "player";
}

export const musicPlayerScenes: readonly MusicPlayerSceneDefinition[] = [
  {
    id: "player",
    titleKey: "music-player.app.title",
    surfaceMode: "player",
  },
] as const;

export const defaultMusicPlayerScene = musicPlayerScenes[0];

export function getMusicPlayerScene(sceneId: string | null | undefined): MusicPlayerSceneDefinition {
  return musicPlayerScenes.find((scene) => scene.id === sceneId) ?? defaultMusicPlayerScene;
}


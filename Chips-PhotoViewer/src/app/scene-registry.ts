export const PHOTO_VIEWER_SCENE_IDS = {
  empty: "photo-viewer.scene.empty",
  image: "photo-viewer.scene.image",
} as const;

export type PhotoViewerSceneId = (typeof PHOTO_VIEWER_SCENE_IDS)[keyof typeof PHOTO_VIEWER_SCENE_IDS];

export interface PhotoViewerSceneDefinition {
  id: PhotoViewerSceneId;
  titleKey: string;
}

export const photoViewerScenes: PhotoViewerSceneDefinition[] = [
  {
    id: PHOTO_VIEWER_SCENE_IDS.empty,
    titleKey: "photo-viewer.scenes.empty.title",
  },
  {
    id: PHOTO_VIEWER_SCENE_IDS.image,
    titleKey: "photo-viewer.scenes.image.title",
  },
];

export function getSceneDefinition(sceneId: PhotoViewerSceneId): PhotoViewerSceneDefinition {
  return photoViewerScenes.find((scene) => scene.id === sceneId) ?? photoViewerScenes[0];
}

export function getSceneIdForImage(hasImageTarget: boolean): PhotoViewerSceneId {
  return hasImageTarget ? PHOTO_VIEWER_SCENE_IDS.image : PHOTO_VIEWER_SCENE_IDS.empty;
}

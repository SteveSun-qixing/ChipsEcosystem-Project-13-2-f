export type AppSceneId = "main" | "settings";

export interface AppSceneDefinition {
  id: AppSceneId;
  titleKey: string;
  descriptionKey: string;
}

export const sceneDefinitions: AppSceneDefinition[] = [
  {
    id: "main",
    titleKey: "app.scenes.main.title",
    descriptionKey: "app.scenes.main.description",
  },
  {
    id: "settings",
    titleKey: "app.scenes.settings.title",
    descriptionKey: "app.scenes.settings.description",
  },
];

export const defaultSceneDefinition = sceneDefinitions[0];

export function isAppSceneId(sceneId: string): sceneId is AppSceneId {
  return sceneDefinitions.some((scene) => scene.id === sceneId);
}

export function getSceneDefinition(sceneId: string | null | undefined): AppSceneDefinition {
  if (sceneId && isAppSceneId(sceneId)) {
    return sceneDefinitions.find((scene) => scene.id === sceneId) ?? defaultSceneDefinition;
  }
  return defaultSceneDefinition;
}

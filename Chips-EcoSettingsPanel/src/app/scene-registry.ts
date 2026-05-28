import { MENU_REGISTRY, type MenuId } from "./menu-registry";

export type SettingsSceneId = MenuId;

export interface SettingsSceneDefinition {
  id: SettingsSceneId;
  titleKey: string;
  descriptionKey: string;
  summaryKey: string;
  categoryKey: string;
  render: () => React.ReactElement;
}

export const sceneDefinitions: SettingsSceneDefinition[] = MENU_REGISTRY.map((entry) => ({
  id: entry.id,
  titleKey: entry.titleKey,
  descriptionKey: entry.summaryKey,
  summaryKey: entry.summaryKey,
  categoryKey: entry.categoryKey,
  render: entry.render,
}));

export const defaultSceneDefinition = sceneDefinitions[0];

export function isSettingsSceneId(sceneId: string): sceneId is SettingsSceneId {
  return sceneDefinitions.some((scene) => scene.id === sceneId);
}

export function getSceneDefinition(sceneId: string | null | undefined): SettingsSceneDefinition {
  if (sceneId && isSettingsSceneId(sceneId)) {
    return sceneDefinitions.find((scene) => scene.id === sceneId) ?? defaultSceneDefinition;
  }
  return defaultSceneDefinition;
}

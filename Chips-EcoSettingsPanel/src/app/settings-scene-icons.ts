import type { SettingsSceneId } from "./scene-registry";

export interface SettingsSceneIcon {
  name: string;
}

export const SETTINGS_SCENE_ICONS: Record<SettingsSceneId, SettingsSceneIcon> = {
  themes: { name: "palette" },
  "theme-diagnostics": { name: "rule_settings" },
  languages: { name: "translate" },
  "app-plugins": { name: "apps" },
  "card-plugins": { name: "dashboard_customize" },
  "layout-plugins": { name: "view_quilt" },
  "module-plugins": { name: "extension" },
  "component-gallery": { name: "widgets" },
  "preview-quality": { name: "speed" },
};

export function getSettingsSceneIconName(sceneId: SettingsSceneId): string {
  return SETTINGS_SCENE_ICONS[sceneId].name;
}

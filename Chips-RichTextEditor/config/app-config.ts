export interface AppFeatureFlags {
  enableAutosave: boolean;
}

export interface AppConfig {
  appId: string;
  defaultSceneId: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.rich-text-editor",
  defaultSceneId: "rich-text-editor.document",
  featureFlags: {
    enableAutosave: true,
  },
};

export interface AppFeatureFlags {
  enableAutosave: boolean;
}

export interface AppConfig {
  appId: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.rich-text-editor",
  featureFlags: {
    enableAutosave: true,
  },
};

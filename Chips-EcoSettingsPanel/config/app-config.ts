export interface AppFeatureFlags {
  enableCommandPalettePreview: boolean;
}

export interface AppConfig {
  appId: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.eco-settings-panel",
  featureFlags: {
    enableCommandPalettePreview: true,
  },
};

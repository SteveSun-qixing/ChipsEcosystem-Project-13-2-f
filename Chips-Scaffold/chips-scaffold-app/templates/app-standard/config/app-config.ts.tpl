export interface AppFeatureFlags {
  enableDebugPanel: boolean;
}

export interface AppConfig {
  appId: string;
  defaultSceneId: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "{{ PLUGIN_ID }}",
  defaultSceneId: "main",
  featureFlags: {
    enableDebugPanel: false,
  },
};

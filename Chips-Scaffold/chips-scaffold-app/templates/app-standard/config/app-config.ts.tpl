export interface AppFeatureFlags {
  enableDebugPanel: boolean;
}

export interface AppConfig {
  appId: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "{{ PLUGIN_ID }}",
  featureFlags: {
    enableDebugPanel: false,
  },
};


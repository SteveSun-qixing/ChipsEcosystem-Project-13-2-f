export interface AppFeatureFlags {
  enableDebugPanel: boolean;
  enableDiagnosticsLogging: boolean;
}

export interface AppConfig {
  appId: string;
  defaultSceneId: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.card-viewer",
  defaultSceneId: "empty",
  featureFlags: {
    enableDebugPanel: false,
    enableDiagnosticsLogging: true,
  },
};

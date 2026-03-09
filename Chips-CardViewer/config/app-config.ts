export interface AppFeatureFlags {
  enableDebugPanel: boolean;
  enableDiagnosticsLogging: boolean;
}

export interface AppConfig {
  appId: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.card-viewer",
  featureFlags: {
    enableDebugPanel: false,
    enableDiagnosticsLogging: true,
  },
};

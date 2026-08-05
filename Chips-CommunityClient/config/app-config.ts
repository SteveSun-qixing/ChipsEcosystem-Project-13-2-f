export interface AppFeatureFlags {
  enableDebugPanel: boolean;
  enableDiagnosticsLogging: boolean;
}

export interface AppConfig {
  appId: string;
  defaultSceneId: string;
  communityServerUrl: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.community-client",
  defaultSceneId: "main",
  communityServerUrl: "https://www.chipscard.space",
  featureFlags: {
    enableDebugPanel: false,
    enableDiagnosticsLogging: true,
  },
};

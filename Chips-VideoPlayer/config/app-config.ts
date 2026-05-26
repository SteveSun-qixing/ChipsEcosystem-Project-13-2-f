export interface AppFeatureFlags {
  enableDiagnosticsLogging: boolean;
}

export interface AppConfig {
  appId: string;
  defaultSceneId: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.video-player",
  defaultSceneId: "video-player.main",
  featureFlags: {
    enableDiagnosticsLogging: false,
  },
};

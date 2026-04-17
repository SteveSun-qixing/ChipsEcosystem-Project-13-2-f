export interface AppFeatureFlags {
  enableDiagnosticsLogging: boolean;
}

export interface AppConfig {
  appId: string;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.video-player",
  featureFlags: {
    enableDiagnosticsLogging: false,
  },
};

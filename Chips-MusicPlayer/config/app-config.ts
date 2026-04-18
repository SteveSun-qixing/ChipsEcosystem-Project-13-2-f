export interface AppFeatureFlags {
  enableDiagnosticsLogging: boolean;
}

export interface AppConfig {
  appId: string;
  defaultLoopMode: "off" | "one";
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.music-player",
  defaultLoopMode: "one",
  featureFlags: {
    enableDiagnosticsLogging: false,
  },
};

import type { ReaderPreferences } from "../src/utils/book-reader";

export interface AppFeatureFlags {
  enableDiagnosticsLogging: boolean;
}

export interface AppConfig {
  appId: string;
  defaultSceneId: string;
  defaultPreferences: ReaderPreferences;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.book-reader",
  defaultSceneId: "book-reader.main",
  defaultPreferences: {
    fontScale: 1,
    contentWidth: 760,
    fontFamily: "serif",
    readingMode: "paginated",
    backgroundTone: "theme",
  },
  featureFlags: {
    enableDiagnosticsLogging: false,
  },
};

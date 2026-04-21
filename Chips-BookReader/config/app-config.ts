import type { ReaderPreferences } from "../src/utils/book-reader";

export interface AppFeatureFlags {
  enableDiagnosticsLogging: boolean;
}

export interface AppConfig {
  appId: string;
  defaultPreferences: ReaderPreferences;
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.book-reader",
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

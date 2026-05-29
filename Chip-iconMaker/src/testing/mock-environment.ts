import {
  createMockChipsClient,
  createMockLaunchContext,
  createMockSurfaceContext,
  type MockChipsClient,
} from "chips-sdk/testing";
import { appConfig } from "../../config/app-config";
import { defaultThemeState } from "../theme/theme-runtime";

export const appMockSurfaceContext = createMockSurfaceContext({
  pluginId: appConfig.appId,
  sceneId: appConfig.defaultSceneId,
  kind: "window",
  presentation: {
    title: "Chip IconMaker",
    width: 1024,
    height: 720,
  },
});

export const appMockLaunchContext = createMockLaunchContext({
  pluginId: appConfig.appId,
  sceneId: appConfig.defaultSceneId,
  surfaceContext: appMockSurfaceContext,
});

export function createAppMockClient(): MockChipsClient {
  return createMockChipsClient({
    theme: {
      themeId: defaultThemeState.themeId,
      displayName: defaultThemeState.displayName,
      version: defaultThemeState.version,
    },
    locale: "zh-CN",
    launchContext: appMockLaunchContext,
    surfaceContext: appMockSurfaceContext,
    permissions: [
      "theme.read",
      "i18n.read",
      "i18n.write",
      "command.read",
      "command.write",
      "command.invoke",
      "cli.task",
      "file.read",
      "file.write",
      "log.write",
    ],
  });
}

export function createAppPreviewMockClient(): MockChipsClient {
  return createMockChipsClient({
    installBridge: false,
    theme: {
      themeId: defaultThemeState.themeId,
      displayName: defaultThemeState.displayName,
      version: defaultThemeState.version,
    },
    locale: "zh-CN",
    launchContext: appMockLaunchContext,
    surfaceContext: appMockSurfaceContext,
    permissions: [
      "theme.read",
      "i18n.read",
      "i18n.write",
      "command.read",
      "command.write",
      "command.invoke",
      "cli.task",
      "file.read",
      "file.write",
      "log.write",
    ],
  });
}

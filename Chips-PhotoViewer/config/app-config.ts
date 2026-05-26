export interface AppFeatureFlags {
  enableDebugPanel: boolean;
}

export interface AppConfig {
  appId: string;
  defaultSceneId: string;
  defaultPresentation: {
    title: string;
    width: number;
    height: number;
    resizable: boolean;
  };
  featureFlags: AppFeatureFlags;
}

export const appConfig: AppConfig = {
  appId: "com.chips.photo-viewer",
  defaultSceneId: "photo-viewer.scene.main",
  defaultPresentation: {
    title: "图片查看器",
    width: 1024,
    height: 720,
    resizable: true,
  },
  featureFlags: {
    enableDebugPanel: false,
  },
};

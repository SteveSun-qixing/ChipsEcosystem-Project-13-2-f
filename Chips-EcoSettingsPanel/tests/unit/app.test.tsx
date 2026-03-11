import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/app/providers/RuntimeProvider", () => ({
  RuntimeProvider({ children }: React.PropsWithChildren) {
    return <>{children}</>;
  },
  useRuntimeContext() {
    return {
      currentLocale: "zh-CN",
      currentTheme: {
        themeId: "chips-official.default-theme",
        displayName: "薯片官方 · 默认主题",
        version: "1.0.0",
      },
      eventSource: {
        subscribe() {
          return () => undefined;
        },
      },
      ready: true,
      runtimeError: null,
      refreshRuntimeState: async () => undefined,
    };
  },
}));

vi.mock("../../src/app/providers/I18nProvider", () => ({
  I18nProvider({ children }: React.PropsWithChildren) {
    return <>{children}</>;
  },
  useI18n() {
    return {
      t(key: string) {
        return key;
      },
    };
  },
}));

describe("App (标准应用插件根组件)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("应当导出一个可用的 React 组件", async () => {
    const { App } = await import("../../src/App");
    expect(App).toBeTypeOf("function");
  });

  it("渲染桌面导航和窄屏菜单切换器结构", async () => {
    const { App } = await import("../../src/App");
    const markup = renderToStaticMarkup(<App />);

    expect(markup).not.toContain("settings-titlebar");
    expect(markup).toContain("settings-sidebar__nav");
    expect(markup).toContain("settings-mobile-nav");
    expect(markup).toContain("settingsPanel.menu.mobileLabel");
    expect(markup).toContain("settingsPanel.menu.themes.title");
    expect(markup).not.toContain("settings-sidebar__runtime");
  });
});

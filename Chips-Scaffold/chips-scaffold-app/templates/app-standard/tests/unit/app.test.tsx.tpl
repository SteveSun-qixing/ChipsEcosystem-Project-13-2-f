import { describe, it, expect } from "vitest";
import { createChipsI18nText } from "@chips/component-library";
import { App } from "../../src/App";
import { AppRoot } from "../../src/app/AppRoot";
import { sceneDefinitions } from "../../src/app/scene-registry";
import { localeBundles, supportedLocales, translateLocalKey } from "../../src/i18n/locales";
import { createAppMockClient } from "../../src/testing/mock-environment";
import { renderWithChips } from "../../src/testing/render-with-chips";

describe("App (标准应用插件根组件)", () => {
  it("应当导出一个可用的 React 组件", () => {
    expect(App).toBeTypeOf("function");
    expect(App).toBe(AppRoot);
  });

  it("应通过同步 i18n adapter 解析当前语言、fallback 与参数插值", () => {
    expect(supportedLocales).toEqual(["zh-CN", "en-US"]);

    const zhText = createChipsI18nText({
      bundles: localeBundles,
      locale: "zh-CN",
      fallbackLocale: "en-US",
      defaultLocale: "zh-CN",
    });
    const missingLocaleText = createChipsI18nText({
      bundles: localeBundles,
      locale: "fr-FR",
      fallbackLocale: "en-US",
      defaultLocale: "zh-CN",
    });

    expect(zhText("app.shell.languageSwitch", { locale: "en-US" })).toBe("切换到 en-US");
    expect(missingLocaleText("app.shell.subtitle")).toBe("App workspace");
    expect(translateLocalKey("app.commands.openWorkspace.title", "zh-CN")).toBe("打开工作区");
    expect(zhText("app.missing.key")).toBe("app.missing.key");
  });

  it("应提供场景注册表与 Host mock 渲染外壳", () => {
    expect(sceneDefinitions.map((scene) => scene.id)).toEqual(["main", "settings"]);

    const client = createAppMockClient();
    expect(client.state.launchContext.sceneId).toBe("main");
    expect(client.state.permissions).toContain("command.invoke");
    client.restoreBridge();

    const rendered = renderWithChips(<App />);
    expect(rendered.element).toBeTruthy();
    expect(rendered.client.state.launchContext.surfaceContext?.sceneId).toBe("main");
    rendered.client.restoreBridge();
  });
});

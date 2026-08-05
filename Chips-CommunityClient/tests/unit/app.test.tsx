import { describe, it, expect } from "vitest";
import { createChipsI18nText, type ChipsLaunchContext, type ChipsSurfaceContext } from "@chips/component-library";
import { App } from "../../src/App";
import { AppRoot } from "../../src/app/AppRoot";
import {
  createRuntimeDiagnostic,
  resolveRuntimeSceneId,
} from "../../src/app/AppRuntimeProvider";
import { sceneDefinitions } from "../../src/app/scene-registry";
import { localeBundles, supportedLocales, translateLocalKey } from "../../src/i18n/locales";
import { createAppMockClient } from "../../src/testing/mock-environment";
import { renderWithChips } from "../../src/testing/render-with-chips";

describe("App (社区客户端根组件)", () => {
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

    expect(zhText("brand.name")).toBe("薯片社区");
    expect(zhText("app.shell.languageSwitch", { locale: "en-US" })).toBe("切换到 en-US");
    expect(missingLocaleText("app.shell.subtitle")).toBe("Community client");
    expect(translateLocalKey("app.commands.openWorkspace.title", "zh-CN")).toBe("打开工作区");
    expect(translateLocalKey("card.viewFailed", "zh-CN")).toBe("打开本地查看器失败：{message}");
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

  it("应从 surface / launch context 解析运行时场景和诊断对象", () => {
    const client = createAppMockClient();
    expect(
      resolveRuntimeSceneId(
        (client.state.launchContext.surfaceContext ?? null) as unknown as ChipsSurfaceContext | null,
        client.state.launchContext as unknown as ChipsLaunchContext,
      ),
    ).toBe("main");

    const diagnostic = createRuntimeDiagnostic(
      "APP_RUNTIME_TEST",
      "Runtime test diagnostic.",
      "test",
      { sceneId: "main" },
    );
    expect(diagnostic).toMatchObject({
      code: "APP_RUNTIME_TEST",
      source: "test",
      details: { sceneId: "main" },
    });
    client.restoreBridge();
  });
});

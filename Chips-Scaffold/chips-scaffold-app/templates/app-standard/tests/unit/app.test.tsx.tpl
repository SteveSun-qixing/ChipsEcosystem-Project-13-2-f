import { describe, it, expect } from "vitest";
import { createChipsI18nText } from "@chips/component-library";
import { App } from "../../src/App";
import { localeBundles, supportedLocales } from "../../src/i18n/locales";

describe("App (标准应用插件根组件)", () => {
  it("应当导出一个可用的 React 组件", () => {
    expect(App).toBeTypeOf("function");
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

    expect(zhText("app-standard.language.switchTo", { locale: "en-US" })).toBe("切换到 en-US");
    expect(missingLocaleText("app-standard.shell.subtitle")).toBe("Standard app plugin");
    expect(zhText("app-standard.missing.key")).toBe("app-standard.missing.key");
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, formatMessage, getSupportedLocales, resolveLocale } from "../../src/shared/i18n/messages";

describe("i18n messages", () => {
  it("falls back to the default locale when an unsupported locale is requested", () => {
    expect(resolveLocale("fr-FR")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it("formats localized messages with parameter substitution", () => {
    expect(
      formatMessage("zh-CN", "settingsPanel.themes.feedback.switchSuccess", {
        name: "暗夜主题",
      }),
    ).toBe("已切换到 暗夜主题。");
  });

  it("returns key placeholders for missing messages", () => {
    expect(formatMessage("en-US", "settingsPanel.missing.key")).toBe("[[settingsPanel.missing.key]]");
  });

  it("exposes the supported locale list", () => {
    expect(getSupportedLocales()).toEqual(["zh-CN", "en-US"]);
  });
});

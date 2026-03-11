import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/app/providers/I18nProvider", () => ({
  useI18n() {
    return {
      t(key: string, params?: Record<string, string | number>) {
        if (!params) {
          return key;
        }
        return `${key}:${JSON.stringify(params)}`;
      },
    };
  },
}));

vi.mock("../../src/features/themes/useThemeGovernance", () => ({
  useThemeGovernance() {
    return {
      themes: [
        {
          pluginId: "theme.demo",
          themeId: "chips.theme-demo",
          displayName: "Theme Demo",
          version: "1.0.0",
          installed: true,
          enabled: true,
          current: false,
          installPath: "/themes/demo",
          installedAt: 1,
          publisher: "Chips",
          isDefault: false,
        },
      ],
      loading: false,
      error: null,
      searchTerm: "",
      setSearchTerm: () => undefined,
      activeActionId: null,
      installWithFilePicker: () => undefined,
      installFromDroppedFiles: async () => undefined,
      applyTheme: async () => undefined,
      uninstallTheme: async () => undefined,
      refresh: async () => undefined,
      feedback: [],
      dismissFeedback: () => undefined,
      dropActive: false,
      setDropActive: () => undefined,
    };
  },
}));

describe("ThemePage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders themes in a formal list with detail action", async () => {
    const { ThemePage } = await import("../../src/features/themes/ThemePage");
    const markup = renderToStaticMarkup(<ThemePage />);

    expect(markup).toContain("governance-list");
    expect(markup).toContain("settingsPanel.themes.columns.theme");
    expect(markup).toContain("settingsPanel.common.details");
    expect(markup).toContain("chips.theme-demo");
  });
});

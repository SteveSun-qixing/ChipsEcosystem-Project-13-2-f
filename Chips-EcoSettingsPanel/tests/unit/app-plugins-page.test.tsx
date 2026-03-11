import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/app/providers/I18nProvider", () => ({
  useI18n() {
    return {
      t(key: string) {
        return key;
      },
    };
  },
}));

vi.mock("../../src/features/app-plugins/useAppPluginGovernance", () => ({
  useAppPluginGovernance() {
    return {
      plugins: [
        {
          pluginId: "com.chips.eco-settings-panel",
          name: "Eco Settings Panel",
          description: "self",
          version: "0.1.0",
          enabled: true,
          selfManaged: true,
          installPath: "/plugins/settings",
          installedAt: 1,
          capabilities: ["settings"],
        },
      ],
      loading: false,
      error: null,
      activeActionId: null,
      searchTerm: "",
      setSearchTerm: () => undefined,
      installWithFilePicker: () => undefined,
      installFromDroppedFiles: async () => undefined,
      togglePluginEnabled: async () => undefined,
      uninstallPlugin: async () => undefined,
      refresh: async () => undefined,
      feedback: [],
      dismissFeedback: () => undefined,
      dropActive: false,
      setDropActive: () => undefined,
    };
  },
}));

describe("AppPluginsPage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders self-managed plugin safeguards", async () => {
    const { AppPluginsPage } = await import("../../src/features/app-plugins/AppPluginsPage");
    const markup = renderToStaticMarkup(<AppPluginsPage />);

    expect(markup).toContain("governance-list");
    expect(markup).toContain("settingsPanel.appPlugins.badges.currentApp");
    expect(markup).toContain("settingsPanel.appPlugins.selfManaged.description");
    expect(markup).toContain("disabled");
    expect(markup).toContain("settingsPanel.common.details");
    expect(markup).toContain("settingsPanel.appPlugins.actions.disable");
    expect(markup).toContain("settingsPanel.appPlugins.actions.uninstall");
  });
});

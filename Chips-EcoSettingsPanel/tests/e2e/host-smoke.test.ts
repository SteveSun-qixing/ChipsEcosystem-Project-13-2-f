import { afterEach, describe, expect, it } from "vitest";
import type { MockChipsClient } from "chips-sdk";
import { settingsCommandDefinitions } from "../../src/commands/settings-commands";
import { SettingsRuntimeService } from "../../src/shared/runtime/settings-runtime-service";
import { createSettingsMockClient } from "../support/settings-host";

describe("设置面板 Host mock smoke", () => {
  const clients: MockChipsClient[] = [];

  afterEach(() => {
    for (const client of clients.splice(0)) {
      client.restoreBridge();
    }
  });

  function track(client: MockChipsClient): MockChipsClient {
    clients.push(client);
    return client;
  }

  it("exercises the formal SDK/Bridge action sequence used by the migrated settings panel", async () => {
    const client = track(createSettingsMockClient());
    const service = new SettingsRuntimeService(client);
    const observedEvents: string[] = [];
    const offTheme = client.mockHost.events.on("theme.changed", () => {
      observedEvents.push("theme.changed");
    });
    const offLanguage = client.mockHost.events.on("language.changed", () => {
      observedEvents.push("language.changed");
    });

    for (const definition of settingsCommandDefinitions) {
      await client.command.register(definition);
    }

    await service.listThemes();
    await service.applyTheme("chips-official.default-dark-theme");
    await service.getThemeContract();
    await service.resolveThemeDiagnostics([]);
    await service.listLanguages("zh-CN");
    await service.setCurrentLocale("en-US");
    await service.listAppPlugins();
    await service.openPluginFileDialog("app", {
      title: "Install app plugin",
      filterName: "Plugin package",
    });
    await service.createPluginShortcut("app.viewer", true);
    await service.removePluginShortcut("app.viewer");
    await service.revealPath("/shortcuts/app.viewer");
    await client.command.invoke(settingsCommandDefinitions[0].commandId, {}, { source: "palette" });

    offTheme();
    offLanguage();

    expect(observedEvents).toEqual(["theme.changed", "language.changed"]);
    expect(client.calls.map((call) => call.action)).toEqual([
      ...settingsCommandDefinitions.map(() => "command.register"),
      "plugin.query",
      "theme.list",
      "theme.getCurrent",
      "theme.apply",
      "theme.contract.get",
      "theme.resolve",
      "i18n.listLocales",
      "i18n.getCurrent",
      "i18n.setCurrent",
      "plugin.query",
      "plugin.getShortcut",
      "platform.dialogOpenFile",
      "plugin.createShortcut",
      "plugin.removeShortcut",
      "platform.shellShowItemInFolder",
      "command.invoke",
    ]);
  });
});

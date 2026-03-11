import { describe, expect, it, vi } from "vitest";
import type { Client } from "chips-sdk";
import { appConfig } from "../../config/app-config";
import { SettingsRuntimeService } from "../../src/shared/runtime/settings-runtime-service";

function createClientMock(): Client {
  return {
    invoke: vi.fn(),
    events: {
      on: vi.fn(() => () => undefined),
      once: vi.fn(),
      emit: vi.fn(),
    },
    theme: {
      list: vi.fn(),
      getCurrent: vi.fn(),
      apply: vi.fn(),
      getAllCss: vi.fn(),
      contract: { get: vi.fn() },
      resolve: vi.fn(),
    },
    i18n: {
      getCurrent: vi.fn(),
      setCurrent: vi.fn(),
      translate: vi.fn(),
      listLocales: vi.fn(),
    },
    plugin: {
      query: vi.fn(),
      install: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      uninstall: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      getSelf: vi.fn(),
      getCardPlugin: vi.fn(),
      getLayoutPlugin: vi.fn(),
    },
    platform: {
      getInfo: vi.fn(),
      getCapabilities: vi.fn(),
      openExternal: vi.fn(),
      getPathForFile: vi.fn(() => ""),
    },
    file: {} as Client["file"],
    card: {} as Client["card"],
    config: {} as Client["config"],
    module: {} as Client["module"],
    window: {} as Client["window"],
    box: {} as Client["box"],
    resource: {} as Client["resource"],
    clientConfig: {},
  } as unknown as Client;
}

describe("SettingsRuntimeService", () => {
  it("merges installed, enabled, and current theme records into governance view models", async () => {
    const client = createClientMock();
    vi.mocked(client.plugin.query).mockResolvedValue([
      {
        id: "theme.current",
        type: "theme",
        name: "Current Theme",
        version: "1.0.0",
        installPath: "/plugins/current",
        installedAt: 20,
        enabled: true,
        capabilities: [],
        theme: {
          themeId: "chips.current",
          displayName: "Current Theme",
          publisher: "Chips",
          isDefault: true,
        },
      },
      {
        id: "theme.enabled",
        type: "theme",
        name: "Enabled Theme",
        version: "1.1.0",
        installPath: "/plugins/enabled",
        installedAt: 10,
        enabled: true,
        capabilities: [],
        theme: {
          themeId: "chips.enabled",
          displayName: "Enabled Theme",
          publisher: "Chips",
          isDefault: false,
        },
      },
      {
        id: "theme.disabled",
        type: "theme",
        name: "Disabled Theme",
        version: "0.9.0",
        installPath: "/plugins/disabled",
        installedAt: 30,
        enabled: false,
        capabilities: [],
        theme: {
          themeId: "chips.disabled",
          displayName: "Disabled Theme",
          publisher: "Archive",
          isDefault: false,
        },
      },
    ] as never);
    vi.mocked(client.theme.list).mockResolvedValue([
      { id: "chips.current", displayName: "Current Theme", version: "1.0.0", isDefault: true },
      { id: "chips.enabled", displayName: "Enabled Theme", version: "1.1.0", isDefault: false },
    ] as never);
    vi.mocked(client.theme.getCurrent).mockResolvedValue({
      themeId: "chips.current",
      displayName: "Current Theme",
      version: "1.0.0",
    } as never);

    const service = new SettingsRuntimeService(client);
    const themes = await service.listThemes();

    expect(themes.map((theme) => theme.themeId)).toEqual(["chips.current", "chips.enabled", "chips.disabled"]);
    expect(themes[0]).toMatchObject({
      pluginId: "theme.current",
      current: true,
      enabled: true,
      isDefault: true,
      publisher: "Chips",
    });
    expect(themes[1]).toMatchObject({
      pluginId: "theme.enabled",
      current: false,
      enabled: true,
    });
    expect(themes[2]).toMatchObject({
      pluginId: "theme.disabled",
      current: false,
      enabled: false,
    });
  });

  it("builds localized language governance records", async () => {
    const client = createClientMock();
    vi.mocked(client.i18n.listLocales).mockResolvedValue(["zh-CN", "en-US"]);
    vi.mocked(client.i18n.getCurrent).mockResolvedValue("en-US");

    const service = new SettingsRuntimeService(client);
    const languages = await service.listLanguages("zh-CN");

    expect(languages).toHaveLength(2);
    expect(languages[0]).toMatchObject({
      locale: "zh-CN",
      current: false,
    });
    expect(languages[1]).toMatchObject({
      locale: "en-US",
      current: true,
    });
    expect(languages[0].displayName.length).toBeGreaterThan(0);
    expect(languages[1].nativeName.length).toBeGreaterThan(0);
  });

  it("sorts enabled app plugins ahead of disabled ones", async () => {
    const client = createClientMock();
    vi.mocked(client.plugin.query).mockResolvedValue([
      {
        id: appConfig.appId,
        type: "app",
        name: "Eco Settings Panel",
        version: "2.1.0",
        description: "Current app",
        enabled: true,
        installPath: "/plugins/settings",
        installedAt: 4,
        capabilities: ["settings"],
      },
      {
        id: "app.disabled",
        type: "app",
        name: "Beta Tools",
        version: "1.0.0",
        description: "Disabled",
        enabled: false,
        installPath: "/plugins/beta",
        installedAt: 1,
        capabilities: ["beta"],
      },
      {
        id: "app.enabled",
        type: "app",
        name: "Alpha Tools",
        version: "2.0.0",
        description: "Enabled",
        enabled: true,
        installPath: "/plugins/alpha",
        installedAt: 2,
        capabilities: ["alpha"],
      },
    ] as never);

    const service = new SettingsRuntimeService(client);
    const plugins = await service.listAppPlugins();

    expect(plugins.map((plugin) => plugin.pluginId)).toEqual(["app.enabled", appConfig.appId, "app.disabled"]);
    expect(plugins[0]).toMatchObject({
      pluginId: "app.enabled",
      selfManaged: false,
      capabilities: ["alpha"],
    });
    expect(plugins[1]).toMatchObject({
      pluginId: appConfig.appId,
      selfManaged: true,
      capabilities: ["settings"],
    });
    expect(plugins[2]).toMatchObject({
      pluginId: "app.disabled",
      selfManaged: false,
      capabilities: ["beta"],
    });
  });

  it("opens the plugin file dialog through the formal Host action", async () => {
    const client = createClientMock();
    vi.mocked(client.invoke).mockResolvedValue({
      filePaths: ["/packages/demo.cpk"],
    });

    const service = new SettingsRuntimeService(client);
    const paths = await service.openPluginFileDialog("theme", {
      title: "Install theme package",
      filterName: "Theme package",
    });

    expect(paths).toEqual(["/packages/demo.cpk"]);
    expect(client.invoke).toHaveBeenCalledWith("platform.dialogOpenFile", {
      options: {
        title: "Install theme package",
        properties: ["openFile", "openDirectory"],
        filters: [
          {
            name: "Theme package",
            extensions: ["cpk", "yaml", "yml", "json"],
          },
        ],
      },
    });
  });
});

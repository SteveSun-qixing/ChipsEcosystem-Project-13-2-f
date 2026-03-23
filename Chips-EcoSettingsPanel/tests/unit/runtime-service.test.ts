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
      launch: vi.fn(),
      getShortcut: vi.fn(),
      createShortcut: vi.fn(),
      removeShortcut: vi.fn(),
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

  it("enables a theme immediately after installation", async () => {
    const client = createClientMock();
    vi.mocked(client.plugin.install).mockResolvedValue({
      pluginId: "theme.demo",
      installPath: "/themes/demo",
    } as never);

    const service = new SettingsRuntimeService(client);
    await service.installTheme("/packages/theme-demo.cpk");

    expect(client.plugin.install).toHaveBeenCalledWith("/packages/theme-demo.cpk");
    expect(client.plugin.enable).toHaveBeenCalledWith("theme.demo");
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
    vi.mocked(client.plugin.getShortcut).mockImplementation(async (pluginId: string) => ({
      pluginId,
      name: String(pluginId),
      location: "desktop",
      launcherPath: `/shortcuts/${pluginId}.lnk`,
      executablePath: "/Applications/Chips Host",
      args: [`--chips-launch-plugin=${pluginId}`],
      exists: pluginId !== "app.disabled",
    }));

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

  it("lists governed card plugins through the formal runtime query", async () => {
    const client = createClientMock();
    vi.mocked(client.plugin.query).mockResolvedValue([
      {
        id: "chips.basecard.richtext",
        type: "card",
        name: "RichText",
        version: "1.0.0",
        description: "Rich text card",
        enabled: true,
        installPath: "/plugins/richtext",
        installedAt: 2,
        capabilities: ["base.richtext", "RichTextCard"],
      },
      {
        id: "chips.basecard.image",
        type: "card",
        name: "Image",
        version: "1.0.0",
        description: "Image card",
        enabled: false,
        installPath: "/plugins/image",
        installedAt: 1,
        capabilities: ["base.image", "ImageCard"],
      },
    ] as never);

    const service = new SettingsRuntimeService(client);
    const plugins = await service.listPlugins("card");

    expect(client.plugin.query).toHaveBeenCalledWith({ type: "card" });
    expect(plugins.map((plugin) => plugin.pluginId)).toEqual([
      "chips.basecard.richtext",
      "chips.basecard.image",
    ]);
    expect(plugins[0]).toMatchObject({
      pluginId: "chips.basecard.richtext",
      type: "card",
      enabled: true,
      cardTypes: ["base.richtext", "RichTextCard"],
    });
  });

  it("validates the installed plugin type before accepting the package", async () => {
    const client = createClientMock();
    vi.mocked(client.plugin.install).mockResolvedValue({
      pluginId: "chips.basecard.image",
      installPath: "/plugins/image",
    } as never);
    vi.mocked(client.plugin.get).mockResolvedValue({
      id: "chips.basecard.image",
      type: "card",
      name: "Image",
      version: "1.0.0",
      enabled: false,
      installPath: "/plugins/image",
      installedAt: 1,
      capabilities: ["base.image"],
    } as never);

    const service = new SettingsRuntimeService(client);
    await service.installPluginOfType("/packages/image-plugin.cpk", "card");

    expect(client.plugin.install).toHaveBeenCalledWith("/packages/image-plugin.cpk");
    expect(client.plugin.get).toHaveBeenCalledWith("chips.basecard.image");
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

  it("launches app plugins through the formal Host route", async () => {
    const client = createClientMock();
    vi.mocked(client.plugin.launch).mockResolvedValue({
      window: { id: "window-1" },
      session: {
        sessionId: "session-1",
        sessionNonce: "nonce-1",
        permissions: [],
      },
    } as never);

    const service = new SettingsRuntimeService(client);
    await service.launchPlugin("app.viewer");

    expect(client.plugin.launch).toHaveBeenCalledWith("app.viewer", {});
  });
});

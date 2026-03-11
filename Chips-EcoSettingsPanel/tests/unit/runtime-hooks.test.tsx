// @vitest-environment jsdom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppPluginGovernanceRecord } from "../../src/shared/runtime/settings-runtime-service";
import type { FeedbackItem } from "../../src/shared/ui/NotificationStack";

type EventHandler = (payload?: unknown) => void | Promise<void>;

const eventHandlers = new Map<string, EventHandler[]>();
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let runtimeContextMock = createRuntimeContextMock();
let i18nMock = createI18nMock();
let serviceMock = createServiceMock();

vi.mock("../../src/app/providers/RuntimeProvider", () => ({
  useRuntimeContext() {
    return runtimeContextMock;
  },
}));

vi.mock("../../src/app/providers/I18nProvider", () => ({
  useI18n() {
    return i18nMock;
  },
}));

vi.mock("../../src/shared/runtime/settings-runtime-service", () => ({
  getSettingsRuntimeService() {
    return serviceMock;
  },
}));

function createRuntimeContextMock() {
  return {
    client: {
      events: {
        on: vi.fn((eventName: string, handler: EventHandler) => {
          const handlers = eventHandlers.get(eventName) ?? [];
          handlers.push(handler);
          eventHandlers.set(eventName, handlers);
          return () => {
            const currentHandlers = eventHandlers.get(eventName) ?? [];
            eventHandlers.set(
              eventName,
              currentHandlers.filter((currentHandler) => currentHandler !== handler),
            );
          };
        }),
      },
    },
    eventSource: {
      subscribe() {
        return () => undefined;
      },
    },
    currentTheme: null,
    currentLocale: "zh-CN",
    ready: true,
    runtimeError: null,
    refreshRuntimeState: async () => undefined,
  };
}

function createI18nMock() {
  return {
    locale: "zh-CN",
    t(key: string, params?: Record<string, string | number>) {
      if (!params) {
        return key;
      }
      return `${key}:${JSON.stringify(params)}`;
    },
  };
}

function createServiceMock() {
  return {
    listThemes: vi.fn(),
    installTheme: vi.fn(),
    applyTheme: vi.fn(),
    uninstallPlugin: vi.fn(),
    listLanguages: vi.fn(),
    setCurrentLocale: vi.fn(),
    listAppPlugins: vi.fn(),
    installAppPlugin: vi.fn(),
    enablePlugin: vi.fn(),
    disablePlugin: vi.fn(),
    openPluginFileDialog: vi.fn(),
    getPathForFile: vi.fn(),
    showConfirm: vi.fn(),
    showMessage: vi.fn(),
  };
}

function resetHarnessMocks(): void {
  eventHandlers.clear();
  runtimeContextMock = createRuntimeContextMock();
  i18nMock = createI18nMock();
  serviceMock = createServiceMock();
}

async function flushReact(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function emitEvent(eventName: string, payload?: unknown): Promise<void> {
  await React.act(async () => {
    const handlers = [...(eventHandlers.get(eventName) ?? [])];
    for (const handler of handlers) {
      await handler(payload);
    }
    await flushReact();
  });
}

function createRenderer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    async render(element: React.ReactElement): Promise<void> {
      await React.act(async () => {
        root.render(element);
        await flushReact();
      });
    },
    unmount(): void {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("runtime hooks", () => {
  let renderer: ReturnType<typeof createRenderer> | null = null;

  beforeEach(() => {
    resetHarnessMocks();
  });

  afterEach(() => {
    renderer?.unmount();
    renderer = null;
    vi.clearAllMocks();
  });

  it("keeps host refresh subscriptions stable across rerenders and still calls the latest refresh handler", async () => {
    const { useHostRefresh } = await import("../../src/shared/hooks/useHostRefresh");
    const refreshLabels: string[] = [];

    function Harness({ label }: { label: string }) {
      const refresh = React.useCallback(async () => {
        refreshLabels.push(label);
      }, [label]);

      useHostRefresh(["theme.changed", "plugin.installed"], refresh);
      return <div>{label}</div>;
    }

    renderer = createRenderer();
    await renderer.render(<Harness label="first" />);

    expect(runtimeContextMock.client.events.on).toHaveBeenCalledTimes(2);

    await renderer.render(<Harness label="second" />);

    expect(runtimeContextMock.client.events.on).toHaveBeenCalledTimes(2);

    await emitEvent("theme.changed");

    expect(refreshLabels).toEqual(["second"]);
  });

  it("refreshes theme governance state when Host emits theme.changed", async () => {
    const { useThemeGovernance } = await import("../../src/features/themes/useThemeGovernance");
    serviceMock.listThemes
      .mockResolvedValueOnce([
        {
          pluginId: "theme.before",
          themeId: "theme.before",
          displayName: "Before Theme",
          version: "1.0.0",
          installed: true,
          enabled: true,
          current: true,
          installPath: "/themes/before",
          installedAt: 1,
          isDefault: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          pluginId: "theme.after",
          themeId: "theme.after",
          displayName: "After Theme",
          version: "2.0.0",
          installed: true,
          enabled: true,
          current: true,
          installPath: "/themes/after",
          installedAt: 2,
          isDefault: false,
        },
      ]);

    let latestState: {
      themes: Array<{ themeId: string }>;
    } = {
      themes: [],
    };

    function Harness() {
      latestState = useThemeGovernance();
      return null;
    }

    renderer = createRenderer();
    await renderer.render(<Harness />);

    expect(serviceMock.listThemes).toHaveBeenCalledTimes(1);
    expect(latestState.themes.map((theme: { themeId: string }) => theme.themeId)).toEqual(["theme.before"]);

    await emitEvent("theme.changed");

    expect(serviceMock.listThemes).toHaveBeenCalledTimes(2);
    expect(latestState.themes.map((theme: { themeId: string }) => theme.themeId)).toEqual(["theme.after"]);
  });

  it("refreshes language governance state when Host emits language.changed", async () => {
    const { useLanguageGovernance } = await import("../../src/features/languages/useLanguageGovernance");
    serviceMock.listLanguages
      .mockResolvedValueOnce([
        { locale: "zh-CN", displayName: "中文", nativeName: "中文", current: true },
        { locale: "en-US", displayName: "英文", nativeName: "English", current: false },
      ])
      .mockResolvedValueOnce([
        { locale: "zh-CN", displayName: "中文", nativeName: "中文", current: false },
        { locale: "en-US", displayName: "英文", nativeName: "English", current: true },
      ]);

    let latestState: {
      languages: Array<{ locale: string; current: boolean }>;
    } = {
      languages: [],
    };

    function Harness() {
      latestState = useLanguageGovernance();
      return null;
    }

    renderer = createRenderer();
    await renderer.render(<Harness />);

    expect(serviceMock.listLanguages).toHaveBeenCalledWith("zh-CN");
    expect(
      latestState.languages.find((language: { locale: string; current: boolean }) => language.locale === "zh-CN")
        ?.current,
    ).toBe(true);

    await emitEvent("language.changed", { locale: "en-US" });

    expect(serviceMock.listLanguages).toHaveBeenCalledTimes(2);
    expect(
      latestState.languages.find((language: { locale: string; current: boolean }) => language.locale === "en-US")
        ?.current,
    ).toBe(true);
  });

  it("refreshes app plugin governance state when Host emits plugin.disabled", async () => {
    const { useAppPluginGovernance } = await import("../../src/features/app-plugins/useAppPluginGovernance");
    serviceMock.listAppPlugins
      .mockResolvedValueOnce([
        {
          pluginId: "plugin.example",
          name: "Example Plugin",
          description: "Enabled",
          version: "1.0.0",
          enabled: true,
          selfManaged: false,
          installPath: "/plugins/example",
          installedAt: 1,
          capabilities: ["demo"],
        },
      ])
      .mockResolvedValueOnce([
        {
          pluginId: "plugin.example",
          name: "Example Plugin",
          description: "Disabled",
          version: "1.0.0",
          enabled: false,
          selfManaged: false,
          installPath: "/plugins/example",
          installedAt: 1,
          capabilities: ["demo"],
        },
      ]);

    let latestState: {
      plugins: Array<{ enabled: boolean }>;
    } = {
      plugins: [],
    };

    function Harness() {
      latestState = useAppPluginGovernance();
      return null;
    }

    renderer = createRenderer();
    await renderer.render(<Harness />);

    expect(serviceMock.listAppPlugins).toHaveBeenCalledTimes(1);
    expect(latestState.plugins[0]?.enabled).toBe(true);

    await emitEvent("plugin.disabled", { pluginId: "plugin.example" });

    expect(serviceMock.listAppPlugins).toHaveBeenCalledTimes(2);
    expect(latestState.plugins[0]?.enabled).toBe(false);
  });

  it("blocks self-managed app plugin actions at the hook layer", async () => {
    const { useAppPluginGovernance } = await import("../../src/features/app-plugins/useAppPluginGovernance");

    serviceMock.listAppPlugins.mockResolvedValue([
      {
        pluginId: "com.chips.eco-settings-panel",
        name: "Eco Settings Panel",
        description: "Self managed",
        version: "0.1.0",
        enabled: true,
        selfManaged: true,
        installPath: "/plugins/settings",
        installedAt: 1,
        capabilities: ["settings"],
      },
    ]);

    let latestState: {
      plugins: AppPluginGovernanceRecord[];
      togglePluginEnabled: (plugin: AppPluginGovernanceRecord) => Promise<void>;
      uninstallPlugin: (plugin: AppPluginGovernanceRecord) => Promise<void>;
      feedback: FeedbackItem[];
    } = {
      plugins: [],
      togglePluginEnabled: async () => undefined,
      uninstallPlugin: async () => undefined,
      feedback: [],
    };

    function Harness() {
      latestState = useAppPluginGovernance();
      return null;
    }

    renderer = createRenderer();
    await renderer.render(<Harness />);

    const currentApp = latestState.plugins[0];
    expect(currentApp?.selfManaged).toBe(true);

    await React.act(async () => {
      await latestState.togglePluginEnabled(currentApp);
      await latestState.uninstallPlugin(currentApp);
      await flushReact();
    });

    expect(serviceMock.disablePlugin).not.toHaveBeenCalled();
    expect(serviceMock.enablePlugin).not.toHaveBeenCalled();
    expect(serviceMock.showConfirm).not.toHaveBeenCalled();
    expect(serviceMock.uninstallPlugin).not.toHaveBeenCalled();
    expect(latestState.feedback.map((item) => item.title)).toEqual([
      "settingsPanel.appPlugins.feedback.selfManagedBlockedTitle",
      "settingsPanel.appPlugins.feedback.selfManagedBlockedTitle",
    ]);
  });
});

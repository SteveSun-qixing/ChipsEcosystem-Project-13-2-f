import React from "react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  Client,
  CommandDefinitionInput,
  CommandChangedEvent,
  CommandState,
  CommandInvokedEvent,
  CommandInvokeOptions,
  CommandQueryOptions,
  CommandRegisteredEvent,
  CommandUnregisteredEvent,
  CommandView,
} from "chips-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

function createCommandClientMock(): Client {
  const commands = new Map<string, CommandView>();
  const invokedHandlers = new Set<(event: CommandInvokedEvent) => void>();

  return {
    command: {
      async register(definition: CommandDefinitionInput) {
        const command: CommandView = {
          ...definition,
          state: {
            enabled: true,
            visible: true,
            ...definition.state,
          },
          diagnostic: {
            visible: definition.state?.visible ?? true,
            enabled: definition.state?.enabled ?? true,
            checked: definition.state?.checked ?? false,
            hiddenReasonKey: definition.state?.hiddenReasonKey,
            disabledReasonKey: definition.state?.disabledReasonKey,
          },
        };
        commands.set(definition.commandId, command);
        return command;
      },
      async unregister(commandId: string) {
        commands.delete(commandId);
      },
      async get(commandId: string) {
        return commands.get(commandId);
      },
      async list(_options?: CommandQueryOptions) {
        return Array.from(commands.values());
      },
      async invoke(commandId: string, payload?: Record<string, unknown>, options?: CommandInvokeOptions) {
        const command = commands.get(commandId);
        const event = {
          invocationId: `test-${commandId}`,
          commandId,
          command,
          handlerId: command?.handlerId ?? "",
          source: options?.source ?? "api",
          payload,
        } as CommandInvokedEvent;
        invokedHandlers.forEach((handler) => handler(event));
        return { invocationId: event.invocationId, commandId, handled: true };
      },
      async setState(commandId: string, state: CommandState) {
        const command = commands.get(commandId);
        if (!command) {
          return undefined;
        }
        const nextCommand: CommandView = {
          ...command,
          state: {
            ...command.state,
            ...state,
          },
          diagnostic: {
            visible: state.visible ?? command.diagnostic.visible,
            enabled: state.enabled ?? command.diagnostic.enabled,
            checked: state.checked ?? command.diagnostic.checked,
            hiddenReasonKey: state.hiddenReasonKey ?? command.diagnostic.hiddenReasonKey,
            disabledReasonKey: state.disabledReasonKey ?? command.diagnostic.disabledReasonKey,
          },
        };
        commands.set(commandId, nextCommand);
        return nextCommand;
      },
      onRegistered(_handler: (event: CommandRegisteredEvent) => void) {
        return () => undefined;
      },
      onUnregistered(_handler: (event: CommandUnregisteredEvent) => void) {
        return () => undefined;
      },
      onChanged(_handler: (event: CommandChangedEvent) => void) {
        return () => undefined;
      },
      onInvoked(handler: (event: CommandInvokedEvent) => void) {
        invokedHandlers.add(handler);
        return () => {
          invokedHandlers.delete(handler);
        };
      },
    },
    platform: {
      getLaunchContext() {
        return {
          pluginId: "com.chips.eco-settings-panel",
          sceneId: "themes",
          surfaceId: "settings-panel-test-surface",
          sessionId: "settings-panel-test-session",
          kind: "window",
          launchParams: {},
          surfaceContext: {
            sceneId: "themes",
            surfaceId: "settings-panel-test-surface",
            sessionId: "settings-panel-test-session",
            pluginId: "com.chips.eco-settings-panel",
            kind: "window",
            presentation: {
              title: "Chips Eco Settings Panel",
            },
            launchParams: {},
          },
        };
      },
    },
  } as unknown as Client;
}

vi.mock("../../src/app/providers/RuntimeProvider", () => ({
  RuntimeProvider({ children }: React.PropsWithChildren) {
    return <>{children}</>;
  },
  useRuntimeContext() {
    return {
      client: createCommandClientMock(),
      currentLocale: "zh-CN",
      currentTheme: {
        themeId: "chips-official.default-theme",
        displayName: "薯片官方 · 默认主题",
        version: "1.0.0",
      },
      eventSource: {
        subscribe() {
          return () => undefined;
        },
      },
      ready: true,
      runtimeError: null,
      refreshRuntimeState: async () => undefined,
    };
  },
}));

vi.mock("../../src/app/providers/I18nProvider", () => ({
  I18nProvider({ children }: React.PropsWithChildren) {
    return <>{children}</>;
  },
  useI18n() {
    return {
      t(key: string) {
        return key;
      },
    };
  },
}));

describe("App (标准应用插件根组件)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("应当导出一个可用的 React 组件", async () => {
    const { App } = await import("../../src/App");
    expect(App).toBeTypeOf("function");
  }, 15000);

  it("渲染单一主导航和窄屏菜单切换器结构", async () => {
    const { App } = await import("../../src/App");
    const markup = renderToStaticMarkup(<App />);

    expect(markup).not.toContain("settings-titlebar");
    expect(markup).toContain("data-scope=\"navigation-split-view\"");
    expect(markup).toContain("settings-nav-list");
    expect(markup).toContain("settings-mobile-nav");
    expect(markup).toContain("settingsPanel.menu.mobileLabel");
    expect(markup).not.toContain("settings-command-row");
    expect(markup).not.toContain("data-scope=\"command-palette\"");
    expect(markup).not.toContain("data-scope=\"menu-bar\"");
    expect(markup).not.toContain("data-scope=\"toolbar\"");
    expect(markup).toContain("settingsPanel.menu.themes.title");
    expect(markup).toContain("settingsPanel.menu.themeDiagnostics.title");
    expect(markup).toContain("settingsPanel.menu.previewQuality.title");
    expect(markup).not.toContain("settings-sidebar__runtime");
  }, 15000);

  it("主导航图标应使用已确认的 Material Symbols 语义名", async () => {
    const { App } = await import("../../src/App");
    const { SETTINGS_SCENE_ICONS } = await import("../../src/app/settings-scene-icons");
    const { settingsCommandDefinitions } = await import("../../src/commands/settings-commands");
    const supportedIconNames = new Set([
      "palette",
      "rule_settings",
      "translate",
      "apps",
      "dashboard_customize",
      "view_quilt",
      "extension",
      "widgets",
      "speed",
    ]);
    const unsupportedIconNames = ["paintbrush", "character", "rectangle_stack", "macwindow"];
    const markup = renderToStaticMarkup(<App />);

    Object.values(SETTINGS_SCENE_ICONS).forEach((icon) => {
      expect(supportedIconNames.has(icon.name)).toBe(true);
      expect("color" in icon).toBe(false);
    });

    settingsCommandDefinitions.forEach((command) => {
      expect(supportedIconNames.has(command.icon?.name ?? "")).toBe(true);
      expect(command.icon?.style).toBe("rounded");
    });

    unsupportedIconNames.forEach((iconName) => {
      expect(markup).not.toContain(iconName);
    });
    expect(markup).not.toContain("--settings-nav-icon-accent");
  }, 15000);

  it("设置面板私有样式不得恢复旧蓝色按钮菜单和表格覆盖层", () => {
    const stylesPath = fileURLToPath(new URL("../../src/app/styles.css", import.meta.url));
    const styles = readFileSync(stylesPath, "utf-8");

    expect(styles).not.toContain("--settings-nav-icon-accent");
    expect(styles).not.toContain("settings-card-grid--bento");
    expect(styles).not.toContain("table[role=\"grid\"]");
    expect(styles).not.toContain("thead");
    expect(styles).not.toContain("tbody");
    expect(styles).not.toContain("#0a6cff");
    expect(styles).not.toContain("#f5f5f7");
    expect(styles).not.toContain("SF Pro Display");
    expect(styles).not.toContain("color-scheme: light");
    expect(styles).toContain("--settings-surface-base: var(--chips-sys-color-canvas");
  });
});

import { createMockChipsClient, type MockChipsClient } from "chips-sdk";
import { SETTINGS_PANEL_PERMISSIONS } from "../../src/app/settings-permissions";

export function createSettingsMockClient(): MockChipsClient {
  return createMockChipsClient({
    installBridge: false,
    permissions: [...SETTINGS_PANEL_PERMISSIONS],
    actions: {
      "plugin.query": (payload: unknown) => {
        const type = (payload as { type?: string }).type;
        if (type === "theme") {
          return {
            plugins: [
              {
                id: "theme.default",
                manifestPath: "/themes/default/manifest.yaml",
                type: "theme",
                name: "Default Theme",
                version: "1.0.0",
                enabled: true,
                installPath: "/themes/default",
                installedAt: 1,
                capabilities: [],
                theme: {
                  themeId: "chips-official.default-theme",
                  displayName: "Default Theme",
                  isDefault: true,
                },
              },
            ],
          };
        }
        if (type === "app") {
          return {
            plugins: [
              {
                id: "app.viewer",
                manifestPath: "/apps/viewer/manifest.yaml",
                type: "app",
                name: "Viewer",
                version: "1.0.0",
                enabled: true,
                installPath: "/apps/viewer",
                installedAt: 2,
                capabilities: ["viewer"],
              },
            ],
          };
        }
        return { plugins: [] };
      },
      "plugin.install": () => ({ pluginId: "plugin.installed" }),
      "plugin.enable": () => ({ ack: true }),
      "plugin.disable": () => ({ ack: true }),
      "plugin.uninstall": () => ({ ack: true }),
      "plugin.get": () => ({
        plugin: {
          id: "plugin.installed",
          manifestPath: "/plugins/installed/manifest.yaml",
          type: "card",
          name: "Installed Plugin",
          version: "1.0.0",
          enabled: false,
          installPath: "/plugins/installed",
          installedAt: 3,
          capabilities: ["base.card"],
        },
      }),
      "plugin.launch": () => ({
        window: { id: "window-1" },
        session: {
          sessionId: "session-1",
          sessionNonce: "nonce-1",
          permissions: [...SETTINGS_PANEL_PERMISSIONS],
        },
      }),
      "plugin.getShortcut": (payload: unknown) => {
        const pluginId = (payload as { pluginId?: string }).pluginId ?? "app.viewer";
        return {
          shortcut: {
            pluginId,
            name: "Viewer",
            location: "desktop",
            launcherPath: `/shortcuts/${pluginId}`,
            executablePath: "/Applications/Chips Host",
            args: [`--chips-launch-plugin=${pluginId}`],
            exists: true,
          },
        };
      },
      "plugin.createShortcut": (payload: unknown) => {
        const pluginId = (payload as { pluginId?: string }).pluginId ?? "app.viewer";
        return {
          shortcut: {
            pluginId,
            name: "Viewer",
            location: "desktop",
            launcherPath: `/shortcuts/${pluginId}`,
            executablePath: "/Applications/Chips Host",
            args: [`--chips-launch-plugin=${pluginId}`],
            exists: true,
          },
        };
      },
      "plugin.removeShortcut": () => ({
        removed: true,
        launcherPath: "/shortcuts/app.viewer",
        location: "desktop",
      }),
      "platform.dialogOpenFile": () => ({ filePaths: ["/packages/plugin.cpk"] }),
      "platform.shellShowItemInFolder": () => ({ ack: true }),
      "platform.dialogShowConfirm": () => ({ confirmed: true }),
      "platform.dialogShowMessage": () => ({ response: 0 }),
    },
  });
}

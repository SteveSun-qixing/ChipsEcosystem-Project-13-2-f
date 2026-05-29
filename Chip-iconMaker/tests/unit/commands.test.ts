import { describe, expect, it } from "vitest";
import type { CommandInvokedEvent } from "chips-sdk";
import { createMockChipsClient } from "chips-sdk/testing";
import {
  APP_COMMAND_HANDLER_IDS,
  APP_COMMAND_IDS,
  APP_PLUGIN_ID,
  appCommandDefinitions,
  appCommandViews,
  createAppCommandStatus,
  getAppCommandHandlerId,
  isAppCommandInvokedEvent,
  resolveAppMenuGroups,
  resolveAppPaletteItems,
  resolveAppToolbarCommands,
} from "../../src/commands/app-commands";
import { translateLocalKey } from "../../src/i18n/locales";

describe("app command registry contract", () => {
  it("declares serializable command metadata with i18n keys", () => {
    expect(appCommandDefinitions.length).toBeGreaterThan(0);

    for (const definition of appCommandDefinitions) {
      const record = definition as unknown as Record<string, unknown>;
      expect(definition.commandId.startsWith(`${APP_PLUGIN_ID}.`)).toBe(true);
      expect(definition.titleKey).toMatch(/^app\.commands\./);
      expect(definition.descriptionKey).toMatch(/^app\.commands\./);
      expect(definition.ariaLabelKey).toMatch(/^app\.commands\./);
      expect(definition.handlerId).toBeTypeOf("string");
      expect(definition.scope).toEqual({ kind: "app", appId: APP_PLUGIN_ID });
      expect(definition.menuPlacement?.length).toBeGreaterThan(0);
      expect(definition.toolbarPlacement?.length).toBeGreaterThan(0);
      expect(definition.paletteKeywords?.length).toBeGreaterThan(0);
      expect(translateLocalKey(definition.titleKey, "zh-CN")).not.toBe(definition.titleKey);
      expect(translateLocalKey(definition.titleKey, "en-US")).not.toBe(definition.titleKey);
      if (definition.descriptionKey) {
        expect(translateLocalKey(definition.descriptionKey, "zh-CN")).not.toBe(definition.descriptionKey);
        expect(translateLocalKey(definition.descriptionKey, "en-US")).not.toBe(definition.descriptionKey);
      }
      if (definition.ariaLabelKey) {
        expect(translateLocalKey(definition.ariaLabelKey, "zh-CN")).not.toBe(definition.ariaLabelKey);
        expect(translateLocalKey(definition.ariaLabelKey, "en-US")).not.toBe(definition.ariaLabelKey);
      }
      expect(record.title).toBeUndefined();
      expect(record.description).toBeUndefined();
      expect(record.ariaLabel).toBeUndefined();
      expect(record.label).toBeUndefined();
    }
  });

  it("derives menu, toolbar, and palette entries from one command view registry", () => {
    const i18n = (key: string) => translateLocalKey(key, "en-US");
    const toolbarItems = resolveAppToolbarCommands(i18n);
    const menuGroups = resolveAppMenuGroups(i18n);
    const paletteItems = resolveAppPaletteItems(i18n);
    const toolbarIds = toolbarItems.map((item) => item.commandId);
    const menuIds = menuGroups.flatMap((group) => group.items.map((item) => item.commandId));
    const paletteIds = paletteItems.map((item) => item.commandId);

    for (const command of appCommandViews) {
      expect(toolbarIds).toContain(command.commandId);
      expect(menuIds).toContain(command.commandId);
      expect(paletteIds).toContain(command.commandId);
    }
    expect(toolbarItems[0].label).toBe("Choose artwork");
    expect(menuGroups.map((group) => group.groupId)).toEqual(["primary", "appearance"]);
    expect(paletteItems.some((item) => item.commandId === APP_COMMAND_IDS.refreshTheme)).toBe(true);
  });

  it("uses SDK testing mock host for register/list/setState/invoke", async () => {
    const client = createMockChipsClient();
    const invoked: string[] = [];
    client.command.onInvoked((event) => {
      invoked.push(event.commandId);
    });

    for (const definition of appCommandDefinitions) {
      await client.command.register(definition);
    }
    const menuCommands = await client.command.list({ source: "menu" });
    const toolbarCommands = await client.command.list({ source: "toolbar" });
    const paletteCommands = await client.command.list({ source: "palette" });
    const disabledCommand = await client.command.setState(
      APP_COMMAND_IDS.refreshTheme,
      {
        enabled: false,
        disabledReasonKey: "app.commands.refreshTheme.disabledReason",
      },
      { context: { source: "toolbar" } },
    );
    const visibleCommands = await client.command.list({ source: "toolbar" });
    const allCommands = await client.command.list({ source: "toolbar", includeDisabled: true });
    await client.command.invoke(APP_COMMAND_IDS.focusImporter, {}, { source: "toolbar" });

    expect(client.calls.map((call) => call.action)).toContain("command.setState");
    expect(client.calls.slice(0, 6).map((call) => call.action)).toEqual([
      "command.register",
      "command.register",
      "command.register",
      "command.list",
      "command.list",
      "command.list",
    ]);
    expect(menuCommands.map((command) => command.commandId)).toEqual(Object.values(APP_COMMAND_IDS));
    expect(toolbarCommands.map((command) => command.commandId)).toEqual(Object.values(APP_COMMAND_IDS));
    expect(paletteCommands.map((command) => command.commandId)).toEqual(Object.values(APP_COMMAND_IDS));
    expect(disabledCommand?.diagnostic.enabled).toBe(false);
    expect(visibleCommands.map((command) => command.commandId)).toEqual([
      APP_COMMAND_IDS.focusImporter,
      APP_COMMAND_IDS.generateIcons,
    ]);
    expect(allCommands.map((command) => command.commandId)).toEqual(Object.values(APP_COMMAND_IDS));
    expect(client.calls.at(-1)?.payload).toMatchObject({
      commandId: APP_COMMAND_IDS.focusImporter,
      source: "toolbar",
      payload: {},
    });
    expect(invoked).toEqual([APP_COMMAND_IDS.focusImporter]);
    client.restoreBridge();
  });

  it("handles command.invoked events by handlerId", () => {
    const event: CommandInvokedEvent = {
      commandId: APP_COMMAND_IDS.focusImporter,
      handlerId: APP_COMMAND_HANDLER_IDS.focusImporter,
      ownerPluginId: APP_PLUGIN_ID,
      invocationId: "invocation-test",
      source: "palette",
      payload: {
        inputPath: "/tmp/source.png",
      },
      context: {
        taskId: "cli-task-test",
      },
      command: {
        ...appCommandDefinitions[0],
        diagnostic: {
          visible: true,
          enabled: true,
          checked: false,
        },
      },
    };

    expect(isAppCommandInvokedEvent(event)).toBe(true);
    const handlerId = getAppCommandHandlerId(event);
    expect(handlerId).toBe(APP_COMMAND_HANDLER_IDS.focusImporter);
    expect(createAppCommandStatus(event, handlerId!)).toEqual({
      commandId: APP_COMMAND_IDS.focusImporter,
      handlerId: APP_COMMAND_HANDLER_IDS.focusImporter,
      invocationId: "invocation-test",
      payload: {
        inputPath: "/tmp/source.png",
      },
      context: {
        taskId: "cli-task-test",
      },
      source: "palette",
    });
  });
});

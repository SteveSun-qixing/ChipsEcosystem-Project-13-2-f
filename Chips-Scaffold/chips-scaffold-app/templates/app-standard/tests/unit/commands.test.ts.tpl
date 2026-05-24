import { describe, expect, it } from "vitest";
import type { CommandInvokedEvent } from "chips-sdk";
import { createMockChipsClient } from "chips-sdk/testing";
import {
  APP_COMMAND_HANDLER_IDS,
  APP_COMMAND_IDS,
  APP_PLUGIN_ID,
  appCommandDefinitions,
  createAppCommandStatus,
  getAppCommandHandlerId,
  isAppCommandInvokedEvent,
} from "../../src/commands/app-commands";

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
      expect(record.title).toBeUndefined();
      expect(record.description).toBeUndefined();
      expect(record.ariaLabel).toBeUndefined();
      expect(record.label).toBeUndefined();
    }
  });

  it("uses SDK testing mock host for register/list/invoke", async () => {
    const client = createMockChipsClient();
    const invoked: string[] = [];
    client.command.onInvoked((event) => {
      invoked.push(event.commandId);
    });

    await client.command.register(appCommandDefinitions[0]);
    await client.command.list({ source: "toolbar" });
    await client.command.invoke(APP_COMMAND_IDS.openWorkspace, {}, { source: "toolbar" });

    expect(client.calls.map((call) => call.action)).toEqual([
      "command.register",
      "command.list",
      "command.invoke",
    ]);
    expect(client.calls[2].payload).toMatchObject({
      commandId: APP_COMMAND_IDS.openWorkspace,
      source: "toolbar",
      payload: {},
    });
    expect(invoked).toEqual([APP_COMMAND_IDS.openWorkspace]);
    client.restoreBridge();
  });

  it("handles command.invoked events by handlerId", () => {
    const event: CommandInvokedEvent = {
      commandId: APP_COMMAND_IDS.openWorkspace,
      handlerId: APP_COMMAND_HANDLER_IDS.openWorkspace,
      ownerPluginId: APP_PLUGIN_ID,
      invocationId: "invocation-test",
      source: "palette",
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
    expect(handlerId).toBe(APP_COMMAND_HANDLER_IDS.openWorkspace);
    expect(createAppCommandStatus(event, handlerId!)).toEqual({
      commandId: APP_COMMAND_IDS.openWorkspace,
      handlerId: APP_COMMAND_HANDLER_IDS.openWorkspace,
      invocationId: "invocation-test",
      source: "palette",
    });
  });
});

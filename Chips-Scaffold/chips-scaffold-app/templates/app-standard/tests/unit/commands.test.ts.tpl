import { describe, expect, it } from "vitest";
import { createClient, type CommandInvokedEvent } from "chips-sdk";
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
      const record = definition as Record<string, unknown>;
      expect(definition.commandId.startsWith(`${APP_PLUGIN_ID}.`)).toBe(true);
      expect(definition.titleKey).toMatch(/^app-standard\.commands\./);
      expect(definition.descriptionKey).toMatch(/^app-standard\.commands\./);
      expect(definition.ariaLabelKey).toMatch(/^app-standard\.commands\./);
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

  it("uses SDK command API actions for register/list/invoke", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "command.register") {
          return { command: payload };
        }
        if (action === "command.list") {
          return { commands: appCommandDefinitions };
        }
        if (action === "command.invoke") {
          return {
            commandId: APP_COMMAND_IDS.showWelcome,
            invocationId: "invocation-test",
            dispatched: true,
          };
        }
        throw { code: "UNEXPECTED_ACTION", message: action };
      },
    });

    await client.command.register(appCommandDefinitions[0]);
    await client.command.list({ source: "toolbar" });
    await client.command.invoke(APP_COMMAND_IDS.showWelcome, {}, { source: "toolbar" });

    expect(calls.map((call) => call.action)).toEqual([
      "command.register",
      "command.list",
      "command.invoke",
    ]);
    expect(calls[2].payload).toMatchObject({
      commandId: APP_COMMAND_IDS.showWelcome,
      source: "toolbar",
      payload: {},
    });
  });

  it("handles command.invoked events by handlerId", () => {
    const event: CommandInvokedEvent = {
      commandId: APP_COMMAND_IDS.showWelcome,
      handlerId: APP_COMMAND_HANDLER_IDS.showWelcome,
      ownerPluginId: APP_PLUGIN_ID,
      invocationId: "invocation-test",
      source: "palette",
    };

    expect(isAppCommandInvokedEvent(event)).toBe(true);
    const handlerId = getAppCommandHandlerId(event);
    expect(handlerId).toBe(APP_COMMAND_HANDLER_IDS.showWelcome);
    expect(createAppCommandStatus(event, handlerId!)).toEqual({
      commandId: APP_COMMAND_IDS.showWelcome,
      handlerId: APP_COMMAND_HANDLER_IDS.showWelcome,
      invocationId: "invocation-test",
      source: "palette",
    });
  });
});

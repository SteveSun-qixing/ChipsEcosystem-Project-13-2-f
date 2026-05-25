import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  CARD_VIEWER_COMMAND_HANDLER_IDS,
  CARD_VIEWER_COMMAND_IDS,
  cardViewerCommandDefinitions,
  resolveCardViewerMenuGroups,
  resolveCardViewerToolbarCommands,
} from "../../src/commands/card-viewer-commands";
import { formatMessage } from "../../src/i18n/messages";

const FORBIDDEN_RAW_TEXT_FIELDS = ["title", "description", "label", "ariaLabel"] as const;

function readManifest(): { permissions?: string[] } {
  return parse(readFileSync(resolve(__dirname, "../../manifest.yaml"), "utf-8")) as {
    permissions?: string[];
  };
}

describe("CardViewer commands", () => {
  it("defines the existing open-file action as serializable command metadata", () => {
    expect(cardViewerCommandDefinitions).toHaveLength(1);
    expect(cardViewerCommandDefinitions[0]).toEqual(
      expect.objectContaining({
        commandId: CARD_VIEWER_COMMAND_IDS.openFile,
        titleKey: "card-viewer.commands.openFile.title",
        descriptionKey: "card-viewer.commands.openFile.description",
        ariaLabelKey: "card-viewer.commands.openFile.ariaLabel",
        handlerId: CARD_VIEWER_COMMAND_HANDLER_IDS.openFile,
        scope: { kind: "app", appId: "com.chips.card-viewer" },
        permission: "platform.read",
      }),
    );
  });

  it("does not place raw display text into command definitions", () => {
    for (const definition of cardViewerCommandDefinitions) {
      for (const field of FORBIDDEN_RAW_TEXT_FIELDS) {
        expect(definition).not.toHaveProperty(field);
      }
    }
  });

  it("resolves menu and toolbar entries through command placements and i18n keys", () => {
    const i18n = (key: string) => formatMessage("zh-CN", key);
    const toolbarCommands = resolveCardViewerToolbarCommands(i18n);
    const menuGroups = resolveCardViewerMenuGroups(i18n);

    expect(toolbarCommands.map((command) => command.commandId)).toEqual([
      CARD_VIEWER_COMMAND_IDS.openFile,
    ]);
    expect(toolbarCommands[0]?.label).toBe("打开文件");
    expect(menuGroups).toHaveLength(1);
    expect(menuGroups[0]?.items.map((command) => command.commandId)).toEqual([
      CARD_VIEWER_COMMAND_IDS.openFile,
    ]);
  });

  it("declares the Host command permissions required by registration and invocation", () => {
    const manifest = readManifest();

    expect(manifest.permissions).toEqual(
      expect.arrayContaining(["command.read", "command.write", "command.invoke", "platform.read"]),
    );
  });
});

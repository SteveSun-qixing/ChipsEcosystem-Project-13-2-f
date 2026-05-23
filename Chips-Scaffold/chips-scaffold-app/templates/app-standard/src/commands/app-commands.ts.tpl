import type {
  CommandDefinitionInput,
  CommandInvokedEvent,
  CommandSource,
} from "chips-sdk";

export const APP_PLUGIN_ID = "{{ PLUGIN_ID }}";

export const APP_COMMAND_IDS = {
  showWelcome: "{{ PLUGIN_ID }}.show-welcome",
  refreshTheme: "{{ PLUGIN_ID }}.refresh-theme",
} as const;

export const APP_COMMAND_HANDLER_IDS = {
  showWelcome: "show-welcome",
  refreshTheme: "refresh-theme",
} as const;

const APP_COMMAND_ID_SET = new Set<string>(Object.values(APP_COMMAND_IDS));

export const appCommandDefinitions: CommandDefinitionInput[] = [
  {
    commandId: APP_COMMAND_IDS.showWelcome,
    titleKey: "app-standard.commands.showWelcome.title",
    descriptionKey: "app-standard.commands.showWelcome.description",
    ariaLabelKey: "app-standard.commands.showWelcome.ariaLabel",
    icon: { name: "waving_hand", style: "rounded" },
    scope: { kind: "app", appId: APP_PLUGIN_ID },
    handlerId: APP_COMMAND_HANDLER_IDS.showWelcome,
    menuPlacement: [{ menuId: "app", groupId: "primary", order: 10 }],
    toolbarPlacement: [{ toolbarId: "main", groupId: "primary", order: 10 }],
    paletteKeywords: ["welcome", "hello", "start"],
    state: { enabled: true, visible: true },
  },
  {
    commandId: APP_COMMAND_IDS.refreshTheme,
    titleKey: "app-standard.commands.refreshTheme.title",
    descriptionKey: "app-standard.commands.refreshTheme.description",
    ariaLabelKey: "app-standard.commands.refreshTheme.ariaLabel",
    icon: { name: "palette", style: "rounded" },
    scope: { kind: "app", appId: APP_PLUGIN_ID },
    handlerId: APP_COMMAND_HANDLER_IDS.refreshTheme,
    menuPlacement: [{ menuId: "app", groupId: "view", order: 20 }],
    toolbarPlacement: [{ toolbarId: "main", groupId: "secondary", order: 20 }],
    paletteKeywords: ["theme", "appearance", "refresh"],
    state: { enabled: true, visible: true },
  },
];

export type AppCommandId = (typeof APP_COMMAND_IDS)[keyof typeof APP_COMMAND_IDS];
export type AppCommandHandlerId = (typeof APP_COMMAND_HANDLER_IDS)[keyof typeof APP_COMMAND_HANDLER_IDS];

export interface AppCommandStatus {
  commandId: string;
  handlerId: AppCommandHandlerId;
  source: CommandSource;
  invocationId?: string;
}

export function isAppCommandInvokedEvent(event: CommandInvokedEvent): boolean {
  if (!APP_COMMAND_ID_SET.has(event.commandId)) {
    return false;
  }
  return event.ownerPluginId === undefined || event.ownerPluginId === APP_PLUGIN_ID;
}

export function getAppCommandHandlerId(
  event: CommandInvokedEvent,
): AppCommandHandlerId | null {
  const handlerId = event.handlerId;
  if (handlerId === APP_COMMAND_HANDLER_IDS.showWelcome) {
    return handlerId;
  }
  if (handlerId === APP_COMMAND_HANDLER_IDS.refreshTheme) {
    return handlerId;
  }
  return null;
}

export function createAppCommandStatus(
  event: CommandInvokedEvent,
  handlerId: AppCommandHandlerId,
): AppCommandStatus {
  return {
    commandId: event.commandId,
    handlerId,
    source: event.source ?? "api",
    invocationId: event.invocationId,
  };
}

import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";
import type { IconDescriptor } from "./icon";

export type CommandScopeKind = "global" | "app" | "scene" | "surface" | "document";
export type CommandSource = "menu" | "toolbar" | "shortcut" | "palette" | "context-menu" | "api";

export interface CommandConditionExpression {
  key: string;
  equals?: unknown;
  notEquals?: unknown;
  in?: unknown[];
  truthy?: boolean;
}

export interface CommandScope {
  kind: CommandScopeKind;
  appId?: string;
  sceneId?: string;
  surfaceId?: string;
  documentId?: string;
}

export type CommandCondition = boolean | CommandConditionExpression;

export interface CommandShortcut {
  accelerator: string;
  platform?: "all" | "desktop" | "web" | "mobile" | "headless";
  when?: CommandCondition;
  preventDefault?: boolean;
}

export interface CommandMenuPlacement {
  menuId?: string;
  groupId?: string;
  order?: number;
  beforeCommandId?: string;
  afterCommandId?: string;
  [key: string]: unknown;
}

export interface CommandToolbarPlacement {
  toolbarId?: string;
  groupId?: string;
  order?: number;
  section?: string;
  [key: string]: unknown;
}

export interface CommandState {
  enabled?: boolean;
  visible?: boolean;
  checked?: boolean;
  busy?: boolean;
  value?: unknown;
  reasonKey?: string;
  disabledReasonKey?: string;
  hiddenReasonKey?: string;
  [key: string]: unknown;
}

export interface CommandDefinitionInput {
  commandId: string;
  titleKey: string;
  descriptionKey?: string;
  ariaLabelKey?: string;
  icon?: IconDescriptor;
  shortcut?: CommandShortcut | CommandShortcut[];
  scope?: CommandScope;
  enabledWhen?: CommandCondition;
  visibleWhen?: CommandCondition;
  permission?: string | string[];
  handlerId: string;
  menuPlacement?: CommandMenuPlacement[];
  toolbarPlacement?: CommandToolbarPlacement[];
  paletteKeywords?: string[];
  state?: CommandState;
  checkedWhen?: CommandCondition;
}

export interface CommandView extends CommandDefinitionInput {
  ownerPluginId?: string;
  ownerSessionId?: string;
  registeredAt?: number;
  updatedAt?: number;
  disabledReasonKey?: string;
  hiddenReasonKey?: string;
}

export interface CommandQueryOptions {
  scope?: CommandScope;
  source?: CommandSource;
  ownerPluginId?: string;
  includeDisabled?: boolean;
  includeHidden?: boolean;
  context?: CommandInvocationContext;
}

export interface CommandInvocationContext {
  pluginId?: string;
  sceneId?: string;
  surfaceId?: string;
  documentId?: string;
  [key: string]: unknown;
}

export interface CommandInvokeOptions {
  source?: CommandSource;
  context?: CommandInvocationContext;
}

export interface CommandInvokeResult {
  commandId: string;
  invocationId?: string;
  dispatched: boolean;
  result?: unknown;
  state?: CommandState;
}

export interface CommandSetStateOptions {
  context?: CommandInvocationContext;
}

export interface CommandRegisteredEvent {
  commandId: string;
  command?: CommandView;
  ownerPluginId?: string;
  ownerSessionId?: string;
  registeredAt?: number;
}

export interface CommandUnregisteredEvent {
  commandId: string;
  ownerPluginId?: string;
  ownerSessionId?: string;
  reason?: string;
}

export interface CommandChangedEvent {
  commandId: string;
  command?: CommandView;
  state?: CommandState;
  change?: "registered" | "unregistered" | "updated" | "state";
  ownerPluginId?: string;
  ownerSessionId?: string;
  source?: CommandSource;
}

export interface CommandInvokedEvent {
  commandId: string;
  invocationId?: string;
  source?: CommandSource;
  payload?: Record<string, unknown>;
  command?: CommandView;
  handlerId?: string;
  ownerPluginId?: string;
  ownerSessionId?: string;
  sceneId?: string;
  surfaceId?: string;
  documentId?: string;
  context?: CommandInvocationContext;
  result?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    retryable?: boolean;
  };
}

export interface CommandApi {
  register(definition: CommandDefinitionInput): Promise<CommandView>;
  unregister(commandId: string): Promise<void>;
  get(commandId: string, options?: CommandQueryOptions): Promise<CommandView | undefined>;
  list(options?: CommandQueryOptions): Promise<CommandView[]>;
  invoke(
    commandId: string,
    payload?: Record<string, unknown>,
    options?: CommandInvokeOptions,
  ): Promise<CommandInvokeResult>;
  setState(
    commandId: string,
    state: CommandState,
    options?: CommandSetStateOptions,
  ): Promise<CommandView | undefined>;
  onRegistered(handler: (event: CommandRegisteredEvent) => void): () => void;
  onUnregistered(handler: (event: CommandUnregisteredEvent) => void): () => void;
  onChanged(handler: (event: CommandChangedEvent) => void): () => void;
  onInvoked(handler: (event: CommandInvokedEvent) => void): () => void;
}

const COMMAND_SCOPE_KINDS = new Set<CommandScopeKind>(["global", "app", "scene", "surface", "document"]);
const COMMAND_SOURCES = new Set<CommandSource>(["menu", "toolbar", "shortcut", "palette", "context-menu", "api"]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, action: string, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError("INVALID_ARGUMENT", `${action}: ${field} is required.`);
  }
}

function assertOptionalNonEmptyString(value: unknown, action: string, field: string): void {
  if (typeof value !== "undefined" && (typeof value !== "string" || value.trim().length === 0)) {
    throw createError("INVALID_ARGUMENT", `${action}: ${field} must be a non-empty string when provided.`);
  }
}

function assertPlainRecord(value: unknown, action: string, field: string): asserts value is Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw createError("INVALID_ARGUMENT", `${action}: ${field} must be an object.`);
  }
}

function setDefined<T extends object>(target: T, key: keyof T, value: T[keyof T] | undefined): T {
  if (typeof value !== "undefined") {
    target[key] = value;
  }
  return target;
}

function normalizeCondition(value: CommandCondition | undefined, action: string, field: string): CommandCondition | undefined {
  if (typeof value === "undefined") return undefined;
  if (typeof value === "boolean") return value;
  assertPlainRecord(value, action, field);
  assertNonEmptyString(value.key, action, `${field}.key`);
  if (typeof value.in !== "undefined" && !Array.isArray(value.in)) {
    throw createError("INVALID_ARGUMENT", `${action}: ${field}.in must be an array when provided.`);
  }
  if (typeof value.truthy !== "undefined" && typeof value.truthy !== "boolean") {
    throw createError("INVALID_ARGUMENT", `${action}: ${field}.truthy must be a boolean when provided.`);
  }
  return { ...value };
}

function normalizeScope(scope: CommandScope | undefined, action: string): CommandScope | undefined {
  if (typeof scope === "undefined") return undefined;
  assertPlainRecord(scope, action, "scope");
  if (!COMMAND_SCOPE_KINDS.has(scope.kind as CommandScopeKind)) {
    throw createError(
      "INVALID_ARGUMENT",
      `${action}: scope.kind must be one of global/app/scene/surface/document.`,
    );
  }
  assertOptionalNonEmptyString(scope.appId, action, "scope.appId");
  assertOptionalNonEmptyString(scope.sceneId, action, "scope.sceneId");
  assertOptionalNonEmptyString(scope.surfaceId, action, "scope.surfaceId");
  assertOptionalNonEmptyString(scope.documentId, action, "scope.documentId");
  return { ...scope };
}

function normalizeIcon(icon: IconDescriptor | undefined, action: string): IconDescriptor | undefined {
  if (typeof icon === "undefined") return undefined;
  assertPlainRecord(icon, action, "icon");
  assertNonEmptyString(icon.name, action, "icon.name");
  return { ...icon };
}

function normalizeShortcutItem(shortcut: CommandShortcut, action: string): CommandShortcut {
  assertPlainRecord(shortcut, action, "shortcut");
  assertNonEmptyString(shortcut.accelerator, action, "shortcut.accelerator");
  if (
    typeof shortcut.platform !== "undefined" &&
    !["all", "desktop", "web", "mobile", "headless"].includes(shortcut.platform)
  ) {
    throw createError(
      "INVALID_ARGUMENT",
      `${action}: shortcut.platform must be one of all/desktop/web/mobile/headless.`,
    );
  }
  const when = normalizeCondition(shortcut.when, action, "shortcut.when");
  return setDefined({ ...shortcut }, "when", when) as CommandShortcut;
}

function normalizeShortcut(
  shortcut: CommandShortcut | CommandShortcut[] | undefined,
  action: string,
): CommandShortcut | CommandShortcut[] | undefined {
  if (typeof shortcut === "undefined") return undefined;
  if (Array.isArray(shortcut)) {
    return shortcut.map((entry) => normalizeShortcutItem(entry, action));
  }
  return normalizeShortcutItem(shortcut, action);
}

function normalizePermission(permission: string | string[] | undefined, action: string): string | string[] | undefined {
  if (typeof permission === "undefined") return undefined;
  if (typeof permission === "string") {
    assertNonEmptyString(permission, action, "permission");
    return permission;
  }
  if (!Array.isArray(permission)) {
    throw createError("INVALID_ARGUMENT", `${action}: permission must be a string or string array.`);
  }
  permission.forEach((item) => assertNonEmptyString(item, action, "permission"));
  return [...permission];
}

function normalizePlacementArray<T extends Record<string, unknown>>(
  placements: T[] | undefined,
  action: string,
  field: string,
): T[] | undefined {
  if (typeof placements === "undefined") return undefined;
  if (!Array.isArray(placements)) {
    throw createError("INVALID_ARGUMENT", `${action}: ${field} must be an array.`);
  }
  return placements.map((placement) => {
    assertPlainRecord(placement, action, field);
    return { ...placement };
  });
}

function normalizePaletteKeywords(keywords: string[] | undefined, action: string): string[] | undefined {
  if (typeof keywords === "undefined") return undefined;
  if (!Array.isArray(keywords)) {
    throw createError("INVALID_ARGUMENT", `${action}: paletteKeywords must be an array.`);
  }
  keywords.forEach((keyword) => assertNonEmptyString(keyword, action, "paletteKeywords"));
  return [...keywords];
}

function normalizeState(state: CommandState | undefined, action: string): CommandState | undefined {
  if (typeof state === "undefined") return undefined;
  assertPlainRecord(state, action, "state");
  assertOptionalNonEmptyString(state.reasonKey, action, "state.reasonKey");
  assertOptionalNonEmptyString(state.disabledReasonKey, action, "state.disabledReasonKey");
  assertOptionalNonEmptyString(state.hiddenReasonKey, action, "state.hiddenReasonKey");
  return { ...state };
}

function assertNoRawTextFields(definition: Record<string, unknown>): void {
  for (const field of ["title", "description", "ariaLabel"]) {
    if (Object.prototype.hasOwnProperty.call(definition, field)) {
      throw createError(
        "INVALID_ARGUMENT",
        `command.register: ${field} must be expressed as an i18n key field.`,
      );
    }
  }
}

function normalizeCommandDefinition(definition: CommandDefinitionInput): CommandDefinitionInput {
  const action = "command.register";
  assertPlainRecord(definition, action, "definition");
  assertNoRawTextFields(definition);
  assertNonEmptyString(definition.commandId, action, "commandId");
  assertNonEmptyString(definition.titleKey, action, "titleKey");
  assertOptionalNonEmptyString(definition.descriptionKey, action, "descriptionKey");
  assertOptionalNonEmptyString(definition.ariaLabelKey, action, "ariaLabelKey");
  assertNonEmptyString(definition.handlerId, action, "handlerId");

  const normalized: CommandDefinitionInput = {
    commandId: definition.commandId,
    titleKey: definition.titleKey,
    handlerId: definition.handlerId,
  };

  if (typeof definition.descriptionKey !== "undefined") normalized.descriptionKey = definition.descriptionKey;
  if (typeof definition.ariaLabelKey !== "undefined") normalized.ariaLabelKey = definition.ariaLabelKey;
  const icon = normalizeIcon(definition.icon, action);
  if (typeof icon !== "undefined") normalized.icon = icon;
  const shortcut = normalizeShortcut(definition.shortcut, action);
  if (typeof shortcut !== "undefined") normalized.shortcut = shortcut;
  const scope = normalizeScope(definition.scope, action);
  if (typeof scope !== "undefined") normalized.scope = scope;
  const enabledWhen = normalizeCondition(definition.enabledWhen, action, "enabledWhen");
  if (typeof enabledWhen !== "undefined") normalized.enabledWhen = enabledWhen;
  const visibleWhen = normalizeCondition(definition.visibleWhen, action, "visibleWhen");
  if (typeof visibleWhen !== "undefined") normalized.visibleWhen = visibleWhen;
  const checkedWhen = normalizeCondition(definition.checkedWhen, action, "checkedWhen");
  if (typeof checkedWhen !== "undefined") normalized.checkedWhen = checkedWhen;
  const permission = normalizePermission(definition.permission, action);
  if (typeof permission !== "undefined") normalized.permission = permission;
  const menuPlacement = normalizePlacementArray(definition.menuPlacement, action, "menuPlacement");
  if (typeof menuPlacement !== "undefined") normalized.menuPlacement = menuPlacement;
  const toolbarPlacement = normalizePlacementArray(definition.toolbarPlacement, action, "toolbarPlacement");
  if (typeof toolbarPlacement !== "undefined") normalized.toolbarPlacement = toolbarPlacement;
  const paletteKeywords = normalizePaletteKeywords(definition.paletteKeywords, action);
  if (typeof paletteKeywords !== "undefined") normalized.paletteKeywords = paletteKeywords;
  const state = normalizeState(definition.state, action);
  if (typeof state !== "undefined") normalized.state = state;

  return normalized;
}

function normalizeCommandId(commandId: string, action: string): string {
  assertNonEmptyString(commandId, action, "commandId");
  return commandId;
}

function normalizeSource(source: CommandSource | undefined, action: string): CommandSource | undefined {
  if (typeof source === "undefined") return undefined;
  if (!COMMAND_SOURCES.has(source)) {
    throw createError(
      "INVALID_ARGUMENT",
      `${action}: source must be one of menu/toolbar/shortcut/palette/context-menu/api.`,
    );
  }
  return source;
}

function normalizeInvocationContext(
  context: CommandInvocationContext | undefined,
  action: string,
): CommandInvocationContext | undefined {
  if (typeof context === "undefined") return undefined;
  assertPlainRecord(context, action, "context");
  assertOptionalNonEmptyString(context.pluginId, action, "context.pluginId");
  assertOptionalNonEmptyString(context.sceneId, action, "context.sceneId");
  assertOptionalNonEmptyString(context.surfaceId, action, "context.surfaceId");
  assertOptionalNonEmptyString(context.documentId, action, "context.documentId");
  return { ...context };
}

function normalizeQueryOptions(options: CommandQueryOptions | undefined, action: string): CommandQueryOptions {
  if (typeof options === "undefined") return {};
  if (!isPlainRecord(options)) {
    throw createError("INVALID_ARGUMENT", `${action}: options must be an object.`);
  }
  const typedOptions = options as CommandQueryOptions;
  assertOptionalNonEmptyString(typedOptions.ownerPluginId, action, "ownerPluginId");
  if (typeof typedOptions.includeDisabled !== "undefined" && typeof typedOptions.includeDisabled !== "boolean") {
    throw createError("INVALID_ARGUMENT", `${action}: includeDisabled must be a boolean when provided.`);
  }
  if (typeof typedOptions.includeHidden !== "undefined" && typeof typedOptions.includeHidden !== "boolean") {
    throw createError("INVALID_ARGUMENT", `${action}: includeHidden must be a boolean when provided.`);
  }

  const normalized: CommandQueryOptions = {};
  const scope = normalizeScope(typedOptions.scope, action);
  if (typeof scope !== "undefined") normalized.scope = scope;
  const source = normalizeSource(typedOptions.source, action);
  if (typeof source !== "undefined") normalized.source = source;
  if (typeof typedOptions.ownerPluginId !== "undefined") normalized.ownerPluginId = typedOptions.ownerPluginId;
  if (typeof typedOptions.includeDisabled !== "undefined") normalized.includeDisabled = typedOptions.includeDisabled;
  if (typeof typedOptions.includeHidden !== "undefined") normalized.includeHidden = typedOptions.includeHidden;
  const context = normalizeInvocationContext(typedOptions.context, action);
  if (typeof context !== "undefined") normalized.context = context;
  return normalized;
}

function normalizeInvokePayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (typeof payload === "undefined") return {};
  assertPlainRecord(payload, "command.invoke", "payload");
  return { ...payload };
}

function unwrapCommand(result: { command?: CommandView } | CommandView | undefined): CommandView | undefined {
  if (isPlainRecord(result) && Object.prototype.hasOwnProperty.call(result, "command")) {
    return result.command as CommandView | undefined;
  }
  return result as CommandView | undefined;
}

function unwrapCommandList(result: { commands?: CommandView[] } | CommandView[]): CommandView[] {
  if (Array.isArray(result)) return result;
  return result.commands ?? [];
}

export function createCommandApi(client: CoreClient): CommandApi {
  return {
    async register(definition) {
      const result = await client.invoke<CommandDefinitionInput, { command: CommandView } | CommandView>(
        "command.register",
        normalizeCommandDefinition(definition),
      );
      const command = unwrapCommand(result);
      if (!command) {
        throw createError("INVALID_RESPONSE", "command.register: response.command is required.");
      }
      return command;
    },
    async unregister(commandId) {
      await client.invoke("command.unregister", {
        commandId: normalizeCommandId(commandId, "command.unregister"),
      });
    },
    async get(commandId, options) {
      const query = normalizeQueryOptions(options, "command.get");
      const result = await client.invoke<{ commandId: string } & CommandQueryOptions, { command?: CommandView } | CommandView | undefined>(
        "command.get",
        {
          commandId: normalizeCommandId(commandId, "command.get"),
          ...query,
        },
      );
      return unwrapCommand(result);
    },
    async list(options) {
      const result = await client.invoke<CommandQueryOptions, { commands: CommandView[] } | CommandView[]>(
        "command.list",
        normalizeQueryOptions(options, "command.list"),
      );
      return unwrapCommandList(result);
    },
    async invoke(commandId, payload, options) {
      const action = "command.invoke";
      const normalizedOptions = options ?? {};
      const request: {
        commandId: string;
        payload: Record<string, unknown>;
        source?: CommandSource;
        context?: CommandInvocationContext;
      } = {
        commandId: normalizeCommandId(commandId, action),
        payload: normalizeInvokePayload(payload),
      };
      const source = normalizeSource(normalizedOptions.source, action);
      if (typeof source !== "undefined") request.source = source;
      const context = normalizeInvocationContext(normalizedOptions.context, action);
      if (typeof context !== "undefined") request.context = context;
      return client.invoke<typeof request, CommandInvokeResult>(action, request);
    },
    async setState(commandId, state, options) {
      const action = "command.setState";
      const request: {
        commandId: string;
        state: CommandState;
        context?: CommandInvocationContext;
      } = {
        commandId: normalizeCommandId(commandId, action),
        state: normalizeState(state, action) ?? {},
      };
      const context = normalizeInvocationContext(options?.context, action);
      if (typeof context !== "undefined") request.context = context;
      const result = await client.invoke<typeof request, { command?: CommandView } | CommandView | undefined>(
        action,
        request,
      );
      return unwrapCommand(result);
    },
    onRegistered(handler) {
      return client.events.on("command.registered", handler);
    },
    onUnregistered(handler) {
      return client.events.on("command.unregistered", handler);
    },
    onChanged(handler) {
      return client.events.on("command.changed", handler);
    },
    onInvoked(handler) {
      return client.events.on("command.invoked", handler);
    },
  };
}

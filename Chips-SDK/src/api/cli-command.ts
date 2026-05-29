import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";
import type { PluginType } from "./plugin";

export type CliCommandTargetType = "app" | "module";
export type CliCommandParameterType =
  | "string"
  | "stringList"
  | "number"
  | "integer"
  | "boolean"
  | "enum"
  | "path"
  | "json"
  | "jsonFile"
  | "text"
  | "textFile";

export type CliCommandUiControl =
  | "select"
  | "multiSelect"
  | "toggle"
  | "stepper"
  | "slider"
  | "pathInput"
  | "pasteBox"
  | "textarea";

export type CliCommandPathKind = "file" | "directory" | "any";
export type CliCommandPathRole = "input" | "output";
export type CliCommandOverwritePolicy = "fail" | "overwrite" | "rename" | "skip";
export type CliCommandBatchFormat = "lines" | "json-array";
export type CliCommandBatchItemType = "value" | "path";
export type CliCommandOutputMode = "human" | "json";
export type CliCommandJsonOutputPolicy = "supported" | "required" | "unsupported";
export type CliCommandSurfaceReusePolicy = "always" | "never" | "preferred";

export interface CliCommandPathRule {
  kind?: CliCommandPathKind;
  role?: CliCommandPathRole;
  exists?: boolean;
  create?: boolean;
  extensions?: string[];
  overwrite?: CliCommandOverwritePolicy;
}

export interface CliCommandBatchItemPathRule {
  kind?: CliCommandPathKind;
  exists?: boolean;
  create?: boolean;
  extensions?: string[];
}

export interface CliCommandBatchRule {
  format: CliCommandBatchFormat;
  itemType?: CliCommandBatchItemType;
  itemPath?: CliCommandBatchItemPathRule;
}

export interface CliCommandValidationRule {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface CliCommandUiHint {
  control?: CliCommandUiControl;
  choices?: unknown[];
  min?: number;
  max?: number;
  step?: number;
  placeholderKey?: string;
}

export interface CliCommandParameter {
  name: string;
  short?: string;
  position?: number;
  type: CliCommandParameterType;
  required?: boolean;
  default?: unknown;
  mapsTo?: string;
  choices?: unknown[];
  multiple?: boolean;
  validation?: CliCommandValidationRule;
  path?: CliCommandPathRule;
  batch?: CliCommandBatchRule;
  ui?: CliCommandUiHint;
}

export interface CliCommandModuleTarget {
  type: "module";
  capability: string;
  method: string;
  pluginId?: string;
  timeoutMs?: number;
}

export interface CliCommandAppTarget {
  type: "app";
  pluginId: string;
  commandId?: string;
  launchParams?: Record<string, unknown>;
  surface?: {
    open?: boolean;
    focus?: boolean;
    reuse?: CliCommandSurfaceReusePolicy;
  };
}

export type CliCommandTarget = CliCommandModuleTarget | CliCommandAppTarget;

export interface CliCommandOutput {
  mode?: CliCommandOutputMode;
  json?: CliCommandJsonOutputPolicy;
  artifacts?: string[];
}

export interface CliCommandJobPolicy {
  wait?: boolean;
  cancelOnInterrupt?: boolean;
}

export interface CliCommandConflictPolicy {
  priority?: number;
  namespace?: string;
}

export interface CliCommandDeclaration {
  commandId: string;
  commandPath: string[];
  target: CliCommandTarget;
  titleKey: string;
  descriptionKey?: string;
  examples: string[];
  permissions: string[];
  arguments: CliCommandParameter[];
  options: CliCommandParameter[];
  output?: CliCommandOutput;
  job?: CliCommandJobPolicy;
  conflict?: CliCommandConflictPolicy;
}

export interface CliCommandOwner {
  pluginId: string;
  pluginType: PluginType;
  pluginName: string;
  pluginVersion: string;
  source?: "official" | "third-party" | "local";
}

export interface CliCommandConflict {
  commandPathKey: string;
  enabledCommandIds: string[];
  allCommandIds: string[];
}

export interface CliCommandView {
  commandId: string;
  commandPath: string[];
  commandPathKey: string;
  owner: CliCommandOwner;
  enabled: boolean;
  declaration: CliCommandDeclaration;
  conflicts: CliCommandConflict[];
}

export interface CliCommandIndex {
  schemaVersion: 1;
  version: string;
  updatedAt: string;
  workspacePath: string;
  commands: CliCommandView[];
  conflicts: CliCommandConflict[];
}

export interface CliCommandQueryOptions {
  commandPath?: string | string[];
  commandId?: string;
  pluginId?: string;
  targetType?: CliCommandTargetType;
  includeDisabled?: boolean;
}

export interface CliCommandListResult {
  index: CliCommandIndex;
  commands: CliCommandView[];
}

export interface CliCommandResolveResult {
  command?: CliCommandView;
  conflicts: CliCommandConflict[];
}

export interface CliCommandApi {
  list(options?: CliCommandQueryOptions): Promise<CliCommandListResult>;
  get(options: CliCommandQueryOptions): Promise<CliCommandView | undefined>;
  resolve(options: CliCommandQueryOptions): Promise<CliCommandResolveResult>;
}

const TARGET_TYPES = new Set<CliCommandTargetType>(["app", "module"]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function assertOptionalNonEmptyString(value: unknown, action: string, field: string): void {
  if (typeof value !== "undefined" && (typeof value !== "string" || value.trim().length === 0)) {
    throw createError("INVALID_ARGUMENT", `${action}: ${field} must be a non-empty string when provided.`);
  }
}

function normalizeCommandPath(value: string | string[] | undefined, action: string): string | string[] | undefined {
  if (typeof value === "undefined") return undefined;
  if (typeof value === "string") {
    if (value.trim().length === 0) {
      throw createError("INVALID_ARGUMENT", `${action}: commandPath must be non-empty when provided.`);
    }
    return value;
  }
  if (!Array.isArray(value) || value.some((segment) => typeof segment !== "string" || segment.trim().length === 0)) {
    throw createError("INVALID_ARGUMENT", `${action}: commandPath must be a string or string array.`);
  }
  return [...value];
}

function normalizeQueryOptions(options: CliCommandQueryOptions | undefined, action: string): CliCommandQueryOptions {
  if (typeof options === "undefined") return {};
  if (!isPlainRecord(options)) {
    throw createError("INVALID_ARGUMENT", `${action}: options must be an object.`);
  }
  const commandPathValue = options.commandPath;
  const commandIdValue = options.commandId;
  const pluginIdValue = options.pluginId;
  const targetTypeValue = options.targetType;
  const includeDisabledValue = options.includeDisabled;

  assertOptionalNonEmptyString(commandIdValue, action, "commandId");
  assertOptionalNonEmptyString(pluginIdValue, action, "pluginId");
  if (
    typeof targetTypeValue !== "undefined" &&
    (typeof targetTypeValue !== "string" || !TARGET_TYPES.has(targetTypeValue as CliCommandTargetType))
  ) {
    throw createError("INVALID_ARGUMENT", `${action}: targetType must be app or module when provided.`);
  }
  if (typeof includeDisabledValue !== "undefined" && typeof includeDisabledValue !== "boolean") {
    throw createError("INVALID_ARGUMENT", `${action}: includeDisabled must be a boolean when provided.`);
  }
  const normalized: CliCommandQueryOptions = {};
  const commandPath =
    typeof commandPathValue === "undefined"
      ? undefined
      : normalizeCommandPath(commandPathValue as string | string[], action);
  if (typeof commandPath !== "undefined") normalized.commandPath = commandPath;
  if (typeof commandIdValue === "string") normalized.commandId = commandIdValue;
  if (typeof pluginIdValue === "string") normalized.pluginId = pluginIdValue;
  if (targetTypeValue === "app" || targetTypeValue === "module") normalized.targetType = targetTypeValue;
  if (typeof includeDisabledValue === "boolean") normalized.includeDisabled = includeDisabledValue;
  return normalized;
}

function ensureIdentifier(options: CliCommandQueryOptions, action: string): void {
  if (!options.commandId && !options.commandPath) {
    throw createError("INVALID_ARGUMENT", `${action}: commandId or commandPath is required.`);
  }
}

export function createCliCommandApi(client: CoreClient): CliCommandApi {
  return {
    async list(options) {
      return client.invoke<CliCommandQueryOptions, CliCommandListResult>(
        "cli.command.list",
        normalizeQueryOptions(options, "cli.command.list"),
      );
    },
    async get(options) {
      const request = normalizeQueryOptions(options, "cli.command.get");
      ensureIdentifier(request, "cli.command.get");
      const result = await client.invoke<CliCommandQueryOptions, { command?: CliCommandView }>(
        "cli.command.get",
        request,
      );
      return result.command;
    },
    async resolve(options) {
      const request = normalizeQueryOptions(options, "cli.command.resolve");
      ensureIdentifier(request, "cli.command.resolve");
      return client.invoke<CliCommandQueryOptions, CliCommandResolveResult>(
        "cli.command.resolve",
        request,
      );
    },
  };
}

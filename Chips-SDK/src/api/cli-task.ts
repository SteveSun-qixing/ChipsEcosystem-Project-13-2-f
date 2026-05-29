import type { CoreClient } from "../types/client";
import { createError, type StandardError } from "../types/errors";

export type CliTaskStatus = "running" | "completed" | "failed" | "cancelled";

export interface CliTaskRecord {
  taskId: string;
  pluginId: string;
  commandId: string;
  commandPath?: string[];
  invocationId?: string;
  surfaceId?: string;
  sessionId?: string;
  status: CliTaskStatus;
  createdAt: number;
  updatedAt: number;
  progress?: Record<string, unknown>;
  output?: unknown;
  error?: StandardError;
}

export interface CliTaskCreateInput {
  pluginId: string;
  commandId: string;
  commandPath?: string[];
  surfaceId?: string;
  sessionId?: string;
}

export interface CliTaskBindInvocationInput {
  taskId: string;
  invocationId?: string;
  surfaceId?: string;
  sessionId?: string;
}

export interface CliTaskApi {
  create(input: CliTaskCreateInput): Promise<CliTaskRecord>;
  bindInvocation(input: CliTaskBindInvocationInput): Promise<CliTaskRecord>;
  get(taskId: string): Promise<CliTaskRecord>;
  progress(taskId: string, progress: Record<string, unknown>): Promise<CliTaskRecord>;
  complete(taskId: string, output?: unknown): Promise<CliTaskRecord>;
  fail(taskId: string, error: unknown): Promise<CliTaskRecord>;
  cancel(taskId: string): Promise<CliTaskRecord>;
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createError("INVALID_ARGUMENT", `${action}: ${field} must be an object.`);
  }
}

function normalizeCommandPath(value: string[] | undefined, action: string): string[] | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw createError("INVALID_ARGUMENT", `${action}: commandPath must be a non-empty string[].`);
  }
  return value.map((item) => item.trim());
}

function isCliTaskRecord(value: unknown): value is CliTaskRecord {
  return !!value && typeof value === "object" && "taskId" in value;
}

function unwrapTask(result: { task?: CliTaskRecord } | CliTaskRecord): CliTaskRecord {
  if (isCliTaskRecord(result)) {
    return result;
  }
  if (result && typeof result === "object" && "task" in result) {
    if (!result.task) {
      throw createError("INVALID_RESPONSE", "cli.task: response.task is required.");
    }
    return result.task;
  }
  throw createError("INVALID_RESPONSE", "cli.task: response.task is required.");
}

export function createCliTaskApi(client: CoreClient): CliTaskApi {
  return {
    async create(input) {
      const action = "cli.task.create";
      assertNonEmptyString(input?.pluginId, action, "pluginId");
      assertNonEmptyString(input?.commandId, action, "commandId");
      assertOptionalNonEmptyString(input.surfaceId, action, "surfaceId");
      assertOptionalNonEmptyString(input.sessionId, action, "sessionId");
      const request = {
        pluginId: input.pluginId.trim(),
        commandId: input.commandId.trim(),
        commandPath: normalizeCommandPath(input.commandPath, action),
        surfaceId: input.surfaceId,
        sessionId: input.sessionId,
      };
      const result = await client.invoke<typeof request, { task: CliTaskRecord }>(action, request);
      return unwrapTask(result);
    },
    async bindInvocation(input) {
      const action = "cli.task.bindInvocation";
      assertNonEmptyString(input?.taskId, action, "taskId");
      assertOptionalNonEmptyString(input.invocationId, action, "invocationId");
      assertOptionalNonEmptyString(input.surfaceId, action, "surfaceId");
      assertOptionalNonEmptyString(input.sessionId, action, "sessionId");
      const result = await client.invoke<typeof input, { task: CliTaskRecord }>(action, input);
      return unwrapTask(result);
    },
    async get(taskId) {
      const action = "cli.task.get";
      assertNonEmptyString(taskId, action, "taskId");
      const result = await client.invoke<{ taskId: string }, { task: CliTaskRecord }>(action, { taskId });
      return unwrapTask(result);
    },
    async progress(taskId, progress) {
      const action = "cli.task.progress";
      assertNonEmptyString(taskId, action, "taskId");
      assertPlainRecord(progress, action, "progress");
      const result = await client.invoke<
        { taskId: string; progress: Record<string, unknown> },
        { task: CliTaskRecord }
      >(action, { taskId, progress });
      return unwrapTask(result);
    },
    async complete(taskId, output) {
      const action = "cli.task.complete";
      assertNonEmptyString(taskId, action, "taskId");
      const result = await client.invoke<{ taskId: string; output?: unknown }, { task: CliTaskRecord }>(
        action,
        typeof output === "undefined" ? { taskId } : { taskId, output },
      );
      return unwrapTask(result);
    },
    async fail(taskId, error) {
      const action = "cli.task.fail";
      assertNonEmptyString(taskId, action, "taskId");
      const result = await client.invoke<{ taskId: string; error: unknown }, { task: CliTaskRecord }>(
        action,
        { taskId, error },
      );
      return unwrapTask(result);
    },
    async cancel(taskId) {
      const action = "cli.task.cancel";
      assertNonEmptyString(taskId, action, "taskId");
      const result = await client.invoke<{ taskId: string }, { task: CliTaskRecord }>(action, { taskId });
      return unwrapTask(result);
    },
  };
}

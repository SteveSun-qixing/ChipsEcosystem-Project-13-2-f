import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  traceId: string;
  requestId: string;
  pluginId?: string;
  namespace?: string;
  action?: string;
  durationMs?: number;
  result?: "success" | "error";
  errorCode?: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface LogWriteInput {
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LogQueryOptions {
  level?: LogLevel;
  requestId?: string;
}

export interface LogApi {
  write(input: LogWriteInput): Promise<LogEntry>;
  query(options?: LogQueryOptions): Promise<LogEntry[]>;
  export(): Promise<string>;
}

function assertLogLevel(level: unknown, action: string): asserts level is LogLevel {
  if (level !== "debug" && level !== "info" && level !== "warn" && level !== "error") {
    throw createError("INVALID_ARGUMENT", `${action}: level must be one of debug/info/warn/error.`);
  }
}

export function createLogApi(client: CoreClient): LogApi {
  return {
    async write(input) {
      assertLogLevel(input?.level, "log.write");
      if (!input.message || input.message.trim().length === 0) {
        throw createError("INVALID_ARGUMENT", "log.write: message is required.");
      }
      const result = await client.invoke<LogWriteInput, { entry: LogEntry }>("log.write", {
        level: input.level,
        message: input.message,
        ...(input.metadata ? { metadata: input.metadata } : undefined),
      });
      return result.entry;
    },
    async query(options) {
      if (options?.level) {
        assertLogLevel(options.level, "log.query");
      }
      const result = await client.invoke<LogQueryOptions, { entries: LogEntry[] }>(
        "log.query",
        options ?? {},
      );
      return result.entries;
    },
    async export() {
      const result = await client.invoke<Record<string, never>, { payload: string }>("log.export", {});
      return result.payload;
    },
  };
}

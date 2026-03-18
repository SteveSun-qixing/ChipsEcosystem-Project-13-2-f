export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, extra?: unknown): void;
  info(message: string, extra?: unknown): void;
  warn(message: string, extra?: unknown): void;
  error(message: string, extra?: unknown): void;
}

function formatExtra(extra: unknown): string {
  if (extra === undefined) {
    return "";
  }
  return ` ${JSON.stringify(extra)}`;
}

export function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`;

  function write(level: LogLevel, message: string, extra?: unknown): void {
    const content = `${prefix} ${level.toUpperCase()}: ${message}${formatExtra(extra)}`;
    // eslint-disable-next-line no-console
    console.log(content);
  }

  return {
    debug(message, extra) {
      write("debug", message, extra);
    },
    info(message, extra) {
      write("info", message, extra);
    },
    warn(message, extra) {
      write("warn", message, extra);
    },
    error(message, extra) {
      write("error", message, extra);
    },
  };
}

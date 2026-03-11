export type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  scope?: string;
}

function serialize(extra: unknown): string {
  if (extra === undefined) {
    return "";
  }
  try {
    return ` ${JSON.stringify(extra)}`;
  } catch {
    return " [unserializable]";
  }
}

export function createLogger(scope?: string) {
  const prefix = scope ? `[${scope}]` : "[eco-settings-panel]";

  function write(level: LogLevel, message: string, extra?: unknown) {
    console.log(`${prefix} ${level.toUpperCase()}: ${message}${serialize(extra)}`);
  }

  return {
    debug: (message: string, extra?: unknown) => write("debug", message, extra),
    info: (message: string, extra?: unknown) => write("info", message, extra),
    warn: (message: string, extra?: unknown) => write("warn", message, extra),
    error: (message: string, extra?: unknown) => write("error", message, extra),
  };
}

export function createScopedLogger(options: LoggerOptions) {
  return createLogger(options.scope);
}

export interface StandardError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  requestId?: string;
  traceId?: string;
}

export function isStandardError(err: unknown): err is StandardError {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  return typeof e.code === "string" && typeof e.message === "string";
}

export function createError(
  code: string,
  message: string,
  details?: unknown,
  retryable?: boolean,
): StandardError {
  return { code, message, details, retryable };
}


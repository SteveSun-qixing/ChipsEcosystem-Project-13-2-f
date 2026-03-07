import type { StandardError } from "./types.js";

export function createError(
  code: string,
  message: string,
  details?: unknown,
): StandardError {
  const err = new Error(message) as StandardError;
  err.code = code;
  if (details !== undefined) {
    err.details = details;
  }
  return err;
}


import type { StandardError } from "./types";

export function createStandardError(
  code: string,
  message: string,
  details?: unknown
): StandardError {
  const error = new Error(message) as StandardError;
  error.code = code;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}


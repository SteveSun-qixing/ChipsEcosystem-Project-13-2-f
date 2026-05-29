export type IconMakerErrorCode =
  | "ICON_MAKER_INPUT_INVALID"
  | "ICON_MAKER_INPUT_NOT_FOUND"
  | "ICON_MAKER_OUTPUT_INVALID"
  | "ICON_MAKER_RENDER_FAILED"
  | "ICON_MAKER_WRITE_FAILED"
  | "ICON_MAKER_JOB_CANCELLED";

export interface IconMakerError extends Error {
  code: IconMakerErrorCode;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export const createIconMakerError = (
  code: IconMakerErrorCode,
  message: string,
  details?: Record<string, unknown>,
  cause?: unknown,
): IconMakerError => {
  const error = new Error(message) as IconMakerError;
  error.name = "IconMakerError";
  error.code = code;
  if (details) {
    error.details = details;
  }
  if (cause !== undefined) {
    error.cause = cause;
  }
  return error;
};

export type ColorPickerErrorCode =
  | "COLOR_PICKER_INPUT_INVALID"
  | "COLOR_PICKER_INPUT_NOT_FOUND"
  | "COLOR_PICKER_IMAGE_EMPTY"
  | "COLOR_PICKER_IMAGE_SAMPLE_FAILED"
  | "COLOR_PICKER_IMAGE_SAMPLE_INVALID"
  | "COLOR_PICKER_IMAGE_SAMPLE_UNSUPPORTED"
  | "COLOR_PICKER_PNG_INVALID"
  | "COLOR_PICKER_ANALYSIS_FAILED";

export interface ColorPickerError extends Error {
  code: ColorPickerErrorCode;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export const createColorPickerError = (
  code: ColorPickerErrorCode,
  message: string,
  details?: Record<string, unknown>,
  cause?: unknown,
): ColorPickerError => {
  const error = new Error(message) as ColorPickerError;
  error.name = "ColorPickerError";
  error.code = code;
  if (details) {
    error.details = details;
  }
  if (cause !== undefined) {
    error.cause = cause;
  }
  return error;
};

export const asErrorCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const code = (value as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

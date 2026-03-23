export interface ConversionError extends Error {
  code: string;
  details?: unknown;
  retryable?: boolean;
}

export const createConversionError = (
  code: string,
  message: string,
  details?: unknown,
  retryable?: boolean,
): ConversionError => {
  const error = new Error(message) as ConversionError;
  error.code = code;
  if (typeof details !== "undefined") {
    error.details = details;
  }
  if (typeof retryable !== "undefined") {
    error.retryable = retryable;
  }
  return error;
};

export const isConversionError = (value: unknown): value is ConversionError => {
  return value instanceof Error && typeof (value as Partial<ConversionError>).code === "string";
};

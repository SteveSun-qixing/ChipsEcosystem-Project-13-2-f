export interface HtmlToPdfError extends Error {
  code: string;
  details?: unknown;
  retryable?: boolean;
}

export interface HtmlToPdfWarning {
  code: string;
  message: string;
  details?: unknown;
}

export const createHtmlToPdfError = (
  code: string,
  message: string,
  details?: unknown,
  retryable?: boolean,
): HtmlToPdfError => {
  const error = new Error(message) as HtmlToPdfError;
  error.code = code;
  error.details = details;
  error.retryable = retryable;
  return error;
};

export const isHtmlToPdfError = (value: unknown): value is HtmlToPdfError => {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as { code?: unknown }).code === "string" &&
    String((value as { code?: unknown }).code).startsWith("CONVERTER_")
  );
};

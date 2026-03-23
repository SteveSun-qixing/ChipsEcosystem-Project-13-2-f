export interface HtmlToImageError extends Error {
  code: string;
  details?: unknown;
  retryable?: boolean;
}

export interface HtmlToImageWarning {
  code: string;
  message: string;
  details?: unknown;
}

export const createHtmlToImageError = (
  code: string,
  message: string,
  details?: unknown,
  retryable?: boolean,
): HtmlToImageError => {
  const error = new Error(message) as HtmlToImageError;
  error.code = code;
  error.details = details;
  error.retryable = retryable;
  return error;
};

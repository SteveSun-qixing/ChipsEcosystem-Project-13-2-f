export interface CardToHtmlError extends Error {
  code: string;
  details?: unknown;
  retryable?: boolean;
}

export interface CardToHtmlWarning {
  code: string;
  message: string;
  details?: unknown;
}

export const createCardToHtmlError = (
  code: string,
  message: string,
  details?: unknown,
  retryable?: boolean,
): CardToHtmlError => {
  const error = new Error(message) as CardToHtmlError;
  error.code = code;
  error.details = details;
  error.retryable = retryable;
  return error;
};

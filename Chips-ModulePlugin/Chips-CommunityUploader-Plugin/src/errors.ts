export interface CommunityUploaderError extends Error {
  code: string;
  details?: unknown;
  retryable?: boolean;
}

export interface CommunityUploaderWarning {
  code: string;
  message: string;
  details?: unknown;
}

export const createCommunityUploaderError = (
  code: string,
  message: string,
  details?: unknown,
  retryable?: boolean,
): CommunityUploaderError => {
  const error = new Error(message) as CommunityUploaderError;
  error.code = code;
  error.details = details;
  error.retryable = retryable;
  return error;
};

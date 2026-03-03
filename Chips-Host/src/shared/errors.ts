import type { StandardError } from './types';

export class ChipsError extends Error {
  public readonly standard: StandardError;

  public constructor(error: StandardError) {
    super(error.message);
    this.name = 'ChipsError';
    this.standard = error;
  }
}

export const toStandardError = (error: unknown, fallbackCode = 'INTERNAL_ERROR'): StandardError => {
  if (isStandardError(error)) {
    return error;
  }

  if (error instanceof ChipsError) {
    return error.standard;
  }

  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack
      },
      retryable: false
    };
  }

  return {
    code: fallbackCode,
    message: 'Unknown error',
    details: error,
    retryable: false
  };
};

export const isStandardError = (value: unknown): value is StandardError => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
};

export const createError = (
  code: string,
  message: string,
  details?: unknown,
  retryable = false
): StandardError => ({
  code,
  message,
  details,
  retryable
});

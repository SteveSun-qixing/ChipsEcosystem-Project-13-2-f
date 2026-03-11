export interface SettingsPanelError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export function normalizeSettingsError(error: unknown, fallbackMessage: string): SettingsPanelError {
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    return {
      code: typeof candidate.code === "string" ? candidate.code : "UNKNOWN_ERROR",
      message: typeof candidate.message === "string" ? candidate.message : fallbackMessage,
      retryable: candidate.retryable === true,
      details: candidate.details,
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message || fallbackMessage,
      retryable: false,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: fallbackMessage,
    retryable: false,
    details: error,
  };
}

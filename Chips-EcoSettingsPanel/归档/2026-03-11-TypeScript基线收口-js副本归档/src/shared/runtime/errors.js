export function normalizeSettingsError(error, fallbackMessage) {
    if (error && typeof error === "object") {
        const candidate = error;
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

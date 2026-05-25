import type { PermissionDiagnostic } from "chips-sdk";

export interface SettingsPanelError {
  code: string;
  message: string;
  messageKey?: string;
  retryable: boolean;
  details?: unknown;
  requestId?: string;
  traceId?: string;
  permission?: PermissionDiagnostic;
}

export function normalizeSettingsError(error: unknown, fallbackMessage: string): SettingsPanelError {
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    const messageKey = typeof candidate.messageKey === "string" ? candidate.messageKey : undefined;
    const requestId = typeof candidate.requestId === "string" ? candidate.requestId : undefined;
    const traceId = typeof candidate.traceId === "string" ? candidate.traceId : undefined;
    const permission = normalizePermissionDiagnostic(candidate.permission);
    const normalized: SettingsPanelError = {
      code: typeof candidate.code === "string" ? candidate.code : "UNKNOWN_ERROR",
      message: typeof candidate.message === "string" ? candidate.message : fallbackMessage,
      retryable: candidate.retryable === true,
    };
    if (messageKey) normalized.messageKey = messageKey;
    if (typeof candidate.details !== "undefined") normalized.details = candidate.details;
    if (requestId) normalized.requestId = requestId;
    if (traceId) normalized.traceId = traceId;
    if (permission) normalized.permission = permission;
    return normalized;
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

function normalizePermissionDiagnostic(permission: unknown): PermissionDiagnostic | undefined {
  if (!permission || typeof permission !== "object" || Array.isArray(permission)) {
    return undefined;
  }

  const candidate = permission as Record<string, unknown>;
  const required = normalizeStringList(candidate.required);
  const granted = normalizeStringList(candidate.granted);

  if (required.length === 0) {
    return undefined;
  }

  const diagnostic: PermissionDiagnostic = {
    required,
    granted,
  };
  const domain = normalizeOptionalString(candidate.domain);
  const action = normalizeOptionalString(candidate.action);
  const resource = normalizeOptionalString(candidate.resource);
  const messageKey = normalizeOptionalString(candidate.messageKey);
  const callerId = normalizeOptionalString(candidate.callerId);
  const callerType = normalizeOptionalString(candidate.callerType);
  const pluginId = normalizeOptionalString(candidate.pluginId);

  if (domain) diagnostic.domain = domain;
  if (action) diagnostic.action = action;
  if (resource) diagnostic.resource = resource;
  if (messageKey) diagnostic.messageKey = messageKey;
  if (callerId) diagnostic.callerId = callerId;
  if (callerType) diagnostic.callerType = callerType;
  if (pluginId) diagnostic.pluginId = pluginId;

  return diagnostic;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

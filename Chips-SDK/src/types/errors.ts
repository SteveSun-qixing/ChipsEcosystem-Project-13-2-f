export interface StandardError {
  code: string;
  message: string;
  messageKey?: string;
  details?: unknown;
  retryable?: boolean;
  requestId?: string;
  traceId?: string;
  permission?: PermissionDiagnostic;
}

export interface PermissionDiagnostic {
  domain?: string;
  action?: string;
  resource?: string;
  required: string[];
  granted: string[];
  messageKey?: string;
  callerId?: string;
  callerType?: string;
  pluginId?: string;
}

export function isStandardError(err: unknown): err is StandardError {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  return typeof e.code === "string" && typeof e.message === "string";
}

export function createError(
  code: string,
  message: string,
  details?: unknown,
  retryable?: boolean,
  options: {
    messageKey?: string;
    requestId?: string;
    traceId?: string;
    permission?: PermissionDiagnostic;
  } = {},
): StandardError {
  return {
    code,
    message,
    messageKey: options.messageKey,
    details,
    retryable,
    requestId: options.requestId,
    traceId: options.traceId,
    permission: options.permission,
  };
}

export function normalizeStandardError(
  err: unknown,
  fallbackMessage = "Unknown error during SDK invocation.",
  fallbackCode = "INTERNAL_ERROR",
  context: { requestId?: string; traceId?: string; action?: string } = {},
): StandardError {
  const candidate = toRecord(err);
  const details = candidate?.details;
  const permission = normalizePermissionDiagnostic(
    candidate?.permission,
    details,
    typeof candidate?.code === "string" ? candidate.code : undefined,
    context.action,
  );

  if (isStandardError(err)) {
    return withRuntimeContext(
      {
        code: err.code,
        message: err.message,
        messageKey: asString(candidate?.messageKey),
        details: err.details,
        retryable: candidate?.retryable === true,
        requestId: asString(candidate?.requestId),
        traceId: asString(candidate?.traceId),
        permission,
      },
      context,
    );
  }

  if (typeof candidate?.code === "string" || typeof candidate?.message === "string") {
    return withRuntimeContext(
      {
        code: typeof candidate.code === "string" ? candidate.code : fallbackCode,
        message: typeof candidate.message === "string" ? candidate.message : fallbackMessage,
        messageKey: asString(candidate.messageKey),
        details,
        retryable: candidate.retryable === true,
        requestId: asString(candidate.requestId),
        traceId: asString(candidate.traceId),
        permission,
      },
      context,
    );
  }

  if (err instanceof Error) {
    return withRuntimeContext(
      {
        code: fallbackCode,
        message: err.message || fallbackMessage,
        details: {
          name: err.name,
          stack: err.stack,
        },
        retryable: false,
      },
      context,
    );
  }

  return withRuntimeContext(
    {
      code: fallbackCode,
      message: fallbackMessage,
      details: err,
      retryable: false,
    },
    context,
  );
}

export function isPermissionDeniedError(err: unknown): err is StandardError {
  if (!isStandardError(err)) return false;
  return err.code === "PERMISSION_DENIED" || err.code === "SERVICE_PERMISSION_DENIED";
}

function withRuntimeContext(
  error: StandardError,
  context: { requestId?: string; traceId?: string },
): StandardError {
  return {
    ...error,
    requestId: error.requestId ?? context.requestId,
    traceId: error.traceId ?? context.traceId,
    permission:
      error.permission && error.permission.required.length > 0
        ? error.permission
        : undefined,
  };
}

function normalizePermissionDiagnostic(
  permission: unknown,
  details: unknown,
  code?: string,
  action?: string,
): PermissionDiagnostic | undefined {
  if (code !== "PERMISSION_DENIED" && code !== "SERVICE_PERMISSION_DENIED" && !permission) {
    return undefined;
  }

  const permissionRecord = toRecord(permission);
  const detailsRecord = toRecord(details);
  const required = normalizeStringArray(
    permissionRecord?.required ??
      detailsRecord?.required ??
      permissionRecord?.permission ??
      detailsRecord?.permission,
  );
  const granted = normalizeStringArray(permissionRecord?.granted ?? detailsRecord?.granted);

  if (required.length === 0 && !permissionRecord && !detailsRecord) {
    return undefined;
  }

  return {
    domain: asString(permissionRecord?.domain ?? detailsRecord?.domain),
    action: asString(permissionRecord?.action ?? detailsRecord?.action ?? action),
    resource: asString(permissionRecord?.resource ?? detailsRecord?.resource),
    required,
    granted,
    messageKey:
      asString(permissionRecord?.messageKey ?? detailsRecord?.messageKey) ??
      "chips.error.permissionDenied",
    callerId: asString(permissionRecord?.callerId ?? detailsRecord?.callerId),
    callerType: asString(permissionRecord?.callerType ?? detailsRecord?.callerType),
    pluginId: asString(permissionRecord?.pluginId ?? detailsRecord?.pluginId),
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }
  return [];
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

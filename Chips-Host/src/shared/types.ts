export type CallerType = 'kernel' | 'service' | 'plugin' | 'app';

export interface CallerInfo {
  id: string;
  type: CallerType;
  pluginId?: string;
  windowId?: string;
  permissions?: string[];
}

export interface RouteInvocationContext {
  requestId: string;
  caller: CallerInfo;
  timestamp: number;
  deadline?: number;
}

export interface StandardError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export interface EventPayload<T = unknown> {
  id: string;
  name: string;
  source: string;
  data: T;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface RouteDescriptor<I, O> {
  key: `${string}.${string}`;
  schemaIn: string;
  schemaOut: string;
  permission: string[];
  timeoutMs: number;
  idempotent: boolean;
  retries: 0 | 1 | 2 | 3;
  handler: (input: I, ctx: RouteInvocationContext) => Promise<O>;
}

export type LifecycleState =
  | 'unloaded'
  | 'loading'
  | 'ready'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

export interface LogEntry {
  traceId: string;
  requestId: string;
  pluginId?: string;
  namespace?: string;
  action?: string;
  durationMs?: number;
  result?: 'success' | 'error';
  errorCode?: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ServiceActionDefinition {
  descriptor: RouteDescriptor<any, any>;
}

export interface ServiceRegistration {
  name: string;
  actions: Record<string, ServiceActionDefinition>;
}

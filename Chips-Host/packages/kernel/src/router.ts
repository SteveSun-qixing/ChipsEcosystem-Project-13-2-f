import { PermissionGuard } from '../../common-basics/src';
import { createError, toStandardError } from '../../../src/shared/errors';
import { schemaRegistry } from '../../../src/shared/schema';
import { now, sleep } from '../../../src/shared/utils';
import type { RouteDescriptor, RouteInvocationContext, StandardError } from '../../../src/shared/types';

interface RouteCircuitState {
  failures: number;
  lastFailureAt: number;
  openUntil?: number;
}

export class KernelRouter {
  private readonly descriptors = new Map<string, RouteDescriptor<unknown, unknown>>();
  private readonly permissionGuard = new PermissionGuard();
  private readonly circuitByKey = new Map<string, RouteCircuitState>();
  private readonly replayByOperation = new Map<string, number>();
  private readonly failureThreshold: number;
  private readonly coolDownMs: number;
  private readonly replayWindowMs: number;

  public constructor(options?: { failureThreshold?: number; coolDownMs?: number; replayWindowMs?: number }) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.coolDownMs = options?.coolDownMs ?? 5_000;
    this.replayWindowMs = options?.replayWindowMs ?? 10 * 60_000;
  }

  public register<I, O>(descriptor: RouteDescriptor<I, O>): void {
    if (this.descriptors.has(descriptor.key)) {
      throw createError('ROUTE_DUPLICATE', `Route already registered: ${descriptor.key}`);
    }
    this.descriptors.set(descriptor.key, descriptor as RouteDescriptor<unknown, unknown>);
  }

  public listRoutes(): string[] {
    return [...this.descriptors.keys()].sort();
  }

  public async invoke<TInput, TOutput>(
    key: string,
    input: TInput,
    context: RouteInvocationContext
  ): Promise<TOutput> {
    const descriptor = this.lookup(key);
    if (!descriptor) {
      throw createError('ROUTE_NOT_FOUND', `Route not found: ${key}`);
    }

    this.guardCircuit(descriptor.key);
    this.guardPermissions(descriptor.permission, context);

    schemaRegistry.validate(descriptor.schemaIn, input);
    this.guardReplay(descriptor, context);

    const started = now();
    let attempt = 0;
    const maxAttempts = descriptor.idempotent ? descriptor.retries + 1 : 1;
    let lastError: StandardError | undefined;

    while (attempt < maxAttempts) {
      try {
        const output = await this.invokeWithTimeout(descriptor, input, context);
        schemaRegistry.validate(descriptor.schemaOut, output);
        this.markSuccess(descriptor.key);
        return output as TOutput;
      } catch (error) {
        const standard = toStandardError(error, 'ROUTE_EXECUTION_FAILED');
        this.markFailure(descriptor.key);

        lastError = standard;
        if (!descriptor.idempotent || !standard.retryable || attempt + 1 >= maxAttempts) {
          break;
        }

        const backoff = 100 * 2 ** attempt;
        await sleep(backoff);
      }

      attempt += 1;
    }

    const duration = now() - started;
    throw {
      ...(lastError ?? createError('ROUTE_EXECUTION_FAILED', 'Route execution failed')),
      details: {
        durationMs: duration,
        route: descriptor.key,
        lastError: lastError?.details
      }
    } satisfies StandardError;
  }

  private async invokeWithTimeout(
    descriptor: RouteDescriptor<unknown, unknown>,
    input: unknown,
    context: RouteInvocationContext
  ): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(createError('ROUTE_TIMEOUT', `Route timeout: ${descriptor.key}`, { timeoutMs: descriptor.timeoutMs }, true));
      }, descriptor.timeoutMs);

      descriptor
        .handler(input, context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private lookup(key: string): RouteDescriptor<unknown, unknown> | undefined {
    const exact = this.descriptors.get(key);
    if (exact) {
      return exact;
    }

    const candidates = [...this.descriptors.values()];
    for (const descriptor of candidates) {
      if (descriptor.key.endsWith('.*')) {
        const prefix = descriptor.key.slice(0, -2);
        if (key.startsWith(prefix)) {
          return descriptor;
        }
      }
      if (descriptor.key === '*.*') {
        return descriptor;
      }
    }

    return undefined;
  }

  private guardPermissions(required: string[], context: RouteInvocationContext): void {
    if (!this.permissionGuard.check(required, context.caller.permissions)) {
      throw createError('PERMISSION_DENIED', 'Caller does not have required permissions', {
        required,
        granted: context.caller.permissions
      });
    }
  }

  private guardCircuit(key: string): void {
    const state = this.circuitByKey.get(key);
    if (!state || !state.openUntil) {
      return;
    }

    if (state.openUntil > now()) {
      throw createError('RUNTIME_CIRCUIT_OPEN', `Circuit is open for route: ${key}`, {
        openUntil: state.openUntil
      }, true);
    }

    state.openUntil = undefined;
  }

  private guardReplay(descriptor: RouteDescriptor<unknown, unknown>, context: RouteInvocationContext): void {
    if (descriptor.idempotent) {
      return;
    }

    const current = now();
    this.pruneReplayWindow(current);

    const operationKey = `${descriptor.key}:${context.caller.type}:${context.caller.id}:${context.requestId}`;
    const expireAt = this.replayByOperation.get(operationKey);
    if (expireAt && expireAt > current) {
      throw createError('ROUTE_REPLAY_DETECTED', `Duplicate request detected for route: ${descriptor.key}`, {
        route: descriptor.key,
        requestId: context.requestId,
        callerId: context.caller.id,
        expireAt
      });
    }

    this.replayByOperation.set(operationKey, current + this.replayWindowMs);
  }

  private pruneReplayWindow(current: number): void {
    for (const [operationKey, expireAt] of this.replayByOperation.entries()) {
      if (expireAt <= current) {
        this.replayByOperation.delete(operationKey);
      }
    }
  }

  private markSuccess(key: string): void {
    this.circuitByKey.set(key, {
      failures: 0,
      lastFailureAt: 0,
      openUntil: undefined
    });
  }

  private markFailure(key: string): void {
    const current = this.circuitByKey.get(key) ?? {
      failures: 0,
      lastFailureAt: 0,
      openUntil: undefined
    };

    const failures = current.failures + 1;
    const failureAt = now();

    const openUntil = failures >= this.failureThreshold ? failureAt + this.coolDownMs : current.openUntil;

    this.circuitByKey.set(key, {
      failures,
      lastFailureAt: failureAt,
      openUntil
    });
  }
}

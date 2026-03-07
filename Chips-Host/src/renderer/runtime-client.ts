import { createError, isStandardError, toStandardError } from '../shared/errors';
import { sleep } from '../shared/utils';
import type { StandardError } from '../shared/types';
import type { ChipsBridge } from '../../packages/bridge-api/src';

export interface RuntimeClientOptions {
  defaultTimeout: number;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  retryBackoff: number;
}

export interface InvokeRequest {
  action: string;
  payload?: unknown;
  timeoutMs?: number;
}

const ACTION_ALIASES: Record<string, string> = {
  'theme.getCSS': 'theme.getAllCss',
  'theme.setCurrent': 'theme.apply',
  'i18n.getCurrentLanguage': 'i18n.getCurrent',
  'i18n.setLanguage': 'i18n.setCurrent',
  'dialog.openFile': 'platform.dialogOpenFile',
  'dialog.saveFile': 'platform.dialogSaveFile',
  'dialog.showMessage': 'platform.dialogShowMessage',
  'dialog.showConfirm': 'platform.dialogShowConfirm',
  'clipboard.read': 'platform.clipboardRead',
  'clipboard.write': 'platform.clipboardWrite',
  'shell.openPath': 'platform.shellOpenPath',
  'shell.openExternal': 'platform.shellOpenExternal',
  'shell.showItemInFolder': 'platform.shellShowItemInFolder'
};

const DEFAULT_OPTIONS: RuntimeClientOptions = {
  defaultTimeout: 30_000,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 200,
  retryBackoff: 2
};

export class RuntimeClient {
  private readonly options: RuntimeClientOptions;
  private readonly subscriptions = new Map<string, Map<(payload: unknown) => void, () => void>>();

  public constructor(private readonly bridge: ChipsBridge, options?: Partial<RuntimeClientOptions>) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };
  }

  public async invoke<T = unknown>(action: string, payload?: unknown): Promise<T> {
    return this.invokeWithTimeout<T>(action, payload, this.options.defaultTimeout);
  }

  public async invokeWithTimeout<T = unknown>(action: string, payload: unknown, timeoutMs: number): Promise<T> {
    const normalizedAction = ACTION_ALIASES[action] ?? action;
    const requestPayload = payload ?? {};

    const run = async () => {
      const promise = this.bridge.invoke<T>(
        normalizedAction,
        typeof requestPayload === 'object' && requestPayload !== null ? requestPayload : { payload: requestPayload }
      );
      return this.withTimeout(promise, timeoutMs, normalizedAction);
    };

    return this.withRetry(run);
  }

  public async invokeBatch<T>(requests: InvokeRequest[]): Promise<Array<{ ok: boolean; data?: T; error?: StandardError }>> {
    return Promise.all(
      requests.map(async (request) => {
        try {
          const data = await this.invokeWithTimeout<T>(request.action, request.payload, request.timeoutMs ?? this.options.defaultTimeout);
          return { ok: true, data };
        } catch (error) {
          return {
            ok: false,
            error: toStandardError(error)
          };
        }
      })
    );
  }

  public on(event: string, handler: (payload: unknown) => void): () => void {
    const unsubscribe = this.bridge.on(event, handler);
    let bucket = this.subscriptions.get(event);
    if (!bucket) {
      bucket = new Map();
      this.subscriptions.set(event, bucket);
    }
    bucket.set(handler, unsubscribe);
    return () => {
      unsubscribe();
      const currentBucket = this.subscriptions.get(event);
      currentBucket?.delete(handler);
      if (currentBucket && currentBucket.size === 0) {
        this.subscriptions.delete(event);
      }
    };
  }

  public once(event: string, handler: (payload: unknown) => void): void {
    this.bridge.once(event, handler);
  }

  public off(event: string, handler?: (payload: unknown) => void): void {
    const bucket = this.subscriptions.get(event);
    if (!bucket) {
      return;
    }

    if (!handler) {
      for (const unsubscribe of bucket.values()) {
        unsubscribe();
      }
      this.subscriptions.delete(event);
      return;
    }

    const unsubscribe = bucket.get(handler);
    if (!unsubscribe) {
      return;
    }
    unsubscribe();
    bucket.delete(handler);
    if (bucket.size === 0) {
      this.subscriptions.delete(event);
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: StandardError | undefined;

    while (attempt <= this.options.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        const standard = this.normalizeError(error);
        lastError = standard;

        if (!this.options.enableRetry || !standard.retryable || attempt >= this.options.maxRetries) {
          throw standard;
        }

        const delay = this.options.retryDelay * this.options.retryBackoff ** attempt;
        await sleep(delay);
      }

      attempt += 1;
    }

    throw lastError ?? createError('RUNTIME_RETRY_EXHAUSTED', 'Retry exhausted');
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, action: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(createError('RUNTIME_TIMEOUT', `Runtime timeout for action: ${action}`, { timeoutMs }, true));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private normalizeError(error: unknown): StandardError {
    if (isStandardError(error)) {
      return error;
    }

    const standard = toStandardError(error, 'RUNTIME_ERROR');
    if (standard.code.startsWith('SERVICE_') || standard.code.startsWith('BRIDGE_')) {
      return standard;
    }

    return {
      ...standard,
      code: standard.code.startsWith('RUNTIME_') ? standard.code : 'RUNTIME_ERROR'
    };
  }
}

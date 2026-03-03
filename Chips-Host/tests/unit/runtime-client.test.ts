import { describe, expect, it } from 'vitest';
import { RuntimeClient } from '../../src/renderer/runtime-client';
import type { ChipsBridge } from '../../packages/bridge-api/src';

const createBridge = (handler: (action: string, payload: unknown) => Promise<unknown>): ChipsBridge => ({
  invoke: (action, payload) => handler(action, payload) as Promise<any>,
  on: () => () => undefined,
  once: () => undefined,
  emit: () => undefined
});

describe('RuntimeClient', () => {
  it('maps legacy actions and invokes bridge', async () => {
    let actionName = '';
    const runtime = new RuntimeClient(
      createBridge(async (action) => {
        actionName = action;
        return 'ok';
      })
    );

    const result = await runtime.invoke('theme.getCSS', {});
    expect(result).toBe('ok');
    expect(actionName).toBe('theme.getAllCss');
  });

  it('retries retryable errors', async () => {
    let attempts = 0;
    const runtime = new RuntimeClient(
      createBridge(async () => {
        attempts += 1;
        if (attempts < 3) {
          throw { code: 'SERVICE_UNAVAILABLE', message: 'retry', retryable: true };
        }
        return { ok: true };
      }),
      {
        defaultTimeout: 1000,
        maxRetries: 3,
        retryDelay: 1,
        retryBackoff: 1,
        enableRetry: true
      }
    );

    const result = await runtime.invoke('service.call', {});
    expect(result).toMatchObject({ ok: true });
    expect(attempts).toBe(3);
  });

  it('fails on timeout with runtime code', async () => {
    const runtime = new RuntimeClient(
      createBridge(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { ok: true };
      }),
      {
        defaultTimeout: 5,
        maxRetries: 0,
        retryDelay: 1,
        retryBackoff: 1,
        enableRetry: true
      }
    );

    await expect(runtime.invoke('slow.action', {})).rejects.toMatchObject({ code: 'RUNTIME_TIMEOUT' });
  });
});

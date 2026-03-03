import { describe, expect, it } from 'vitest';
import { KernelRouter } from '../../packages/kernel/src';
import type { RouteInvocationContext } from '../../src/shared/types';

const context = (): RouteInvocationContext => ({
  requestId: 'req-1',
  caller: {
    id: 'tester',
    type: 'service',
    permissions: ['math.read', 'math.write']
  },
  timestamp: Date.now()
});

describe('KernelRouter', () => {
  it('invokes a registered route', async () => {
    const router = new KernelRouter();
    router.register({
      key: 'math.add',
      schemaIn: 'schemas/math.add.request.json',
      schemaOut: 'schemas/math.add.response.json',
      permission: ['math.read'],
      timeoutMs: 1000,
      idempotent: true,
      retries: 0,
      handler: async (input: { a: number; b: number }) => ({ sum: input.a + input.b })
    });

    const result = await router.invoke<{ a: number; b: number }, { sum: number }>('math.add', { a: 1, b: 2 }, context());
    expect(result.sum).toBe(3);
  });

  it('blocks calls without permission', async () => {
    const router = new KernelRouter();
    router.register({
      key: 'secure.action',
      schemaIn: 'schemas/secure.action.request.json',
      schemaOut: 'schemas/secure.action.response.json',
      permission: ['secure.use'],
      timeoutMs: 1000,
      idempotent: true,
      retries: 0,
      handler: async () => ({ ok: true })
    });

    await expect(
      router.invoke('secure.action', {}, {
        ...context(),
        caller: {
          ...context().caller,
          permissions: []
        }
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('retries retryable errors for idempotent actions', async () => {
    const router = new KernelRouter();
    let calls = 0;
    router.register({
      key: 'unstable.fetch',
      schemaIn: 'schemas/unstable.fetch.request.json',
      schemaOut: 'schemas/unstable.fetch.response.json',
      permission: ['math.read'],
      timeoutMs: 1000,
      idempotent: true,
      retries: 2,
      handler: async () => {
        calls += 1;
        if (calls < 3) {
          throw { code: 'SERVICE_UNAVAILABLE', message: 'not ready', retryable: true };
        }
        return { ok: true };
      }
    });

    const result = await router.invoke('unstable.fetch', {}, context());
    expect(result).toMatchObject({ ok: true });
    expect(calls).toBe(3);
  });
});

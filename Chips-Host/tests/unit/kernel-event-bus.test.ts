import { describe, expect, it } from 'vitest';
import { EventBus } from '../../packages/kernel/src';

describe('Kernel EventBus', () => {
  it('supports filter subscriptions', async () => {
    const bus = new EventBus();
    const received: string[] = [];

    bus.on(
      'plugin.*',
      async (event) => {
        received.push(String((event.data as { id?: string }).id ?? ''));
      },
      {
        filter: (event) => Boolean((event.data as { enabled?: boolean }).enabled)
      }
    );

    await bus.emit('plugin.changed', 'test', { id: 'p1', enabled: false });
    await bus.emit('plugin.changed', 'test', { id: 'p2', enabled: true });

    expect(received).toEqual(['p2']);
  });

  it('fails when handler exceeds timeout', async () => {
    const bus = new EventBus();
    bus.on(
      'slow.event',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      },
      { timeoutMs: 5 }
    );

    await expect(bus.emit('slow.event', 'test', {})).rejects.toMatchObject({
      code: 'EVENT_HANDLER_TIMEOUT'
    });
  });
});

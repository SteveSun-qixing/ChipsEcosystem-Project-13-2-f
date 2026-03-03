import { createId, now } from '../../../src/shared/utils';
import type { EventPayload } from '../../../src/shared/types';

type EventHandler = (event: EventPayload) => void | Promise<void>;

interface Subscription {
  pattern: string;
  handler: EventHandler;
}

export class EventBus {
  private readonly subscriptions = new Set<Subscription>();

  public on(pattern: string, handler: EventHandler): () => void {
    const subscription: Subscription = { pattern, handler };
    this.subscriptions.add(subscription);
    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  public once(pattern: string, handler: EventHandler): () => void {
    let disposed = false;
    const off = this.on(pattern, async (event) => {
      if (disposed) {
        return;
      }
      disposed = true;
      off();
      await handler(event);
    });
    return off;
  }

  public async emit(name: string, source: string, data: unknown, metadata?: Record<string, unknown>): Promise<void> {
    const payload: EventPayload = {
      id: createId(),
      name,
      source,
      data,
      timestamp: now(),
      metadata
    };

    const tasks: Promise<void>[] = [];
    for (const subscription of this.subscriptions) {
      if (!this.match(subscription.pattern, name)) {
        continue;
      }

      tasks.push(Promise.resolve(subscription.handler(payload)).then(() => undefined));
    }

    await Promise.all(tasks);
  }

  private match(pattern: string, eventName: string): boolean {
    if (pattern === '*') {
      return true;
    }

    if (pattern === eventName) {
      return true;
    }

    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventName.startsWith(prefix + '.');
    }

    return false;
  }
}

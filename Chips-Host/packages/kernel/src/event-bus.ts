import { createError } from '../../../src/shared/errors';
import { createId, now } from '../../../src/shared/utils';
import type { EventPayload } from '../../../src/shared/types';

type EventHandler = (event: EventPayload) => void | Promise<void>;

export interface EventSubscriptionOptions {
  filter?: (event: EventPayload) => boolean;
  timeoutMs?: number;
}

interface Subscription {
  pattern: string;
  handler: EventHandler;
  filter?: (event: EventPayload) => boolean;
  timeoutMs?: number;
}

export class EventBus {
  private readonly subscriptions = new Set<Subscription>();

  public on(pattern: string, handler: EventHandler, options?: EventSubscriptionOptions): () => void {
    const subscription: Subscription = {
      pattern,
      handler,
      filter: options?.filter,
      timeoutMs: options?.timeoutMs
    };
    this.subscriptions.add(subscription);
    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  public once(pattern: string, handler: EventHandler, options?: EventSubscriptionOptions): () => void {
    let disposed = false;
    const off = this.on(pattern, async (event) => {
      if (disposed) {
        return;
      }
      disposed = true;
      off();
      await handler(event);
    }, options);
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

      if (subscription.filter && !subscription.filter(payload)) {
        continue;
      }

      tasks.push(this.invokeSubscriber(subscription, payload));
    }

    await Promise.all(tasks);
  }

  private async invokeSubscriber(subscription: Subscription, payload: EventPayload): Promise<void> {
    const task = Promise.resolve(subscription.handler(payload)).then(() => undefined);
    if (!subscription.timeoutMs || subscription.timeoutMs <= 0) {
      await task;
      return;
    }

    let timer: NodeJS.Timeout | undefined;
    await Promise.race([
      task.finally(() => {
        if (timer) {
          clearTimeout(timer);
        }
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            createError('EVENT_HANDLER_TIMEOUT', `Event handler timeout: ${payload.name}`, {
              event: payload.name,
              timeoutMs: subscription.timeoutMs
            })
          );
        }, subscription.timeoutMs);
      })
    ]);
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

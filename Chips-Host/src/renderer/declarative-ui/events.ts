import { createError } from '../../shared/errors';
import { cloneUINode } from './node-model';
import { EffectDispatcher } from './effects';
import type {
  EffectDescriptor,
  EffectDispatchPhase,
  EventHandler,
  EventHandlerContext,
  EventHandlerResult,
  UINode
} from './types';

const EMPTY_EFFECTS: EffectDescriptor[] = [];

const normalizeEffects = (result?: EventHandlerResult | void): ReadonlyArray<EffectDescriptor> => {
  if (!result || !result.effects || result.effects.length === 0) {
    return EMPTY_EFFECTS;
  }
  return result.effects;
};

export interface EventDispatchResult {
  handled: boolean;
  effects: ReadonlyArray<EffectDescriptor>;
  nextState?: Record<string, unknown>;
}

export class EventBindingRegistry {
  private readonly handlers = new Map<string, EventHandler>();

  public constructor(private readonly dispatcher: EffectDispatcher = new EffectDispatcher()) {}

  public registerHandler(handlerId: string, handler: EventHandler): void {
    if (handlerId.trim().length === 0) {
      throw createError('DECLARATIVE_UI_EVENT_HANDLER_INVALID', 'handlerId cannot be empty');
    }
    this.handlers.set(handlerId, handler);
  }

  public unregisterHandler(handlerId: string): void {
    this.handlers.delete(handlerId);
  }

  public bind(node: UINode, eventName: string, handlerId: string): UINode {
    if (eventName.trim().length === 0 || handlerId.trim().length === 0) {
      throw createError('DECLARATIVE_UI_EVENT_BINDING_INVALID', 'eventName and handlerId are required', {
        eventName,
        handlerId
      });
    }
    const clone = cloneUINode(node);
    clone.events = {
      ...(clone.events ?? {}),
      [eventName]: handlerId
    };
    return clone;
  }

  public async dispatch(
    node: UINode,
    eventName: string,
    payload?: unknown,
    phase: EffectDispatchPhase = 'event'
  ): Promise<EventDispatchResult> {
    const handlerId = node.events?.[eventName];
    if (!handlerId) {
      return { handled: false, effects: EMPTY_EFFECTS };
    }

    const handler = this.handlers.get(handlerId);
    if (!handler) {
      throw createError('DECLARATIVE_UI_EVENT_HANDLER_NOT_FOUND', `No handler registered for "${handlerId}"`, {
        nodeId: node.id,
        eventName,
        handlerId
      });
    }

    const context: EventHandlerContext = {
      node,
      eventName,
      payload,
      phase
    };

    const result = await handler(context);
    const effects = normalizeEffects(result);
    for (const effect of effects) {
      await this.dispatcher.dispatch(effect, {
        node,
        eventName,
        phase
      });
    }

    return {
      handled: true,
      effects,
      nextState: result?.nextState
    };
  }

  public getEffectDispatcher(): EffectDispatcher {
    return this.dispatcher;
  }
}

import { createError } from '../../shared/errors';
import type {
  EffectDescriptor,
  EffectDispatchContext,
  EffectExecutor,
  EffectType
} from './types';

let effectCounter = 0;

const nextEffectId = (type: EffectType): string => {
  effectCounter += 1;
  return `${type}:${effectCounter}`;
};

export const createEffect = (
  type: EffectType,
  action: string,
  payload?: unknown,
  metadata?: Record<string, unknown>
): EffectDescriptor => ({
  id: nextEffectId(type),
  type,
  action,
  payload,
  metadata
});

export const createUIEffect = (action: string, payload?: unknown, metadata?: Record<string, unknown>): EffectDescriptor =>
  createEffect('ui-effect', action, payload, metadata);

export const createRuntimeEffect = (
  action: string,
  payload?: unknown,
  metadata?: Record<string, unknown>
): EffectDescriptor => createEffect('runtime-effect', action, payload, metadata);

export const createTelemetryEffect = (
  action: string,
  payload?: unknown,
  metadata?: Record<string, unknown>
): EffectDescriptor => createEffect('telemetry-effect', action, payload, metadata);

const runtimeEffectInRenderError = (effect: EffectDescriptor, context: EffectDispatchContext) =>
  createError(
    'DECLARATIVE_UI_RUNTIME_EFFECT_FORBIDDEN_IN_RENDER',
    'runtime-effect cannot run during render phase',
    {
      effectId: effect.id,
      action: effect.action,
      nodeId: context.node.id
    }
  );

export class EffectDispatcher {
  private readonly executors = new Map<EffectType, EffectExecutor>();
  private readonly deferredRuntimeEffects: Array<{ effect: EffectDescriptor; context: EffectDispatchContext }> = [];

  public constructor(executors?: Partial<Record<EffectType, EffectExecutor>>) {
    if (!executors) {
      return;
    }
    for (const [type, executor] of Object.entries(executors) as Array<[EffectType, EffectExecutor | undefined]>) {
      if (executor) {
        this.executors.set(type, executor);
      }
    }
  }

  public register(type: EffectType, executor: EffectExecutor): void {
    this.executors.set(type, executor);
  }

  public async dispatch(effect: EffectDescriptor, context: EffectDispatchContext): Promise<unknown> {
    if (effect.type === 'runtime-effect' && context.phase === 'render') {
      throw runtimeEffectInRenderError(effect, context);
    }
    const executor = this.executors.get(effect.type);
    if (!executor) {
      return undefined;
    }
    return executor(effect, context);
  }

  public schedule(effect: EffectDescriptor, context: EffectDispatchContext): void {
    if (effect.type !== 'runtime-effect' || context.phase !== 'render') {
      throw createError('DECLARATIVE_UI_EFFECT_SCHEDULE_INVALID', 'Only runtime-effect in render phase can be scheduled', {
        effectId: effect.id,
        effectType: effect.type,
        phase: context.phase
      });
    }
    this.deferredRuntimeEffects.push({
      effect,
      context: {
        ...context,
        phase: 'commit'
      }
    });
  }

  public async dispatchAll(effects: ReadonlyArray<EffectDescriptor>, context: EffectDispatchContext): Promise<void> {
    for (const effect of effects) {
      await this.dispatch(effect, context);
    }
  }

  public async flushScheduledRuntimeEffects(): Promise<void> {
    while (this.deferredRuntimeEffects.length > 0) {
      const pending = this.deferredRuntimeEffects.shift();
      if (!pending) {
        return;
      }
      await this.dispatch(pending.effect, pending.context);
    }
  }
}

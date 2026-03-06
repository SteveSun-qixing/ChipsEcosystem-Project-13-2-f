import { createId } from '../../../src/shared/utils';
import type { EffectDispatchSummary, PreparedRenderNode, RenderEffect, RenderEffectExecutor, RenderEffectKind } from './types';

interface DispatchOptions {
  executors?: Partial<Record<RenderEffectKind, RenderEffectExecutor>>;
  skipEffects?: boolean;
}

const collectEffects = (node: PreparedRenderNode, bucket: Array<{ node: PreparedRenderNode; effect: RenderEffect }>): void => {
  for (const effect of node.effects) {
    bucket.push({ node, effect });
  }
  for (const child of node.children) {
    collectEffects(child, bucket);
  }
};

export const dispatchRenderEffects = async (
  root: PreparedRenderNode,
  options?: DispatchOptions
): Promise<EffectDispatchSummary> => {
  const queue: Array<{ node: PreparedRenderNode; effect: RenderEffect }> = [];
  collectEffects(root, queue);

  const summary: EffectDispatchSummary = {
    executed: [],
    deferredRuntime: []
  };

  if (options?.skipEffects) {
    for (const { effect } of queue) {
      if (effect.kind === 'runtime-effect') {
        summary.deferredRuntime.push({
          id: effect.id ?? createId(),
          name: effect.name,
          payload: effect.payload
        });
      }
    }
    return summary;
  }

  for (const { node, effect } of queue) {
    const effectId = effect.id ?? createId();

    if (effect.kind === 'runtime-effect') {
      summary.deferredRuntime.push({
        id: effectId,
        name: effect.name,
        payload: effect.payload
      });
      continue;
    }

    const executor = options?.executors?.[effect.kind];
    if (executor) {
      await executor(effect, node);
    }

    summary.executed.push({
      id: effectId,
      kind: effect.kind,
      name: effect.name
    });
  }

  return summary;
};

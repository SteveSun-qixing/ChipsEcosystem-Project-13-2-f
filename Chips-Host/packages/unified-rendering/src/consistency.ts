import type { DeclarativeNode, RenderConsistencyResult, RenderContext, RenderTarget } from './types';
import type { UnifiedRenderingEngine } from './engine';

const ALL_TARGETS: RenderTarget[] = ['app-root', 'card-iframe', 'module-slot', 'offscreen-render'];

export const verifyRenderConsistency = (
  engine: UnifiedRenderingEngine,
  declaration: DeclarativeNode,
  context: RenderContext,
  targets: RenderTarget[] = ALL_TARGETS
): Promise<RenderConsistencyResult> => {
  const hashByTarget = {
    'app-root': '',
    'card-iframe': '',
    'module-slot': '',
    'offscreen-render': ''
  } as Record<RenderTarget, string>;

  const mismatches: string[] = [];

  const run = async (): Promise<RenderConsistencyResult> => {
    for (const target of targets) {
      const result = await engine.render(declaration, target, context, {
        skipEffects: true
      });
      hashByTarget[target] = result.semanticHash;
    }

    const baseline = hashByTarget[targets[0] ?? 'app-root'];
    for (const target of targets.slice(1)) {
      if (hashByTarget[target] !== baseline) {
        mismatches.push(`${target} semantic hash mismatch`);
      }
    }

    return {
      consistent: mismatches.length === 0,
      hashByTarget,
      mismatches
    };
  };

  return run();
};

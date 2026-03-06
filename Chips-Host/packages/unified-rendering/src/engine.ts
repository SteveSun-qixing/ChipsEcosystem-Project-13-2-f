import { toStandardError } from '../../../src/shared/errors';
import { now } from '../../../src/shared/utils';
import { appRootAdapter, cardIframeAdapter, createDefaultAdapters } from './adapters';
import { validateSingleNodeContract } from './contract-validator';
import { dispatchRenderEffects } from './effect-dispatch';
import { hashSemanticTree, toNumber } from './helpers';
import { computeChildOrigin, computeNodeLayout } from './layout-compute';
import { normalizeDeclarationTree } from './node-normalizer';
import { createIncrementalPlan, RenderQueueScheduler } from './render-queue';
import { resolveNodeProps } from './theme-resolver';
import type {
  DeclarativeNode,
  ErrorBoundaryConfig,
  NormalizedNode,
  PreparedRenderNode,
  RenderContext,
  RenderExecutionOptions,
  RenderNodeDiagnostic,
  RenderPipelineStage,
  RenderResult,
  RenderTarget,
  RenderTargetAdapter
} from './types';

interface EngineOptions {
  adapters?: RenderTargetAdapter[];
}

const buildPipelineDurationRecord = (): Record<RenderPipelineStage, number> => ({
  'node-normalize': 0,
  'contract-validate': 0,
  'theme-resolve': 0,
  'layout-compute': 0,
  'render-commit': 0,
  'effect-dispatch': 0
});

const cloneNodeWithoutChildren = (node: NormalizedNode): Omit<NormalizedNode, 'children'> => {
  return {
    id: node.id,
    type: node.type,
    props: { ...node.props },
    state: { ...node.state },
    bindings: { ...node.bindings },
    events: { ...node.events },
    themeScope: node.themeScope,
    effects: [...node.effects],
    contract: {
      requires: [...node.contract.requires]
    },
    errorBoundary: node.errorBoundary
  };
};

const createFallbackNormalizedNode = (
  source: NormalizedNode,
  fallback: ErrorBoundaryConfig['fallback'] | undefined,
  stage: RenderPipelineStage,
  diagnostic: RenderNodeDiagnostic
): NormalizedNode => {
  const fallbackType = fallback?.type ?? 'View';
  return {
    ...cloneNodeWithoutChildren(source),
    type: fallbackType,
    props: {
      ...fallback?.props,
      fallback: true,
      fallbackStage: stage,
      fallbackCode: diagnostic.code,
      fallbackMessage: diagnostic.message
    },
    effects: [],
    children: []
  };
};

const shiftPreparedNode = (node: PreparedRenderNode, deltaX: number, deltaY: number): PreparedRenderNode => {
  return {
    ...node,
    layout: {
      ...node.layout,
      x: node.layout.x + deltaX,
      y: node.layout.y + deltaY
    },
    children: node.children.map((child) => shiftPreparedNode(child, deltaX, deltaY))
  };
};

const toSemanticSnapshot = (node: PreparedRenderNode): Record<string, unknown> => {
  return {
    id: node.id,
    type: node.type,
    props: node.props,
    state: node.state,
    events: node.events,
    themeScope: node.themeScope,
    boundaryLevel: node.boundaryLevel,
    children: node.children.map((child) => toSemanticSnapshot(child))
  };
};

export class UnifiedRenderingEngine {
  private readonly adapterByTarget: Map<RenderTarget, RenderTargetAdapter>;

  public constructor(options?: EngineOptions) {
    const adapters = options?.adapters ?? createDefaultAdapters();
    this.adapterByTarget = new Map(adapters.map((adapter) => [adapter.target, adapter]));

    if (!this.adapterByTarget.has('app-root')) {
      this.adapterByTarget.set('app-root', appRootAdapter);
    }
    if (!this.adapterByTarget.has('card-iframe')) {
      this.adapterByTarget.set('card-iframe', cardIframeAdapter);
    }
  }

  public getAdapter(target: RenderTarget): RenderTargetAdapter {
    const adapter = this.adapterByTarget.get(target);
    if (!adapter) {
      throw new Error(`Render adapter not registered: ${target}`);
    }
    return adapter;
  }

  public async render(
    declaration: DeclarativeNode,
    target: RenderTarget,
    context: RenderContext,
    options?: RenderExecutionOptions
  ): Promise<RenderResult> {
    const clock = context.now ?? now;
    const durations = buildPipelineDurationRecord();
    const diagnostics: RenderNodeDiagnostic[] = [];
    const diagnosticsByNode = new Map<string, RenderNodeDiagnostic[]>();
    const adapter = this.getAdapter(target);

    const addDiagnostic = (entry: RenderNodeDiagnostic): void => {
      diagnostics.push(entry);
      const bucket = diagnosticsByNode.get(entry.nodeId) ?? [];
      bucket.push(entry);
      diagnosticsByNode.set(entry.nodeId, bucket);
    };

    const runStage = <T>(stage: RenderPipelineStage, executor: () => T): T => {
      const started = clock();
      try {
        return executor();
      } finally {
        durations[stage] = clock() - started;
      }
    };

    const runStageAsync = async <T>(stage: RenderPipelineStage, executor: () => Promise<T>): Promise<T> => {
      const started = clock();
      try {
        return await executor();
      } finally {
        durations[stage] = clock() - started;
      }
    };

    const normalizeBoundaryFallback = (
      node: NormalizedNode,
      stage: RenderPipelineStage,
      error: unknown,
      regionFallback?: ErrorBoundaryConfig['fallback']
    ): NormalizedNode => {
      const standard = toStandardError(error, 'RENDER_PIPELINE_STAGE_FAILED');
      const diagnostic: RenderNodeDiagnostic = {
        nodeId: node.id,
        stage,
        code: standard.code,
        message: standard.message,
        details: standard.details
      };
      addDiagnostic(diagnostic);
      const fallback = node.errorBoundary?.fallback ?? regionFallback;
      return createFallbackNormalizedNode(node, fallback, stage, diagnostic);
    };

    const validateNode = (
      node: NormalizedNode,
      regionBoundaryActive: boolean,
      regionFallback?: ErrorBoundaryConfig['fallback']
    ): NormalizedNode => {
      const ownBoundary = node.errorBoundary?.level;
      const isolate = regionBoundaryActive || ownBoundary === 'node' || ownBoundary === 'region';
      const nextRegionBoundary = regionBoundaryActive || ownBoundary === 'region';
      const nextRegionFallback = ownBoundary === 'region' ? node.errorBoundary?.fallback : regionFallback;

      try {
        validateSingleNodeContract(node, adapter);
        return {
          ...cloneNodeWithoutChildren(node),
          children: node.children.map((child) => validateNode(child, nextRegionBoundary, nextRegionFallback))
        };
      } catch (error) {
        if (!isolate) {
          throw error;
        }
        return normalizeBoundaryFallback(node, 'contract-validate', error, regionFallback);
      }
    };

    const resolveThemeNode = (
      node: NormalizedNode,
      regionBoundaryActive: boolean,
      regionFallback?: ErrorBoundaryConfig['fallback']
    ): NormalizedNode => {
      const ownBoundary = node.errorBoundary?.level;
      const isolate = regionBoundaryActive || ownBoundary === 'node' || ownBoundary === 'region';
      const nextRegionBoundary = regionBoundaryActive || ownBoundary === 'region';
      const nextRegionFallback = ownBoundary === 'region' ? node.errorBoundary?.fallback : regionFallback;

      try {
        const resolvedProps = resolveNodeProps(node.props, context.theme, node.themeScope);
        return {
          ...cloneNodeWithoutChildren(node),
          props: resolvedProps,
          children: node.children.map((child) => resolveThemeNode(child, nextRegionBoundary, nextRegionFallback))
        };
      } catch (error) {
        if (!isolate) {
          throw error;
        }
        return normalizeBoundaryFallback(node, 'theme-resolve', error, regionFallback);
      }
    };

    const buildPreparedNode = (
      node: NormalizedNode,
      x: number,
      y: number,
      availableWidth: number,
      regionBoundaryActive: boolean,
      regionFallback?: ErrorBoundaryConfig['fallback']
    ): PreparedRenderNode => {
      const ownBoundary = node.errorBoundary?.level;
      const isolate = regionBoundaryActive || ownBoundary === 'node' || ownBoundary === 'region';
      const nextRegionBoundary = regionBoundaryActive || ownBoundary === 'region';
      const nextRegionFallback = ownBoundary === 'region' ? node.errorBoundary?.fallback : regionFallback;

      try {
        const children = node.children.map((child) =>
          buildPreparedNode(child, 0, 0, availableWidth, nextRegionBoundary, nextRegionFallback)
        );

        const layout = computeNodeLayout({
          node,
          resolvedProps: node.props,
          x,
          y,
          availableWidth,
          context,
          children
        });

        const positionedChildren = children.map((child, index) => {
          const origin = computeChildOrigin(layout.frame, index, children, child, node);
          return shiftPreparedNode(child, origin.x - child.layout.x, origin.y - child.layout.y);
        });

        const resolvedTokens = Object.fromEntries(
          Object.entries(node.props).filter(([, value]) => typeof value !== 'object' || value === null)
        );

        return {
          id: node.id,
          type: node.type,
          props: { ...node.props },
          state: { ...node.state },
          events: { ...node.events },
          resolvedTokens,
          themeScope: node.themeScope,
          effects: [...node.effects],
          layout: layout.frame,
          visibleRange: layout.visibleRange,
          children: positionedChildren,
          boundaryLevel: ownBoundary,
          diagnostics: [...(diagnosticsByNode.get(node.id) ?? [])]
        };
      } catch (error) {
        if (!isolate) {
          throw error;
        }

        const standard = toStandardError(error, 'RENDER_LAYOUT_COMPUTE_FAILED');
        const diagnostic: RenderNodeDiagnostic = {
          nodeId: node.id,
          stage: 'layout-compute',
          code: standard.code,
          message: standard.message,
          details: standard.details
        };
        addDiagnostic(diagnostic);

        const fallbackType = node.errorBoundary?.fallback?.type ?? nextRegionFallback?.type ?? 'View';
        const fallbackProps = {
          ...(nextRegionFallback?.props ?? {}),
          ...(node.errorBoundary?.fallback?.props ?? {}),
          fallback: true,
          fallbackStage: 'layout-compute',
          fallbackCode: diagnostic.code,
          fallbackMessage: diagnostic.message
        };

        const width = Math.max(1, toNumber(node.props.widthPx, availableWidth));
        const height = Math.max(32, toNumber(node.props.heightPx, 48));

        return {
          id: node.id,
          type: fallbackType,
          props: fallbackProps,
          state: {},
          events: {},
          resolvedTokens: {},
          themeScope: node.themeScope,
          effects: [],
          layout: {
            x,
            y,
            width,
            height
          },
          children: [],
          boundaryLevel: ownBoundary,
          diagnostics: [diagnostic]
        };
      }
    };

    const normalized = runStage('node-normalize', () => normalizeDeclarationTree(declaration));
    const validated = runStage('contract-validate', () => validateNode(normalized, false));
    const themed = runStage('theme-resolve', () => resolveThemeNode(validated, false));
    const prepared = runStage('layout-compute', () =>
      buildPreparedNode(themed, 0, 0, context.viewport.width, false)
    );

    const semanticHash = hashSemanticTree(toSemanticSnapshot(prepared));

    const committed = runStage('render-commit', () =>
      adapter.commit({
        root: prepared,
        semanticHash
      })
    );

    const effects = await runStageAsync('effect-dispatch', async () =>
      dispatchRenderEffects(prepared, {
        skipEffects: options?.skipEffects
      })
    );

    const plan = createIncrementalPlan(prepared, options?.batchSize ?? 40);
    const scheduler = new RenderQueueScheduler(plan);
    const incremental = scheduler.run({
      shouldYield: options?.shouldYield
    });

    return {
      target,
      committed,
      root: prepared,
      semanticHash,
      diagnostics,
      effects,
      pipelineDurations: durations,
      incremental
    };
  }
}

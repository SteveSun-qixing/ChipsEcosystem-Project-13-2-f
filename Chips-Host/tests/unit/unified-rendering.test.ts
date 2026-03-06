import { describe, expect, it } from 'vitest';
import { UnifiedRenderingEngine, verifyRenderConsistency } from '../../packages/unified-rendering/src';
import type { DeclarativeNode, RenderContext } from '../../packages/unified-rendering/src';

const createContext = (): RenderContext => ({
  viewport: {
    width: 1024,
    height: 480,
    scrollTop: 0,
    scrollLeft: 0
  },
  theme: {
    id: 'chips-official.default-theme',
    tokens: {
      'text.primary': '#111111',
      'text.secondary': '#666666',
      'layout.gap': 12
    },
    scopes: {
      list: {
        'text.secondary': '#334155'
      }
    }
  }
});

describe('UnifiedRenderingEngine', () => {
  it('renders full pipeline with effect dispatch and incremental queue', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'View',
      props: { gapPx: 8 },
      effects: [
        {
          kind: 'ui-effect',
          name: 'scroll-into-view',
          payload: { nodeId: 'root' }
        },
        {
          kind: 'runtime-effect',
          name: 'config.get',
          payload: { key: 'workspace.mode' },
          trigger: 'event'
        },
        {
          kind: 'telemetry-effect',
          name: 'render.completed'
        }
      ],
      children: [
        {
          id: 'title',
          type: 'Text',
          props: {
            text: 'Card Title',
            tone: 'token.text.primary'
          }
        },
        {
          id: 'list',
          type: 'List',
          themeScope: 'list',
          props: {
            incremental: true,
            itemHeightPx: 20,
            itemCount: 60,
            overscan: 1,
            gapPx: 0
          },
          children: Array.from({ length: 60 }).map((_, index) => ({
            id: `row-${index}`,
            type: 'Text',
            props: {
              text: `row-${index}`,
              tone: 'token.text.secondary'
            }
          }))
        }
      ]
    };

    const result = await engine.render(declaration, 'app-root', createContext(), {
      batchSize: 15
    });

    expect(result.committed.target).toBe('app-root');
    expect(result.committed.html).toContain('data-target="app-root"');
    expect(result.effects.executed.map((item) => item.kind)).toEqual(['ui-effect', 'telemetry-effect']);
    expect(result.effects.deferredRuntime).toHaveLength(1);
    expect(result.root.children[1]?.visibleRange).toBeDefined();
    expect(result.incremental.batches.length).toBeGreaterThan(0);
    expect(result.pipelineDurations['node-normalize']).toBeGreaterThanOrEqual(0);
  });

  it('computes vertical child offsets cumulatively for mixed heights', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'View',
      props: {
        gapPx: 10
      },
      children: [
        {
          id: 'first',
          type: 'View',
          props: {
            heightPx: 40
          }
        },
        {
          id: 'second',
          type: 'View',
          props: {
            heightPx: 80
          }
        }
      ]
    };

    const result = await engine.render(declaration, 'app-root', createContext(), {
      skipEffects: true
    });

    const first = result.root.children.find((child) => child.id === 'first');
    const second = result.root.children.find((child) => child.id === 'second');
    expect(first?.layout.y).toBe(0);
    expect(second?.layout.y).toBe(50);
  });

  it('enforces semantic consistency across all adapters', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'View',
      children: [
        {
          id: 'node-a',
          type: 'Text',
          props: { text: 'A' }
        }
      ]
    };

    const result = await verifyRenderConsistency(engine, declaration, createContext());
    expect(result.consistent).toBe(true);
    expect(new Set(Object.values(result.hashByTarget)).size).toBe(1);
  });

  it('isolates contract validation failures with node-level error boundary', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'View',
      children: [
        {
          id: 'safe-node',
          type: 'Text',
          props: {
            text: 'safe'
          }
        },
        {
          id: 'broken-node',
          type: 'View',
          props: {
            color: '#ff0000'
          },
          errorBoundary: {
            level: 'node',
            fallback: {
              type: 'Text',
              props: {
                text: 'fallback-node'
              }
            }
          }
        }
      ]
    };

    const result = await engine.render(declaration, 'app-root', createContext(), {
      skipEffects: true
    });

    expect(result.diagnostics.some((item) => item.nodeId === 'broken-node')).toBe(true);
    expect(result.committed.html).toContain('fallback-node');
    expect(result.committed.html).toContain('safe');
  });

  it('supports interruptible incremental scheduling for large trees', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'List',
      props: {
        incremental: true,
        itemHeightPx: 24,
        itemCount: 120
      },
      children: Array.from({ length: 120 }).map((_, index) => ({
        id: `item-${index}`,
        type: 'Text',
        props: {
          text: `item-${index}`
        }
      }))
    };

    const result = await engine.render(declaration, 'offscreen-render', createContext(), {
      batchSize: 10,
      shouldYield: (batchIndex) => batchIndex >= 1,
      skipEffects: true
    });

    expect(result.incremental.interrupted).toBe(true);
    expect(result.incremental.consumedNodes).toBeLessThanOrEqual(10);
    expect(result.committed.target).toBe('offscreen-render');
  });
});

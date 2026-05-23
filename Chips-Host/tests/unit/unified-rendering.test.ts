import { describe, expect, it } from 'vitest';
import { UnifiedRenderingEngine, evaluateRenderQualityGate, verifyRenderConsistency } from '../../packages/unified-rendering/src';
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
    expect(result.qualityGate.passed).toBe(true);
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
    expect(result.diagnostics[0]).toMatchObject({
      nodeId: 'broken-node',
      path: 'root.1',
      severity: 'P1',
      code: 'RENDER_CONTRACT_VISUAL_PROP_FORBIDDEN',
      qualityGateBlocking: true,
      suggestion: expect.any(String)
    });
    expect(result.qualityGate).toMatchObject({
      passed: false,
      blockingCount: 1,
      highestSeverity: 'P1'
    });
    expect(result.committed.html).toContain('fallback-node');
    expect(result.committed.html).toContain('safe');
    expect(() => JSON.stringify(result.diagnostics)).not.toThrow();
  });

  it('fails non-isolated P0/P1 diagnostics with JSON-serializable quality gate details', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'View',
      children: [
        {
          id: 'bad-command',
          type: 'Command',
          events: {
            onPress: ''
          }
        }
      ]
    };

    await expect(
      engine.render(declaration, 'app-root', createContext(), {
        failOnQualityGate: true,
        skipEffects: true
      })
    ).rejects.toMatchObject({
      code: 'RENDER_CONTRACT_EVENT_HANDLER_INVALID',
      details: {
        diagnostic: expect.objectContaining({
          nodeId: 'bad-command',
          path: 'root.0',
          stage: 'contract-validate',
          severity: 'P1',
          suggestion: expect.any(String),
          qualityGateBlocking: true
        }),
        qualityGate: expect.objectContaining({
          passed: false,
          blockingCount: 2
        })
      }
    });
  });

  it('returns non-isolated quality gate diagnostics when strict blocking is disabled', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'View',
      children: [
        {
          id: 'bad-command',
          type: 'Command',
          events: {
            onPress: ''
          }
        }
      ]
    };

    const result = await engine.render(declaration, 'app-root', createContext(), {
      skipEffects: true
    });

    expect(result.qualityGate).toMatchObject({
      passed: false,
      blockingCount: 2,
      highestSeverity: 'P1'
    });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'bad-command',
          path: 'root.0',
          code: 'RENDER_CONTRACT_EVENT_HANDLER_INVALID',
          qualityGateBlocking: true
        }),
        expect.objectContaining({
          nodeId: 'bad-command',
          path: 'root.0',
          code: 'RENDER_CONTRACT_A11Y_NAME_REQUIRED',
          qualityGateBlocking: true
        })
      ])
    );
  });

  it('reports theme token diagnostics at the owning node path', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'View',
      children: [
        {
          id: 'missing-token',
          type: 'Text',
          props: {
            tone: 'token.text.missing'
          },
          errorBoundary: {
            level: 'node',
            fallback: {
              type: 'Text',
              props: {
                text: 'theme fallback'
              }
            }
          }
        }
      ]
    };

    const result = await engine.render(declaration, 'app-root', createContext(), {
      skipEffects: true
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        nodeId: 'missing-token',
        path: 'root.0',
        stage: 'theme-resolve',
        severity: 'P1',
        code: 'RENDER_THEME_TOKEN_NOT_FOUND',
        suggestion: expect.any(String),
        details: expect.objectContaining({
          token: 'text.missing',
          prop: 'tone'
        })
      })
    ]);
    expect(result.committed.html).toContain('theme fallback');
  });

  it('evaluates P0/P1 diagnostics as quality gate blockers and lower severities as non-blocking', () => {
    const gate = evaluateRenderQualityGate([
      {
        nodeId: 'info-node',
        path: 'root.info',
        stage: 'contract-validate',
        severity: 'info',
        code: 'RENDER_INFO',
        message: 'info',
        suggestion: 'No action required.',
        qualityGateBlocking: false
      },
      {
        nodeId: 'p2-node',
        path: 'root.p2',
        stage: 'contract-validate',
        severity: 'P2',
        code: 'RENDER_MINOR',
        message: 'minor',
        suggestion: 'Review before release.',
        qualityGateBlocking: false
      },
      {
        nodeId: 'p0-node',
        path: 'root.p0',
        stage: 'contract-validate',
        severity: 'P0',
        code: 'RENDER_FATAL',
        message: 'fatal',
        suggestion: 'Fix before rendering.',
        qualityGateBlocking: true
      }
    ]);

    expect(gate).toMatchObject({
      passed: false,
      blockingCount: 1,
      highestSeverity: 'P0'
    });
    expect(gate.blockingDiagnostics).toHaveLength(1);
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

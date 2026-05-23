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

  it('returns layout constraints, responsive state, and performance metrics for L9 layout primitives', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'Section',
      props: {
        gapCpx: 20
      },
      children: [
        {
          id: 'stack',
          type: 'Stack',
          props: {
            direction: 'horizontal',
            gapPx: 6
          },
          children: [
            {
              id: 'stack-a',
              type: 'View',
              props: {
                widthPx: 120,
                heightPx: 40
              }
            },
            {
              id: 'stack-b',
              type: 'View',
              props: {
                widthPx: 80,
                heightPx: 60
              }
            }
          ]
        },
        {
          id: 'grid',
          type: 'Grid',
          props: {
            columns: 3,
            itemCount: 8,
            rowHeightPx: 30,
            gapPx: 4
          },
          children: Array.from({ length: 8 }).map((_, index) => ({
            id: `grid-${index}`,
            type: 'View',
            props: {
              heightPx: 30
            }
          }))
        },
        {
          id: 'form',
          type: 'Form',
          children: [
            {
              id: 'field',
              type: 'Text',
              props: {
                text: 'field'
              }
            }
          ]
        },
        {
          id: 'scroll',
          type: 'ScrollView',
          props: {
            scrollAxis: 'both',
            heightPx: 90
          },
          children: [
            {
              id: 'scroll-content',
              type: 'Text',
              props: {
                text: 'scroll content'
              }
            }
          ]
        },
        {
          id: 'table',
          type: 'Table',
          props: {
            itemCount: 12,
            rowHeightPx: 22,
            gapPx: 1,
            overscan: 1
          },
          children: Array.from({ length: 12 }).map((_, index) => ({
            id: `row-${index}`,
            type: 'Text',
            props: {
              text: `row-${index}`
            }
          }))
        },
        {
          id: 'navigation',
          type: 'Navigation',
          children: [
            {
              id: 'command',
              type: 'Command',
              props: {
                label: 'Open'
              },
              events: {
                onPress: 'command.open'
              }
            }
          ]
        }
      ]
    };

    const result = await engine.render(declaration, 'app-root', createContext(), {
      skipEffects: true
    });
    const byId = new Map(result.root.children.map((child) => [child.id, child]));

    expect(result.root.layoutConstraints).toMatchObject({
      axis: 'vertical',
      gapPx: 20,
      widthPx: 1024,
      scrollAxis: 'none'
    });
    expect(result.root.responsive).toMatchObject({
      breakpoint: 'expanded',
      scale: 1,
      viewportWidthPx: 1024,
      viewportHeightPx: 480
    });
    expect(byId.get('stack')?.layoutConstraints).toMatchObject({
      axis: 'horizontal',
      gapPx: 6
    });
    expect(byId.get('stack')?.layout.height).toBe(60);
    expect(byId.get('stack')?.children[1]?.layout.x).toBe(126);
    expect(byId.get('grid')?.layoutConstraints).toMatchObject({
      axis: 'grid',
      columns: 3,
      rows: 3,
      itemCount: 8,
      itemExtentPx: 30,
      columnWidthPx: 338.667
    });
    expect(byId.get('grid')?.children[1]?.layout.x).toBe(342.667);
    expect(byId.get('form')?.layoutConstraints).toMatchObject({
      axis: 'form',
      gapPx: 16
    });
    expect(byId.get('scroll')?.layoutConstraints).toMatchObject({
      axis: 'vertical',
      overflow: 'scroll',
      scrollAxis: 'both'
    });
    expect(byId.get('table')?.layoutConstraints).toMatchObject({
      axis: 'table',
      itemCount: 12,
      itemExtentPx: 22
    });
    expect(byId.get('table')?.visibleRange).toEqual({
      start: 0,
      end: 12,
      total: 12
    });
    expect(byId.get('navigation')?.layoutConstraints).toMatchObject({
      axis: 'navigation',
      gapPx: 8
    });
    expect(result.performanceMetrics).toMatchObject({
      nodeCount: 32,
      layoutNodeCount: 32,
      commitNodeCount: 32,
      pipelineDurations: result.pipelineDurations
    });
    expect(() => JSON.stringify(result.performanceMetrics)).not.toThrow();
  });

  it('uses container cpx constraints and responsive breakpoints during layout compute', async () => {
    const engine = new UnifiedRenderingEngine();
    const declaration: DeclarativeNode = {
      id: 'root',
      type: 'Section',
      props: {
        widthCpx: 512,
        minWidthCpx: 400,
        maxWidthCpx: 600,
        minHeightCpx: 64,
        maxHeightPx: 80,
        gapCpx: 10
      },
      children: [
        {
          id: 'text',
          type: 'Text',
          props: {
            text: 'compact'
          }
        }
      ]
    };

    const result = await engine.render(
      declaration,
      'app-root',
      {
        ...createContext(),
        viewport: {
          width: 512,
          height: 360,
          scrollTop: 0,
          scrollLeft: 0
        }
      },
      {
        skipEffects: true
      }
    );

    expect(result.root.layout.width).toBe(256);
    expect(result.root.layout.height).toBe(32);
    expect(result.root.layoutConstraints).toMatchObject({
      containerWidthPx: 512,
      widthPx: 256,
      minWidthPx: 200,
      maxWidthPx: 300,
      minHeightPx: 32,
      maxHeightPx: 80,
      gapPx: 5
    });
    expect(result.root.responsive).toMatchObject({
      breakpoint: 'compact',
      scale: 0.5
    });
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

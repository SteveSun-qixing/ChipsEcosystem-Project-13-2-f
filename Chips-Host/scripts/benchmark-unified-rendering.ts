import fs from 'node:fs/promises';
import path from 'node:path';
import { UnifiedRenderingEngine, type DeclarativeNode, type RenderContext } from '../packages/unified-rendering/src';

interface BenchmarkSample {
  durationMs: number;
  commitMs: number;
  layoutMs: number;
  normalizeMs: number;
  nodeCount: number;
  layoutNodeCount: number;
  commitNodeCount: number;
}

interface BenchmarkStats {
  p50: number;
  p95: number;
  avg: number;
  min: number;
  max: number;
}

const RENDER_COMMIT_P95_THRESHOLD_MS = 32;
const LAYOUT_COMPUTE_P95_THRESHOLD_MS = 40;
const TOTAL_RENDER_P95_THRESHOLD_MS = 120;
const LONG_TASK_RATIO_THRESHOLD = 0.05;

const toMs = (start: bigint, end: bigint): number => Number(end - start) / 1_000_000;

const percentile = (sorted: number[], value: number): number => {
  if (sorted.length === 0) {
    return 0;
  }
  const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil((value / 100) * sorted.length) - 1));
  return sorted[position] ?? sorted[sorted.length - 1] ?? 0;
};

const summarize = (values: number[]): BenchmarkStats => {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    avg: sorted.length > 0 ? sum / sorted.length : 0,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0
  };
};

const createTree = (count: number): DeclarativeNode => {
  const gridCount = Math.max(12, Math.floor(count * 0.25));
  const tableCount = Math.max(12, Math.floor(count * 0.2));
  const listCount = Math.max(12, count - gridCount - tableCount - 8);

  return {
    id: 'root',
    type: 'Section',
    props: {
      gapPx: 8,
      widthCpx: 1024
    },
    children: [
      {
        id: 'header',
        type: 'Navigation',
        children: [
          {
            id: 'title',
            type: 'Text',
            props: {
              text: 'Unified Rendering Benchmark'
            }
          }
        ]
      },
      {
        id: 'form',
        type: 'Form',
        props: {
          gapCpx: 10
        },
        children: [
          {
            id: 'filter-label',
            type: 'Text',
            props: {
              text: 'Filter'
            }
          },
          {
            id: 'filter-command',
            type: 'Command',
            props: {
              label: 'Apply filter'
            },
            events: {
              onPress: 'benchmark.filter.apply'
            }
          }
        ]
      },
      {
        id: 'grid',
        type: 'Grid',
        props: {
          incremental: true,
          columns: 4,
          itemCount: gridCount,
          rowHeightPx: 36,
          overscan: 1,
          gapPx: 4
        },
        children: Array.from({ length: gridCount }).map((_, index) => ({
          id: `grid-item-${index}`,
          type: 'View',
          props: {
            heightPx: 36,
            role: 'grid-item'
          }
        }))
      },
      {
        id: 'list',
        type: 'List',
        props: {
          incremental: true,
          itemCount: listCount,
          itemHeightPx: 30,
          overscan: 2,
          gapPx: 2
        },
        children: Array.from({ length: listCount }).map((_, index) => ({
          id: `item-${index}`,
          type: 'View',
          props: {
            index,
            role: 'list-item'
          },
          children: [
            {
              id: `item-text-${index}`,
              type: 'Text',
              props: {
                text: `entry-${index}`,
                tone: 'token.text.secondary'
              }
            }
          ]
        }))
      },
      {
        id: 'scroll',
        type: 'ScrollView',
        props: {
          heightPx: 320,
          scrollAxis: 'vertical'
        },
        children: [
          {
            id: 'table',
            type: 'Table',
            props: {
              incremental: true,
              itemCount: tableCount,
              rowHeightPx: 28,
              overscan: 2,
              gapPx: 1
            },
            children: Array.from({ length: tableCount }).map((_, index) => ({
              id: `table-row-${index}`,
              type: 'Text',
              props: {
                text: `row-${index}`
              }
            }))
          }
        ]
      }
    ]
  };
};

const createContext = (): RenderContext => ({
  viewport: {
    width: 1280,
    height: 720,
    scrollTop: 0,
    scrollLeft: 0
  },
  theme: {
    id: 'chips-official.default-theme',
    tokens: {
      'text.secondary': '#334155'
    }
  }
});

const runBenchmark = async (runs: number, nodeCount: number): Promise<{
  samples: BenchmarkSample[];
  total: BenchmarkStats;
  commit: BenchmarkStats;
  layout: BenchmarkStats;
  normalize: BenchmarkStats;
  nodes: {
    min: number;
    max: number;
    avg: number;
    layoutMin: number;
    layoutMax: number;
    commitMin: number;
    commitMax: number;
  };
}> => {
  const engine = new UnifiedRenderingEngine();
  const declaration = createTree(nodeCount);
  const context = createContext();
  const samples: BenchmarkSample[] = [];

  for (let index = 0; index < runs; index += 1) {
    const started = process.hrtime.bigint();
    const result = await engine.render(declaration, 'offscreen-render', context, {
      skipEffects: true,
      batchSize: 64
    });
    const ended = process.hrtime.bigint();

    samples.push({
      durationMs: toMs(started, ended),
      commitMs: result.pipelineDurations['render-commit'],
      layoutMs: result.pipelineDurations['layout-compute'],
      normalizeMs: result.pipelineDurations['node-normalize'],
      nodeCount: result.performanceMetrics.nodeCount,
      layoutNodeCount: result.performanceMetrics.layoutNodeCount,
      commitNodeCount: result.performanceMetrics.commitNodeCount
    });
  }

  const nodeCounts = samples.map((item) => item.nodeCount);
  const layoutNodeCounts = samples.map((item) => item.layoutNodeCount);
  const commitNodeCounts = samples.map((item) => item.commitNodeCount);

  return {
    samples,
    total: summarize(samples.map((item) => item.durationMs)),
    commit: summarize(samples.map((item) => item.commitMs)),
    layout: summarize(samples.map((item) => item.layoutMs)),
    normalize: summarize(samples.map((item) => item.normalizeMs)),
    nodes: {
      min: Math.min(...nodeCounts),
      max: Math.max(...nodeCounts),
      avg: nodeCounts.reduce((sum, value) => sum + value, 0) / Math.max(1, nodeCounts.length),
      layoutMin: Math.min(...layoutNodeCounts),
      layoutMax: Math.max(...layoutNodeCounts),
      commitMin: Math.min(...commitNodeCounts),
      commitMax: Math.max(...commitNodeCounts)
    }
  };
};

const parseArg = (name: string, fallback: number): number => {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (!found) {
    return fallback;
  }
  const value = Number(found.slice(prefix.length));
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
};

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

const main = async (): Promise<void> => {
  const runs = parseArg('runs', 30);
  const nodeCount = parseArg('nodes', 600);
  const strict = hasFlag('--strict');

  const benchmark = await runBenchmark(runs, nodeCount);
  const output = {
    generatedAt: new Date().toISOString(),
    runs,
    nodeCount,
    thresholds: {
      renderCommitP95Ms: RENDER_COMMIT_P95_THRESHOLD_MS,
      layoutComputeP95Ms: LAYOUT_COMPUTE_P95_THRESHOLD_MS,
      totalRenderP95Ms: TOTAL_RENDER_P95_THRESHOLD_MS,
      longTaskRatioMax: LONG_TASK_RATIO_THRESHOLD
    },
    total: benchmark.total,
    commit: benchmark.commit,
    layout: benchmark.layout,
    normalize: benchmark.normalize,
    nodes: benchmark.nodes
  };

  const reportDir = path.resolve(process.cwd(), 'reports/perf');
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'unified-rendering-baseline.json');
  await fs.writeFile(reportPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');

  console.log(JSON.stringify(output, null, 2));
  console.log(`report: ${reportPath}`);

  if (strict) {
    const failures: string[] = [];
    if (benchmark.commit.p95 > RENDER_COMMIT_P95_THRESHOLD_MS) {
      failures.push(`render-commit p95 exceeded threshold: ${benchmark.commit.p95.toFixed(3)}ms > ${RENDER_COMMIT_P95_THRESHOLD_MS}ms`);
    }
    if (benchmark.layout.p95 > LAYOUT_COMPUTE_P95_THRESHOLD_MS) {
      failures.push(`layout-compute p95 exceeded threshold: ${benchmark.layout.p95.toFixed(3)}ms > ${LAYOUT_COMPUTE_P95_THRESHOLD_MS}ms`);
    }
    if (benchmark.total.p95 > TOTAL_RENDER_P95_THRESHOLD_MS) {
      failures.push(`total render p95 exceeded threshold: ${benchmark.total.p95.toFixed(3)}ms > ${TOTAL_RENDER_P95_THRESHOLD_MS}ms`);
    }
    if (benchmark.nodes.min !== benchmark.nodes.max) {
      failures.push(`render node count drifted across runs: min=${benchmark.nodes.min}, max=${benchmark.nodes.max}`);
    }
    if (benchmark.nodes.layoutMin !== benchmark.nodes.layoutMax || benchmark.nodes.commitMin !== benchmark.nodes.commitMax) {
      failures.push(
        `layout/commit node count drifted across runs: layout=${benchmark.nodes.layoutMin}-${benchmark.nodes.layoutMax}, commit=${benchmark.nodes.commitMin}-${benchmark.nodes.commitMax}`
      );
    }
    if (failures.length > 0) {
      for (const failure of failures) {
        console.error(failure);
      }
      process.exitCode = 1;
    }
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { UnifiedRenderingEngine, type DeclarativeNode, type RenderContext } from '../packages/unified-rendering/src';

interface BenchmarkSample {
  durationMs: number;
  commitMs: number;
  layoutMs: number;
  normalizeMs: number;
}

interface BenchmarkStats {
  p50: number;
  p95: number;
  avg: number;
  min: number;
  max: number;
}

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
  return {
    id: 'root',
    type: 'View',
    props: {
      gapPx: 8,
      widthCpx: 1024
    },
    children: [
      {
        id: 'header',
        type: 'View',
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
        id: 'list',
        type: 'List',
        props: {
          incremental: true,
          itemCount: count,
          itemHeightPx: 30,
          overscan: 2,
          gapPx: 2
        },
        children: Array.from({ length: count }).map((_, index) => ({
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
      normalizeMs: result.pipelineDurations['node-normalize']
    });
  }

  return {
    samples,
    total: summarize(samples.map((item) => item.durationMs)),
    commit: summarize(samples.map((item) => item.commitMs)),
    layout: summarize(samples.map((item) => item.layoutMs)),
    normalize: summarize(samples.map((item) => item.normalizeMs))
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
      renderCommitP95Ms: 32,
      longTaskRatioMax: 0.05
    },
    total: benchmark.total,
    commit: benchmark.commit,
    layout: benchmark.layout,
    normalize: benchmark.normalize
  };

  const reportDir = path.resolve(process.cwd(), 'reports/perf');
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'unified-rendering-baseline.json');
  await fs.writeFile(reportPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');

  console.log(JSON.stringify(output, null, 2));
  console.log(`report: ${reportPath}`);

  if (strict && benchmark.commit.p95 > 32) {
    console.error(`render-commit p95 exceeded threshold: ${benchmark.commit.p95.toFixed(3)}ms > 32ms`);
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

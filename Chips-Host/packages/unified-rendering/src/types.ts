export type DeclarativeNodeType = 'View' | 'Stack' | 'Grid' | 'Form' | 'List' | 'Table' | 'Text' | string;

export type RenderEffectKind = 'ui-effect' | 'runtime-effect' | 'telemetry-effect';

export interface RenderEffect {
  id?: string;
  kind: RenderEffectKind;
  name: string;
  payload?: unknown;
  trigger?: 'render' | 'event' | 'commit';
}

export interface ErrorBoundaryConfig {
  level: 'node' | 'region';
  fallback?: {
    type?: string;
    props?: Record<string, unknown>;
  };
}

export interface DeclarativeNode {
  id?: string;
  type: DeclarativeNodeType;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  bindings?: Record<string, string>;
  events?: Record<string, string>;
  themeScope?: string;
  effects?: RenderEffect[];
  contract?: {
    requires?: string[];
  };
  errorBoundary?: ErrorBoundaryConfig;
  children?: DeclarativeNode[];
}

export interface RenderViewport {
  width: number;
  height: number;
  scrollTop?: number;
  scrollLeft?: number;
}

export interface ThemeSnapshot {
  id: string;
  tokens: Record<string, unknown>;
  scopes?: Record<string, Record<string, unknown>>;
}

export interface RenderContext {
  viewport: RenderViewport;
  theme: ThemeSnapshot;
  now?: () => number;
}

export interface ThemeResolveResult {
  root: NormalizedNode;
  resolvedTokensByNodeId: Record<string, Record<string, unknown>>;
}

export interface NormalizedNode {
  id: string;
  type: DeclarativeNodeType;
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  bindings: Record<string, string>;
  events: Record<string, string>;
  themeScope?: string;
  effects: RenderEffect[];
  contract: {
    requires: string[];
  };
  errorBoundary?: ErrorBoundaryConfig;
  children: NormalizedNode[];
}

export interface LayoutFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisibleRange {
  start: number;
  end: number;
  total: number;
}

export interface RenderNodeDiagnostic {
  nodeId: string;
  stage: RenderPipelineStage;
  code: string;
  message: string;
  details?: unknown;
}

export interface PreparedRenderNode {
  id: string;
  type: DeclarativeNodeType;
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  events: Record<string, string>;
  resolvedTokens: Record<string, unknown>;
  themeScope?: string;
  effects: RenderEffect[];
  layout: LayoutFrame;
  visibleRange?: VisibleRange;
  children: PreparedRenderNode[];
  boundaryLevel?: 'node' | 'region';
  diagnostics: RenderNodeDiagnostic[];
}

export type RenderPipelineStage =
  | 'node-normalize'
  | 'contract-validate'
  | 'theme-resolve'
  | 'layout-compute'
  | 'render-commit'
  | 'effect-dispatch';

export type RenderTarget = 'app-root' | 'card-iframe' | 'module-slot' | 'offscreen-render';

export interface RenderCommitInput {
  root: PreparedRenderNode;
  semanticHash: string;
}

export interface RenderCommitOutput {
  target: RenderTarget;
  html: string;
  metadata?: Record<string, unknown>;
}

export interface RenderTargetAdapter {
  readonly target: RenderTarget;
  readonly capabilities: Set<string>;
  commit(input: RenderCommitInput): RenderCommitOutput;
}

export interface EffectDispatchSummary {
  executed: Array<{ id: string; kind: RenderEffectKind; name: string }>;
  deferredRuntime: Array<{ id: string; name: string; payload?: unknown }>;
}

export interface RenderQueueBatch {
  index: number;
  nodeIds: string[];
}

export interface IncrementalPlan {
  batches: RenderQueueBatch[];
  totalNodes: number;
}

export interface IncrementalScheduleResult {
  batches: RenderQueueBatch[];
  interrupted: boolean;
  consumedNodes: number;
}

export interface RenderExecutionOptions {
  skipEffects?: boolean;
  batchSize?: number;
  shouldYield?: (batchIndex: number) => boolean;
}

export interface RenderResult {
  target: RenderTarget;
  committed: RenderCommitOutput;
  root: PreparedRenderNode;
  semanticHash: string;
  diagnostics: RenderNodeDiagnostic[];
  effects: EffectDispatchSummary;
  pipelineDurations: Record<RenderPipelineStage, number>;
  incremental: IncrementalScheduleResult;
}

export interface RenderRequest {
  tree: DeclarativeNode;
  context: RenderContext;
  target: RenderTarget;
  options?: RenderExecutionOptions;
}

export interface UnifiedRendererOptions {
  adapters: RenderTargetAdapter[];
  effectExecutors?: Partial<Record<RenderEffectKind, RenderEffectExecutor>>;
}

export interface RenderConsistencyResult {
  consistent: boolean;
  hashByTarget: Record<RenderTarget, string>;
  mismatches: string[];
}

export type RenderEffectExecutor = (effect: RenderEffect, node: PreparedRenderNode) => void | Promise<void>;

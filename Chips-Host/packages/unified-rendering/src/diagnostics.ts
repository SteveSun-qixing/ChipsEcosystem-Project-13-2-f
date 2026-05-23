import type {
  NormalizedNode,
  PreparedRenderNode,
  RenderDiagnosticSeverity,
  RenderNodeDiagnostic,
  RenderPipelineStage,
  RenderQualityGateResult
} from './types';

interface DiagnosticInput {
  nodeId: string;
  path: string;
  stage: RenderPipelineStage;
  severity?: RenderDiagnosticSeverity;
  code: string;
  message: string;
  suggestion: string;
  details?: unknown;
}

const BLOCKING_SEVERITIES = new Set<RenderDiagnosticSeverity>(['P0', 'P1']);
const SEVERITY_RANK: Record<RenderDiagnosticSeverity, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  info: 3
};

export const isQualityGateBlockingDiagnostic = (diagnostic: Pick<RenderNodeDiagnostic, 'severity' | 'qualityGateBlocking'>): boolean =>
  diagnostic.qualityGateBlocking || BLOCKING_SEVERITIES.has(diagnostic.severity);

export const isRenderNodeDiagnostic = (value: unknown): value is RenderNodeDiagnostic => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<RenderNodeDiagnostic>;
  return (
    typeof candidate.nodeId === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.stage === 'string' &&
    typeof candidate.severity === 'string' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.suggestion === 'string' &&
    typeof candidate.qualityGateBlocking === 'boolean'
  );
};

export const createRenderDiagnostic = (input: DiagnosticInput): RenderNodeDiagnostic => {
  const severity = input.severity ?? 'P1';
  return {
    nodeId: input.nodeId,
    path: input.path,
    stage: input.stage,
    severity,
    code: input.code,
    message: input.message,
    suggestion: input.suggestion,
    qualityGateBlocking: BLOCKING_SEVERITIES.has(severity),
    details: input.details
  };
};

export const createRenderDiagnosticForNode = (
  node: NormalizedNode | PreparedRenderNode,
  input: Omit<DiagnosticInput, 'nodeId' | 'path'>
): RenderNodeDiagnostic =>
  createRenderDiagnostic({
    ...input,
    nodeId: node.id,
    path: node.path
  });

export const evaluateRenderQualityGate = (diagnostics: RenderNodeDiagnostic[]): RenderQualityGateResult => {
  const blockingDiagnostics = diagnostics.filter((diagnostic) => isQualityGateBlockingDiagnostic(diagnostic));
  const highestSeverity = diagnostics
    .map((diagnostic) => diagnostic.severity)
    .sort((left, right) => SEVERITY_RANK[left] - SEVERITY_RANK[right])[0];

  return {
    passed: blockingDiagnostics.length === 0,
    blockingCount: blockingDiagnostics.length,
    highestSeverity,
    blockingDiagnostics
  };
};

import type {
  ThemeCoverageSummary,
  ThemeDiagnostic,
  ThemeDiagnosticSeverity,
  ThemeDiagnosticSummary,
  ThemeTokenLayer
} from './types';

export const THEME_CONTRACT_SCHEMA_VERSION = '1.0.0';

const SEVERITIES: ThemeDiagnosticSeverity[] = ['info', 'warning', 'error'];

const emptySeverityCounts = (): Record<ThemeDiagnosticSeverity, number> => ({
  info: 0,
  warning: 0,
  error: 0
});

export const buildThemeDiagnosticSummary = (
  diagnostics: ThemeDiagnostic[],
  coverage?: ThemeCoverageSummary
): ThemeDiagnosticSummary => {
  const bySeverity = emptySeverityCounts();
  const byCode: Record<string, number> = {};

  for (const diagnostic of diagnostics) {
    bySeverity[diagnostic.severity] = (bySeverity[diagnostic.severity] ?? 0) + 1;
    byCode[diagnostic.code] = (byCode[diagnostic.code] ?? 0) + 1;
  }

  const blocking = diagnostics.filter((diagnostic) => diagnostic.blocking).length;
  const status = blocking > 0 ? 'blocked' : bySeverity.warning > 0 ? 'warning' : 'complete';

  return {
    total: diagnostics.length,
    blocking,
    bySeverity,
    byCode,
    status,
    coverage
  };
};

export const inferThemeTokenLayer = (tokenKey: string, fallback?: ThemeTokenLayer): ThemeTokenLayer | undefined => {
  if (tokenKey.startsWith('chips.comp.')) {
    return 'comp';
  }
  if (tokenKey.startsWith('chips.motion.')) {
    return 'motion';
  }
  if (tokenKey.startsWith('chips.layout.')) {
    return 'layout';
  }
  if (tokenKey.startsWith('chips.sys.')) {
    return 'sys';
  }
  if (tokenKey.startsWith('chips.ref.')) {
    return 'ref';
  }
  return fallback;
};

export const inferThemeTokenLocation = (
  tokenKey: string,
  states: string[] = []
): { component?: string; part?: string; state?: string; layer?: ThemeTokenLayer } => {
  const layer = inferThemeTokenLayer(tokenKey);
  if (!tokenKey.startsWith('chips.comp.')) {
    return { layer };
  }

  const segments = tokenKey.slice('chips.comp.'.length).split('.');
  const [component, part, ...rest] = segments;
  const state = [...rest].reverse().find((segment) => states.includes(segment));

  return {
    component,
    part,
    state,
    layer
  };
};

export const mergeThemeCoverage = (items: ThemeCoverageSummary[]): ThemeCoverageSummary => {
  const seed: ThemeCoverageSummary = {
    componentCount: 0,
    coveredComponentCount: 0,
    requiredTokenCount: 0,
    coveredRequiredTokenCount: 0,
    missingRequiredTokenCount: 0,
    optionalTokenCount: 0,
    coveredOptionalTokenCount: 0,
    missingOptionalTokenCount: 0,
    requiredCoverage: 1,
    optionalCoverage: 1
  };

  const aggregate = items.reduce<ThemeCoverageSummary>(
    (acc, item) => ({
      componentCount: acc.componentCount + item.componentCount,
      coveredComponentCount: acc.coveredComponentCount + item.coveredComponentCount,
      requiredTokenCount: acc.requiredTokenCount + item.requiredTokenCount,
      coveredRequiredTokenCount: acc.coveredRequiredTokenCount + item.coveredRequiredTokenCount,
      missingRequiredTokenCount: acc.missingRequiredTokenCount + item.missingRequiredTokenCount,
      optionalTokenCount: acc.optionalTokenCount + item.optionalTokenCount,
      coveredOptionalTokenCount: acc.coveredOptionalTokenCount + item.coveredOptionalTokenCount,
      missingOptionalTokenCount: acc.missingOptionalTokenCount + item.missingOptionalTokenCount,
      requiredCoverage: 1,
      optionalCoverage: 1
    }),
    seed
  );

  aggregate.requiredCoverage =
    aggregate.requiredTokenCount === 0 ? 1 : aggregate.coveredRequiredTokenCount / aggregate.requiredTokenCount;
  aggregate.optionalCoverage =
    aggregate.optionalTokenCount === 0 ? 1 : aggregate.coveredOptionalTokenCount / aggregate.optionalTokenCount;

  return aggregate;
};

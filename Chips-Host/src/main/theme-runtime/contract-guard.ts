import { createError } from '../../shared/errors';
import {
  buildThemeDiagnosticSummary,
  inferThemeTokenLayer,
  inferThemeTokenLocation,
  mergeThemeCoverage,
  THEME_CONTRACT_SCHEMA_VERSION
} from './diagnostics';
import type {
  ThemeConstraint,
  ThemeContractComponentView,
  ThemeContractCoverage,
  ThemeContractView,
  ThemeDiagnostic,
  ThemeDiagnosticStatus,
  ThemeDiagnosticSummary
} from './types';

export interface ThemeContractComponent {
  name: string;
  component?: string;
  scope: string;
  parts?: string[];
  states?: string[];
  tokens?: string[];
  requiredTokens?: string[];
  optionalTokens?: string[];
  a11yConstraints?: ThemeConstraint[];
  motionConstraints?: ThemeConstraint[];
}

export interface ThemeContract {
  version?: string;
  contractVersion?: string;
  components: ThemeContractComponent[];
}

export interface ThemeContractDiagnosticContext {
  themeId: string;
  themeVersion?: string;
  sourceThemeId?: string;
}

const normalizeComponentName = (component: ThemeContractComponent): string => {
  return component.component ?? component.name;
};

const normalizeTokenKey = (component: string, token: string): string => {
  return token.startsWith('chips.') ? token : `chips.comp.${component}.${token}`;
};

const uniqueStrings = (values: string[] | undefined): string[] => {
  return [...new Set((values ?? []).filter((item) => typeof item === 'string' && item.length > 0))];
};

const normalizeRequiredTokens = (component: ThemeContractComponent): string[] => {
  const componentName = normalizeComponentName(component);
  const raw = component.requiredTokens ?? component.tokens ?? [];
  return uniqueStrings(raw.map((token) => normalizeTokenKey(componentName, token)));
};

const normalizeOptionalTokens = (component: ThemeContractComponent): string[] => {
  const componentName = normalizeComponentName(component);
  return uniqueStrings((component.optionalTokens ?? []).map((token) => normalizeTokenKey(componentName, token)));
};

const roundCoverage = (covered: number, total: number): number => {
  if (total === 0) {
    return 1;
  }
  return Number((covered / total).toFixed(4));
};

const componentStatus = (missingRequired: number, missingOptional: number): ThemeDiagnosticStatus => {
  if (missingRequired > 0) {
    return 'blocked';
  }
  if (missingOptional > 0) {
    return 'warning';
  }
  return 'complete';
};

const buildComponentCoverage = (
  requiredTokens: string[],
  optionalTokens: string[],
  variables: Record<string, unknown>
): ThemeContractCoverage => {
  const coveredRequiredTokenCount = requiredTokens.filter((tokenKey) => tokenKey in variables).length;
  const coveredOptionalTokenCount = optionalTokens.filter((tokenKey) => tokenKey in variables).length;
  const missingRequiredTokenCount = requiredTokens.length - coveredRequiredTokenCount;
  const missingOptionalTokenCount = optionalTokens.length - coveredOptionalTokenCount;

  return {
    requiredTokenCount: requiredTokens.length,
    coveredRequiredTokenCount,
    missingRequiredTokenCount,
    optionalTokenCount: optionalTokens.length,
    coveredOptionalTokenCount,
    missingOptionalTokenCount,
    requiredCoverage: roundCoverage(coveredRequiredTokenCount, requiredTokens.length),
    optionalCoverage: roundCoverage(coveredOptionalTokenCount, optionalTokens.length),
    status: componentStatus(missingRequiredTokenCount, missingOptionalTokenCount)
  };
};

const buildMissingTokenDiagnostic = (
  context: ThemeContractDiagnosticContext,
  component: string,
  states: string[],
  tokenKey: string,
  blocking: boolean
): ThemeDiagnostic => {
  const location = inferThemeTokenLocation(tokenKey, states);
  return {
    severity: blocking ? 'error' : 'warning',
    code: blocking ? 'THEME_REQUIRED_TOKEN_MISSING' : 'THEME_OPTIONAL_TOKEN_MISSING',
    messageKey: blocking
      ? 'theme.diagnostics.requiredTokenMissing'
      : 'theme.diagnostics.optionalTokenMissing',
    themeId: context.themeId,
    sourceThemeId: context.sourceThemeId ?? context.themeId,
    component,
    part: location.part,
    state: location.state,
    tokenKey,
    layer: location.layer ?? inferThemeTokenLayer(tokenKey),
    scope: 'component',
    suggestionKey: blocking
      ? 'theme.suggestions.addRequiredToken'
      : 'theme.suggestions.addOptionalToken',
    details: { tokenKey },
    blocking
  };
};

export const collectThemeContractDiagnostics = (
  context: ThemeContractDiagnosticContext,
  contract: ThemeContract | undefined,
  variables: Record<string, unknown>
): ThemeDiagnostic[] => {
  if (!contract) {
    return [];
  }

  const diagnostics: ThemeDiagnostic[] = [];
  for (const component of contract.components) {
    const componentName = normalizeComponentName(component);
    const states = uniqueStrings(component.states);
    for (const tokenKey of normalizeRequiredTokens(component)) {
      if (!(tokenKey in variables)) {
        diagnostics.push(buildMissingTokenDiagnostic(context, componentName, states, tokenKey, true));
      }
    }
    for (const tokenKey of normalizeOptionalTokens(component)) {
      if (!(tokenKey in variables)) {
        diagnostics.push(buildMissingTokenDiagnostic(context, componentName, states, tokenKey, false));
      }
    }
  }

  return diagnostics;
};

export const validateThemeContractWithTokens = (
  themeId: string,
  contract: ThemeContract | undefined,
  variables: Record<string, unknown>
): void => {
  const diagnostics = collectThemeContractDiagnostics({ themeId }, contract, variables).filter(
    (diagnostic) => diagnostic.blocking
  );
  if (diagnostics.length === 0) {
    return;
  }

  throw createError('THEME_CONTRACT_INVALID', 'Theme contract validation failed: missing required tokens', {
    themeId,
    diagnostics,
    summary: buildThemeDiagnosticSummary(diagnostics)
  });
};

const buildComponentView = (
  context: ThemeContractDiagnosticContext,
  component: ThemeContractComponent,
  variables: Record<string, unknown>
): ThemeContractComponentView => {
  const componentName = normalizeComponentName(component);
  const parts = uniqueStrings(component.parts);
  const states = uniqueStrings(component.states);
  const requiredTokens = normalizeRequiredTokens(component);
  const optionalTokens = normalizeOptionalTokens(component);
  const coverage = buildComponentCoverage(requiredTokens, optionalTokens, variables);
  const diagnostics = [
    ...requiredTokens
      .filter((tokenKey) => !(tokenKey in variables))
      .map((tokenKey) => buildMissingTokenDiagnostic(context, componentName, states, tokenKey, true)),
    ...optionalTokens
      .filter((tokenKey) => !(tokenKey in variables))
      .map((tokenKey) => buildMissingTokenDiagnostic(context, componentName, states, tokenKey, false))
  ];

  return {
    component: componentName,
    scope: component.scope,
    parts,
    states,
    requiredTokens,
    optionalTokens,
    a11yConstraints: component.a11yConstraints ?? [],
    motionConstraints: component.motionConstraints ?? [],
    coverage,
    diagnostics
  };
};

const summarizeContractView = (components: ThemeContractComponentView[]): ThemeDiagnosticSummary => {
  const coverage = mergeThemeCoverage(
    components.map((component) => ({
      componentCount: 1,
      coveredComponentCount: component.coverage.status === 'blocked' ? 0 : 1,
      requiredTokenCount: component.coverage.requiredTokenCount,
      coveredRequiredTokenCount: component.coverage.coveredRequiredTokenCount,
      missingRequiredTokenCount: component.coverage.missingRequiredTokenCount,
      optionalTokenCount: component.coverage.optionalTokenCount,
      coveredOptionalTokenCount: component.coverage.coveredOptionalTokenCount,
      missingOptionalTokenCount: component.coverage.missingOptionalTokenCount,
      requiredCoverage: component.coverage.requiredCoverage,
      optionalCoverage: component.coverage.optionalCoverage
    }))
  );
  return buildThemeDiagnosticSummary(
    components.flatMap((component) => component.diagnostics),
    coverage
  );
};

export const buildThemeContractsView = (
  context: ThemeContractDiagnosticContext,
  contract: ThemeContract | undefined,
  variables: Record<string, unknown>,
  componentFilter?: string
): ThemeContractView => {
  if (!contract) {
    return {
      schemaVersion: THEME_CONTRACT_SCHEMA_VERSION,
      themeId: context.themeId,
      themeVersion: context.themeVersion ?? '0',
      contractVersion: '0',
      components: [],
      summary: buildThemeDiagnosticSummary([])
    };
  }

  const components = contract.components
    .filter((component) => {
      const name = normalizeComponentName(component);
      return !componentFilter || componentFilter === name;
    })
    .map((component) => buildComponentView(context, component, variables));

  return {
    schemaVersion: THEME_CONTRACT_SCHEMA_VERSION,
    themeId: context.themeId,
    themeVersion: context.themeVersion ?? '0',
    contractVersion: contract.contractVersion ?? contract.version ?? '0',
    components,
    summary: summarizeContractView(components)
  };
};

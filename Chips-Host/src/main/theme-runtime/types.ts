import type { StandardError } from '../../shared/types';

export interface ThemeTokenLayers {
  ref: Record<string, unknown>;
  sys: Record<string, unknown>;
  comp: Record<string, unknown>;
  motion: Record<string, unknown>;
  layout: Record<string, unknown>;
}

export type ThemeScopeId = string;

export interface ThemeScopeChain {
  scopes: ThemeScopeId[];
}

export interface ThemeSnapshot {
  id: string;
  version?: string;
  layers: ThemeTokenLayers;
  scopes?: Record<ThemeScopeId, Partial<ThemeTokenLayers>>;
  diagnostics?: ThemeDiagnostic[];
}

export interface ResolvedTheme {
  variables: Record<string, unknown>;
  componentTokens: Record<string, Record<string, unknown>>;
  diagnostics: ThemeDiagnostic[];
  summary: ThemeDiagnosticSummary;
}

export type ThemeDiagnosticSeverity = 'info' | 'warning' | 'error';
export type ThemeTokenLayer = 'ref' | 'sys' | 'comp' | 'motion' | 'layout';
export type ThemeDiagnosticStatus = 'complete' | 'warning' | 'blocked';

export interface ThemeDiagnostic {
  severity: ThemeDiagnosticSeverity;
  code: string;
  messageKey: string;
  themeId?: string;
  sourceThemeId?: string;
  component?: string;
  part?: string;
  state?: string;
  tokenKey?: string;
  layer?: ThemeTokenLayer;
  details?: unknown;
  scope?: ThemeScopeId;
  suggestionKey?: string;
  blocking: boolean;
}

export interface ThemeCoverageSummary {
  componentCount: number;
  coveredComponentCount: number;
  requiredTokenCount: number;
  coveredRequiredTokenCount: number;
  missingRequiredTokenCount: number;
  optionalTokenCount: number;
  coveredOptionalTokenCount: number;
  missingOptionalTokenCount: number;
  requiredCoverage: number;
  optionalCoverage: number;
}

export interface ThemeDiagnosticSummary {
  total: number;
  blocking: number;
  bySeverity: Record<ThemeDiagnosticSeverity, number>;
  byCode: Record<string, number>;
  status: ThemeDiagnosticStatus;
  coverage?: ThemeCoverageSummary;
}

export interface ThemeConstraint {
  key: string;
  messageKey?: string;
  details?: Record<string, unknown>;
}

export interface ThemeContractCoverage {
  requiredTokenCount: number;
  coveredRequiredTokenCount: number;
  missingRequiredTokenCount: number;
  optionalTokenCount: number;
  coveredOptionalTokenCount: number;
  missingOptionalTokenCount: number;
  requiredCoverage: number;
  optionalCoverage: number;
  status: ThemeDiagnosticStatus;
}

export interface ThemeContractComponentView {
  component: string;
  scope: string;
  parts: string[];
  states: string[];
  requiredTokens: string[];
  optionalTokens: string[];
  a11yConstraints: ThemeConstraint[];
  motionConstraints: ThemeConstraint[];
  coverage: ThemeContractCoverage;
  diagnostics: ThemeDiagnostic[];
}

export interface ThemeContractView {
  schemaVersion: string;
  themeId: string;
  themeVersion: string;
  contractVersion: string;
  components: ThemeContractComponentView[];
  summary: ThemeDiagnosticSummary;
}

export interface ThemeResolveResult {
  resolved: Array<{
    id: string;
    displayName: string;
    version: string;
    order: number;
  }>;
  tokens: Record<string, unknown>;
  diagnostics: ThemeDiagnostic[];
  summary: ThemeDiagnosticSummary;
}

export interface ThemeChangedEvent {
  previousThemeId: string;
  themeId: string;
  themeVersion: string;
  timestamp: number;
  diagnosticsSummary: ThemeDiagnosticSummary;
}

export interface ThemeRuntimeError extends StandardError {
  scope?: ThemeScopeId;
  tokenKey?: string;
}

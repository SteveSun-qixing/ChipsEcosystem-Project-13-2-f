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
}

export interface ThemeDiagnostic {
  code: string;
  message: string;
  details?: unknown;
  scope?: ThemeScopeId;
  tokenKey?: string;
}

export interface ThemeRuntimeError extends StandardError {
  scope?: ThemeScopeId;
  tokenKey?: string;
}


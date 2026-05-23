import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface ThemeMeta {
  id: string;
  displayName: string;
  version: string;
  isDefault: boolean;
  publisher?: string;
  parentTheme?: string;
}

export interface ThemeState {
  themeId: string;
  displayName: string;
  version: string;
  parentTheme?: string;
}

export type ThemeDiagnosticSeverity = "info" | "warning" | "error";
export type ThemeTokenLayer = "ref" | "sys" | "comp" | "motion" | "layout";
export type ThemeDiagnosticStatus = "complete" | "warning" | "blocked";

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
  scope?: string;
  suggestionKey?: string;
  details?: unknown;
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

export interface ResolvedTheme {
  resolved: Array<{ id: string; displayName: string; version: string; order: number }>;
  tokens: Record<string, unknown>;
  diagnostics: ThemeDiagnostic[];
  summary: ThemeDiagnosticSummary;
}

export interface ThemeChangedPayload {
  previousThemeId: string;
  themeId: string;
  themeVersion: string;
  timestamp: number;
  diagnosticsSummary: ThemeDiagnosticSummary;
}

export interface ThemeApi {
  list(publisher?: string): Promise<ThemeMeta[]>;
  apply(themeId: string): Promise<void>;
  getCurrent(options?: { appId?: string; pluginId?: string }): Promise<ThemeState>;
  getAllCss(): Promise<{ css: string; themeId: string }>;
  resolve(chain: string[]): Promise<ResolvedTheme>;
  contract: {
    get(component?: string): Promise<ThemeContractView>;
  };
  onChanged(handler: (payload: ThemeChangedPayload) => void): () => void;
}

export function createThemeApi(client: CoreClient): ThemeApi {
  return {
    async list(publisher) {
      const result = await client.invoke<{ publisher?: string }, { themes: ThemeMeta[] }>("theme.list", {
        publisher,
      });
      return result.themes;
    },
    async apply(themeId) {
      if (!themeId) {
        throw createError("INVALID_ARGUMENT", "theme.apply: themeId is required.");
      }
      return client.invoke("theme.apply", { id: themeId });
    },
    async getCurrent(options) {
      return client.invoke<{ appId?: string; pluginId?: string }, ThemeState>("theme.getCurrent", options ?? {});
    },
    async getAllCss() {
      return client.invoke<Record<string, never>, { css: string; themeId: string }>(
        "theme.getAllCss",
        {},
      );
    },
    async resolve(chain) {
      if (!Array.isArray(chain)) {
        throw createError("INVALID_ARGUMENT", "theme.resolve: chain must be an array of theme ids.");
      }
      return client.invoke("theme.resolve", { chain });
    },
    contract: {
      async get(component) {
        return client.invoke("theme.contract.get", component ? { component } : {});
      },
    },
    onChanged(handler) {
      return client.events.on<ThemeChangedPayload>("theme.changed", handler);
    },
  };
}

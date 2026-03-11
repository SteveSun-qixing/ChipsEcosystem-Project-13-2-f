import * as React from "react";

export interface ThemeRuntimeState {
  themeId: string;
  version: string;
  cacheKey: string;
  lastChangedAt: number;
}

export interface TokenResolver {
  get(tokenKey: string): unknown;
  keys(): Iterable<string>;
}

export interface ThemeChangedPayload {
  themeId?: string;
  version?: string;
  [key: string]: unknown;
}

export interface ThemeEventSource {
  on?(eventName: string, handler: (payload: unknown) => void): void;
  off?(eventName: string, handler: (payload: unknown) => void): void;
  addEventListener?(eventName: string, handler: (event: Event | CustomEvent<unknown>) => void): void;
  removeEventListener?(eventName: string, handler: (event: Event | CustomEvent<unknown>) => void): void;
  subscribe?(eventName: string, handler: (payload: unknown) => void): (() => void) | void;
}

export interface ThemeChunkDiagnostic {
  chunkIndex: number;
  chunkSize: number;
  appliedCount: number;
  totalCount: number;
}

export interface ApplyThemeVariablesOptions {
  chunkSize?: number;
  scheduler?: () => Promise<unknown> | unknown;
  signal?: AbortSignal;
  onChunkApplied?: (diagnostic: ThemeChunkDiagnostic) => void;
  onDiagnostic?: (diagnostic: ThemeChunkDiagnostic & { code: string }) => void;
}

export interface ApplyThemeVariablesResult {
  appliedCount: number;
  chunkCount: number;
  durationMs: number;
}

export interface ChipsTokenProviderProps {
  resolver: TokenResolver;
  children?: React.ReactNode;
}

export interface ChipsThemeProviderProps {
  themeId?: string;
  version?: string;
  eventName?: string;
  eventSource?: ThemeEventSource;
  onThemeChanged?: (payload: ThemeChangedPayload) => void;
  resolver?: TokenResolver | null;
  children?: React.ReactNode;
}

export function ChipsTokenProvider(props: ChipsTokenProviderProps): React.ReactElement;
export function subscribeThemeChanged(
  eventSource: ThemeEventSource | undefined,
  eventName: string,
  handler: (payload: ThemeChangedPayload) => void,
): () => void;
export function applyThemeVariables(target: HTMLElement, variables: Record<string, string | number>): void;
export function applyThemeVariablesInBatches(
  target: HTMLElement,
  variables: Record<string, string | number>,
  options?: ApplyThemeVariablesOptions,
): Promise<ApplyThemeVariablesResult>;
export function ChipsThemeProvider(props: ChipsThemeProviderProps): React.ReactElement;
export function useTokenResolver(): TokenResolver;
export function useToken<T = unknown>(tokenKey: string): T;
export function useComponentTokens(componentScope: string): Record<string, unknown>;
export function useThemeRuntime(): ThemeRuntimeState;

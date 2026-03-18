import type { Client } from "chips-sdk";

export type ModuleFeatureTone = "primary" | "supporting" | "attention";
export type ModuleFeatureState = "ready" | "loading" | "planned";

export interface ModuleFeatureItem {
  id: string;
  title: string;
  description: string;
  tone: ModuleFeatureTone;
  state: ModuleFeatureState;
}

export interface ModuleSnapshot {
  title: string;
  summary: string;
  items: ModuleFeatureItem[];
}

export interface ModuleRuntimeBootState {
  locale: string;
  themeCssText: string;
  themeId: string;
  themeVersion: string;
  errorMessage?: string;
}

export interface ModuleMountContext {
  container: HTMLElement;
  moduleId: string;
  slot: string;
  client?: Client;
  bridgeScopeToken?: string;
  locale?: string;
  initialSnapshot?: Partial<ModuleSnapshot>;
}

export interface ModuleHandle {
  update(patch: Partial<ModuleSnapshot>): void;
  unmount(): void;
}

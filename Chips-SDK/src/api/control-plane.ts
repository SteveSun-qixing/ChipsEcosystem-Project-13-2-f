import type { CoreClient } from "../types/client";

export interface ControlPlaneHealthResult {
  status: "ok";
  report: unknown;
}

export interface ControlPlaneCheckResult {
  services: unknown;
}

export interface ControlPlaneMetric {
  count: number;
  failures: number;
  p50: number;
  p95: number;
}

export type ControlPlaneMetrics = Record<string, ControlPlaneMetric>;

export interface ControlPlaneDiagnoseResult {
  routeCount: number;
  serviceCount: number;
  config: unknown;
  runtimeSnapshot: unknown;
  topFailureRoutes: unknown[];
}

export interface ControlPlaneApi {
  health(): Promise<ControlPlaneHealthResult>;
  check(): Promise<ControlPlaneCheckResult>;
  metrics(): Promise<ControlPlaneMetrics>;
  diagnose(): Promise<ControlPlaneDiagnoseResult>;
}

export function createControlPlaneApi(client: CoreClient): ControlPlaneApi {
  return {
    async health() {
      return client.invoke<Record<string, never>, ControlPlaneHealthResult>("control-plane.health", {});
    },
    async check() {
      return client.invoke<Record<string, never>, ControlPlaneCheckResult>("control-plane.check", {});
    },
    async metrics() {
      const result = await client.invoke<
        Record<string, never>,
        { metrics: ControlPlaneMetrics }
      >("control-plane.metrics", {});
      return result.metrics;
    },
    async diagnose() {
      const result = await client.invoke<
        Record<string, never>,
        { diagnose: ControlPlaneDiagnoseResult }
      >("control-plane.diagnose", {});
      return result.diagnose;
    },
  };
}

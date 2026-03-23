import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export type ModuleMethodMode = "sync" | "job";
export type ModuleProviderStatus = "enabled" | "disabled" | "running" | "error";
export type ModuleJobStatus = "running" | "completed" | "failed" | "cancelled";

export interface ModuleProviderMethod {
  name: string;
  mode: ModuleMethodMode;
  inputSchema: string;
  outputSchema: string;
  description?: string;
}

export interface ModuleProviderRecord {
  pluginId: string;
  capability: string;
  version: string;
  runtime: "worker";
  activation: "onDemand" | "eager";
  methods: ModuleProviderMethod[];
  permissions: string[];
  status: ModuleProviderStatus;
  description?: string;
}

export interface ModuleInvokeRequest {
  capability: string;
  method: string;
  input: Record<string, unknown>;
  pluginId?: string;
  timeoutMs?: number;
}

export interface ModuleSyncInvokeResult {
  mode: "sync";
  output: unknown;
}

export interface ModuleJobInvokeResult {
  mode: "job";
  jobId: string;
}

export type ModuleInvokeResult = ModuleSyncInvokeResult | ModuleJobInvokeResult;

export interface ModuleJobRecord {
  jobId: string;
  pluginId: string;
  capability: string;
  method: string;
  status: ModuleJobStatus;
  createdAt: number;
  updatedAt: number;
  progress?: Record<string, unknown>;
  output?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    retryable?: boolean;
  };
}

export interface ModuleListProvidersOptions {
  capability?: string;
  pluginId?: string;
  status?: ModuleProviderStatus;
  versionRange?: string;
}

export interface ModuleResolveOptions {
  versionRange?: string;
}

export interface ModuleApi {
  listProviders(options?: ModuleListProvidersOptions): Promise<ModuleProviderRecord[]>;
  resolve(capability: string, options?: ModuleResolveOptions): Promise<ModuleProviderRecord>;
  invoke(request: ModuleInvokeRequest): Promise<ModuleInvokeResult>;
  job: {
    get(jobId: string): Promise<ModuleJobRecord>;
    cancel(jobId: string): Promise<void>;
  };
}

const MODULE_PROVIDER_STATUSES = new Set<ModuleProviderStatus>(["enabled", "disabled", "running", "error"]);

const assertNonEmptyString = (value: string, action: string, field: string): void => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError("INVALID_ARGUMENT", `${action}: ${field} is required.`);
  }
};

const assertOptionalNonEmptyString = (
  value: string | undefined,
  action: string,
  field: string,
): void => {
  if (typeof value !== "undefined" && value.trim().length === 0) {
    throw createError("INVALID_ARGUMENT", `${action}: ${field} must be a non-empty string when provided.`);
  }
};

function assertModuleInput(input: unknown): asserts input is Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw createError("INVALID_ARGUMENT", "module.invoke: input must be an object.");
  }
}

export function createModuleApi(client: CoreClient): ModuleApi {
  return {
    async listProviders(options) {
      if (options?.status && !MODULE_PROVIDER_STATUSES.has(options.status)) {
        throw createError(
          "INVALID_ARGUMENT",
          "module.listProviders: status must be one of enabled/disabled/running/error.",
        );
      }
      assertOptionalNonEmptyString(options?.capability, "module.listProviders", "capability");
      assertOptionalNonEmptyString(options?.pluginId, "module.listProviders", "pluginId");
      assertOptionalNonEmptyString(options?.versionRange, "module.listProviders", "versionRange");

      const result = await client.invoke<ModuleListProvidersOptions, { providers: ModuleProviderRecord[] }>(
        "module.listProviders",
        options ?? {},
      );
      return result.providers;
    },
    async resolve(capability, options) {
      assertNonEmptyString(capability, "module.resolve", "capability");
      assertOptionalNonEmptyString(options?.versionRange, "module.resolve", "versionRange");

      const result = await client.invoke<
        { capability: string; versionRange?: string },
        { provider: ModuleProviderRecord }
      >("module.resolve", {
        capability,
        versionRange: options?.versionRange,
      });
      return result.provider;
    },
    async invoke(request) {
      assertNonEmptyString(request.capability, "module.invoke", "capability");
      assertNonEmptyString(request.method, "module.invoke", "method");
      assertModuleInput(request.input);
      assertOptionalNonEmptyString(request.pluginId, "module.invoke", "pluginId");
      if (
        typeof request.timeoutMs !== "undefined" &&
        (!Number.isFinite(request.timeoutMs) || request.timeoutMs <= 0)
      ) {
        throw createError(
          "INVALID_ARGUMENT",
          "module.invoke: timeoutMs must be a positive finite number when provided.",
        );
      }

      return client.invoke<ModuleInvokeRequest, ModuleInvokeResult>("module.invoke", request);
    },
    job: {
      async get(jobId) {
        assertNonEmptyString(jobId, "module.job.get", "jobId");
        const result = await client.invoke<{ jobId: string }, { job: ModuleJobRecord }>("module.job.get", {
          jobId,
        });
        return result.job;
      },
      async cancel(jobId) {
        assertNonEmptyString(jobId, "module.job.cancel", "jobId");
        await client.invoke("module.job.cancel", { jobId });
      },
    },
  };
}

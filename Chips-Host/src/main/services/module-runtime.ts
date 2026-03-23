import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  ModuleMethodManifestMeta,
  ModulePluginManifestMeta,
  ModuleProviderManifestMeta,
  PluginRecord
} from '../../runtime';
import { createError } from '../../shared/errors';
import type { RouteInvocationContext, StandardError } from '../../shared/types';

export interface ModuleProviderMethodRecord {
  name: string;
  mode: 'sync' | 'job';
  inputSchema: string;
  outputSchema: string;
  description?: string;
}

export interface ModuleProviderRecord {
  pluginId: string;
  capability: string;
  version: string;
  runtime: 'worker';
  activation: 'onDemand' | 'eager';
  methods: ModuleProviderMethodRecord[];
  permissions: string[];
  status: 'enabled' | 'disabled' | 'running' | 'error';
  description?: string;
}

export interface ModuleJobRecord {
  jobId: string;
  pluginId: string;
  capability: string;
  method: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  caller: RouteInvocationContext['caller'];
  createdAt: number;
  updatedAt: number;
  progress?: Record<string, unknown>;
  output?: unknown;
  error?: StandardError;
}

export interface ModuleLogger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

export interface ModuleMethodContext {
  logger: ModuleLogger;
  host: {
    invoke<TOutput = unknown>(action: string, payload?: Record<string, unknown>): Promise<TOutput>;
  };
  module: {
    invoke(request: {
      capability: string;
      method: string;
      input: Record<string, unknown>;
      pluginId?: string;
      timeoutMs?: number;
    }): Promise<{ mode: 'sync'; output: unknown } | { mode: 'job'; jobId: string }>;
    job: {
      get(jobId: string): Promise<unknown>;
      cancel(jobId: string): Promise<void>;
    };
  };
  job?: {
    id: string;
    signal: AbortSignal;
    reportProgress(payload: Record<string, unknown>): Promise<void>;
    isCancelled(): boolean;
  };
}

export type ModuleMethodHandler = (ctx: ModuleMethodContext, input: Record<string, unknown>) => Promise<unknown> | unknown;

export interface ModuleProviderImplementation {
  capability: string;
  methods: Record<string, ModuleMethodHandler>;
}

export interface ModulePluginDefinition {
  providers: ModuleProviderImplementation[];
  activate?: (ctx: Omit<ModuleMethodContext, 'job'>) => Promise<void> | void;
  deactivate?: (ctx: Omit<ModuleMethodContext, 'job'>) => Promise<void> | void;
}

type JsonSchemaRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const dynamicImport = async (specifier: string): Promise<unknown> => {
  return await (0, eval)(`import(${JSON.stringify(specifier)})`);
};

const parseSemver = (value: string): [number, number, number] => {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return [0, 0, 0];
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const compareSemver = (left: string, right: string): number => {
  const [leftMajor, leftMinor, leftPatch] = parseSemver(left);
  const [rightMajor, rightMinor, rightPatch] = parseSemver(right);
  if (leftMajor !== rightMajor) {
    return leftMajor - rightMajor;
  }
  if (leftMinor !== rightMinor) {
    return leftMinor - rightMinor;
  }
  return leftPatch - rightPatch;
};

export const matchesVersionRange = (version: string, versionRange?: string): boolean => {
  if (!versionRange || versionRange.trim().length === 0) {
    return true;
  }

  const trimmed = versionRange.trim();
  if (trimmed.startsWith('^')) {
    const baseline = trimmed.slice(1);
    const [versionMajor] = parseSemver(version);
    const [baselineMajor] = parseSemver(baseline);
    return versionMajor === baselineMajor && compareSemver(version, baseline) >= 0;
  }

  return version === trimmed;
};

const validateJsonSchemaValue = (schema: JsonSchemaRecord, value: unknown, pointer: string, errors: string[]): void => {
  const schemaType = typeof schema.type === 'string' ? schema.type : undefined;
  if (schemaType === 'object') {
    if (!isRecord(value)) {
      errors.push(`${pointer} must be an object`);
      return;
    }

    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === 'string') : [];
    for (const requiredKey of required) {
      if (!(requiredKey in value)) {
        errors.push(`${pointer}.${requiredKey} is required`);
      }
    }

    const properties = isRecord(schema.properties) ? schema.properties : {};
    for (const [key, childSchema] of Object.entries(properties)) {
      if (!(key in value) || !isRecord(childSchema)) {
        continue;
      }
      validateJsonSchemaValue(childSchema, value[key], `${pointer}.${key}`, errors);
    }

    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(properties));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          errors.push(`${pointer}.${key} is not allowed`);
        }
      }
    }
    return;
  }

  if (schemaType === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${pointer} must be an array`);
      return;
    }
    if (isRecord(schema.items)) {
      value.forEach((item, index) => {
        validateJsonSchemaValue(schema.items as JsonSchemaRecord, item, `${pointer}[${index}]`, errors);
      });
    }
    return;
  }

  if (schemaType === 'string' && typeof value !== 'string') {
    errors.push(`${pointer} must be a string`);
    return;
  }
  if (schemaType === 'number' && typeof value !== 'number') {
    errors.push(`${pointer} must be a number`);
    return;
  }
  if (schemaType === 'integer' && (!Number.isInteger(value) || typeof value !== 'number')) {
    errors.push(`${pointer} must be an integer`);
    return;
  }
  if (schemaType === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${pointer} must be a boolean`);
    return;
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => Object.is(candidate, value))) {
    errors.push(`${pointer} must be one of the enum values`);
  }
};

export const validateContractSchema = async (
  schemaPath: string,
  payload: unknown,
  errorCode: string
): Promise<void> => {
  const raw = await fs.readFile(schemaPath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw createError(errorCode, `Invalid schema file: ${schemaPath}`, { schemaPath });
  }

  const errors: string[] = [];
  validateJsonSchemaValue(parsed, payload, '$', errors);
  if (errors.length > 0) {
    throw createError(errorCode, `Contract validation failed: ${schemaPath}`, {
      schemaPath,
      errors
    });
  }
};

export const buildModuleProviderRecords = (
  plugin: PluginRecord,
  runtimeStatus: 'enabled' | 'disabled' | 'running' | 'error'
): ModuleProviderRecord[] => {
  const moduleMeta = plugin.manifest.module;
  if (!moduleMeta) {
    return [];
  }

  return moduleMeta.provides.map((provider) => ({
    pluginId: plugin.manifest.id,
    capability: provider.capability,
    version: provider.version,
    runtime: moduleMeta.runtime,
    activation: moduleMeta.activation,
    methods: provider.methods.map((method) => ({
      name: method.name,
      mode: method.mode,
      inputSchema: method.inputSchema ?? '',
      outputSchema: method.outputSchema ?? '',
      description: method.description
    })),
    permissions: [...plugin.manifest.permissions],
    status: runtimeStatus,
    description: provider.description
  }));
};

const normalizeModuleExport = (loaded: unknown): ModulePluginDefinition => {
  const candidate = isRecord(loaded) && isRecord(loaded.default) ? loaded.default : loaded;
  if (!isRecord(candidate)) {
    throw createError('MODULE_INVALID', 'Module entry must export an object definition');
  }

  const providersValue = Array.isArray(candidate.providers) ? candidate.providers : [];
  if (providersValue.length > 0) {
    const providers = providersValue.map((provider) => {
      if (!isRecord(provider) || typeof provider.capability !== 'string' || !isRecord(provider.methods)) {
        throw createError('MODULE_INVALID', 'Module providers must declare capability and methods');
      }

      return {
        capability: provider.capability,
        methods: Object.fromEntries(
          Object.entries(provider.methods).filter((entry): entry is [string, ModuleMethodHandler] => typeof entry[1] === 'function')
        )
      };
    });

    return {
      providers,
      activate: typeof candidate.activate === 'function' ? candidate.activate as ModulePluginDefinition['activate'] : undefined,
      deactivate: typeof candidate.deactivate === 'function' ? candidate.deactivate as ModulePluginDefinition['deactivate'] : undefined
    };
  }

  if (typeof candidate.capability === 'string' && isRecord(candidate.methods)) {
    return {
      providers: [
        {
          capability: candidate.capability,
          methods: Object.fromEntries(
            Object.entries(candidate.methods).filter((entry): entry is [string, ModuleMethodHandler] => typeof entry[1] === 'function')
          )
        }
      ],
      activate: typeof candidate.activate === 'function' ? candidate.activate as ModulePluginDefinition['activate'] : undefined,
      deactivate: typeof candidate.deactivate === 'function' ? candidate.deactivate as ModulePluginDefinition['deactivate'] : undefined
    };
  }

  throw createError('MODULE_INVALID', 'Module entry must export providers or capability + methods');
};

export const loadModuleDefinition = async (entryPath: string): Promise<ModulePluginDefinition> => {
  const extension = path.extname(entryPath).toLowerCase();
  const imported =
    extension === '.cjs' || extension === '.js'
      ? createRequire(pathToFileURL(entryPath))(entryPath)
      : await dynamicImport(pathToFileURL(entryPath).href);
  return normalizeModuleExport(imported);
};

export const resolveInstalledModuleEntry = (plugin: PluginRecord): string => {
  if (typeof plugin.manifest.entry !== 'string' || plugin.manifest.entry.trim().length === 0) {
    throw createError('MODULE_INVALID', 'Module plugin entry must be a string path', {
      pluginId: plugin.manifest.id,
      entry: plugin.manifest.entry
    });
  }

  return path.resolve(plugin.installPath, plugin.manifest.entry);
};

export const findManifestProvider = (
  moduleMeta: ModulePluginManifestMeta,
  capability: string
): ModuleProviderManifestMeta | undefined => {
  return moduleMeta.provides.find((provider) => provider.capability === capability);
};

export const findManifestMethod = (
  provider: ModuleProviderManifestMeta,
  methodName: string
): ModuleMethodManifestMeta | undefined => {
  return provider.methods.find((method) => method.name === methodName);
};

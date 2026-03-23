import fs from 'node:fs/promises';
import path from 'node:path';
import { parseYamlLite } from '../../shared/yaml-lite';
import type { RuntimeClient } from '../../renderer/runtime-client';

export interface ManifestSummary {
  id?: string;
  name?: string;
  type?: string;
}

export interface ModuleJobSnapshot {
  job: {
    status: string;
    output?: unknown;
    error?: unknown;
    progress?: Record<string, unknown>;
  };
}

interface ConfiguredPluginRecord {
  id?: string;
  manifestPath?: string;
  enabled?: boolean;
}

interface SyncConfiguredPluginsOptions {
  skipPluginIds?: string[];
}

const readConfiguredPlugins = async (workspacePath: string): Promise<ConfiguredPluginRecord[]> => {
  try {
    const raw = await fs.readFile(path.join(workspacePath, 'plugins.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const pathExists = async (candidate: string): Promise<boolean> => {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
};

const resolveConfiguredPluginSourcePath = async (workspacePath: string, manifestPath: string): Promise<string> => {
  if (path.isAbsolute(manifestPath)) {
    return manifestPath;
  }

  const candidates = [
    path.resolve(path.dirname(workspacePath), manifestPath),
    path.resolve(process.cwd(), manifestPath),
    path.resolve(workspacePath, manifestPath),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return path.resolve(path.dirname(workspacePath), manifestPath);
};

export const readManifestSummary = async (manifestPath: string): Promise<ManifestSummary> => {
  const raw = await fs.readFile(manifestPath, 'utf-8');
  const parsed = parseYamlLite(raw) as Record<string, unknown>;
  return {
    id: typeof parsed.id === 'string' ? parsed.id : undefined,
    name: typeof parsed.name === 'string' ? parsed.name : undefined,
    type: typeof parsed.type === 'string' ? parsed.type : undefined
  };
};

export const reinstallAndEnablePlugin = async (
  runtime: RuntimeClient,
  manifestPath: string,
  pluginId?: string
): Promise<{ pluginId: string }> => {
  return reinstallPlugin(runtime, manifestPath, {
    pluginId,
    enabled: true
  });
};

export const reinstallPlugin = async (
  runtime: RuntimeClient,
  manifestPath: string,
  options: { pluginId?: string; enabled?: boolean } = {}
): Promise<{ pluginId: string }> => {
  const { pluginId, enabled = false } = options;

  if (pluginId) {
    try {
      await runtime.invoke('plugin.disable', { pluginId });
    } catch {
      // ignore missing/disabled plugin
    }
    try {
      await runtime.invoke('plugin.uninstall', { pluginId });
    } catch {
      // ignore missing plugin
    }
  }

  const installed = await runtime.invoke<{ pluginId: string }>('plugin.install', { manifestPath });
  if (enabled) {
    await runtime.invoke('plugin.enable', { pluginId: installed.pluginId });
  }
  return installed;
};

export const syncConfiguredWorkspacePlugins = async (
  runtime: RuntimeClient,
  workspacePath: string,
  options: SyncConfiguredPluginsOptions = {}
): Promise<void> => {
  const skip = new Set(options.skipPluginIds ?? []);
  const configuredPlugins = await readConfiguredPlugins(workspacePath);

  for (const record of configuredPlugins) {
    if (typeof record?.manifestPath !== 'string' || record.manifestPath.trim().length === 0) {
      continue;
    }

    const pluginId = typeof record.id === 'string' && record.id.trim().length > 0
      ? record.id.trim()
      : undefined;
    if (pluginId && skip.has(pluginId)) {
      continue;
    }

    const resolvedManifestPath = await resolveConfiguredPluginSourcePath(workspacePath, record.manifestPath.trim());
    await reinstallPlugin(runtime, resolvedManifestPath, {
      pluginId,
      enabled: record.enabled !== false
    });
  }
};

export const waitForModuleJob = async (
  runtime: RuntimeClient,
  jobId: string,
  timeoutMs: number
): Promise<ModuleJobSnapshot['job']> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const snapshot = await runtime.invoke<ModuleJobSnapshot>('module.job.get', { jobId });
    if (
      snapshot.job.status === 'completed' ||
      snapshot.job.status === 'failed' ||
      snapshot.job.status === 'cancelled'
    ) {
      return snapshot.job;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for module job: ${jobId}`);
};

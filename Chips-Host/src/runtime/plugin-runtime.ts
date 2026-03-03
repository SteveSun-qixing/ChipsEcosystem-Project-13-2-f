import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { StoreZipService } from '../../packages/zip-service/src';
import { createError } from '../shared/errors';
import { parseYamlLite } from '../shared/yaml-lite';
import { createId, now } from '../shared/utils';

export type PluginType = 'app' | 'card' | 'layout' | 'module' | 'theme';

export interface PluginManifest {
  id: string;
  version: string;
  type: PluginType;
  name: string;
  description?: string;
  permissions: string[];
  capabilities?: string[];
  entry?: string;
}

export interface PluginRecord {
  manifest: PluginManifest;
  manifestPath: string;
  installPath: string;
  enabled: boolean;
  installedAt: number;
}

export interface PluginSession {
  sessionId: string;
  pluginId: string;
  pluginType: PluginType;
  permissions: string[];
  locale: string;
  themeId: string;
  launchParams: Record<string, unknown>;
  sessionNonce: string;
  startedAt: number;
  status: 'handshaking' | 'running' | 'stopped';
}

export interface RuntimeQuota {
  cpuBudget: number;
  memoryBudgetMb: number;
  messageRateBudget: number;
}

export interface RuntimeSnapshot {
  plugins: PluginRecord[];
  sessions: PluginSession[];
}

const defaultQuota: RuntimeQuota = {
  cpuBudget: 100,
  memoryBudgetMb: 512,
  messageRateBudget: 1000
};

const pluginTypes: PluginType[] = ['app', 'card', 'layout', 'module', 'theme'];

const hasPluginType = (value: string): value is PluginType => pluginTypes.includes(value as PluginType);

const asStringArray = (value: unknown, field: string, sourcePath: string, allowEmpty = true): string[] => {
  if (!Array.isArray(value)) {
    throw createError('PLUGIN_INVALID', `${field} must be an array`, { sourcePath, field });
  }
  const entries = value.map((item) => (typeof item === 'string' ? item.trim() : ''));
  if (entries.some((item) => item.length === 0)) {
    throw createError('PLUGIN_INVALID', `${field} contains non-string entries`, { sourcePath, field });
  }
  if (!allowEmpty && entries.length === 0) {
    throw createError('PLUGIN_INVALID', `${field} cannot be empty`, { sourcePath, field });
  }
  return entries;
};

interface InstallSource {
  manifest: PluginManifest;
  manifestPath: string;
  pluginRoot: string;
  cleanup?: () => Promise<void>;
}

export class PluginRuntime {
  private readonly plugins = new Map<string, PluginRecord>();
  private readonly sessions = new Map<string, PluginSession>();
  private readonly quotaByPlugin = new Map<string, RuntimeQuota>();
  private readonly zip = new StoreZipService();

  public constructor(
    private readonly workspacePath: string,
    private readonly defaults: { locale: string; themeId: string }
  ) {}

  public async load(): Promise<void> {
    const filePath = this.recordsPath();
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as PluginRecord[];
      for (const record of parsed) {
        const normalized: PluginRecord = {
          ...record,
          installPath:
            typeof record.installPath === 'string' && record.installPath.length > 0
              ? record.installPath
              : path.dirname(record.manifestPath)
        };
        this.plugins.set(normalized.manifest.id, normalized);
        this.quotaByPlugin.set(normalized.manifest.id, defaultQuota);
      }
    } catch {
      await this.persist();
    }
  }

  public async install(sourcePath: string): Promise<PluginRecord> {
    const source = await this.resolveInstallSource(sourcePath);
    try {
      if (this.plugins.has(source.manifest.id)) {
        throw createError('PLUGIN_ALREADY_EXISTS', `Plugin already exists: ${source.manifest.id}`);
      }

      const installPath = this.installPath(source.manifest.id);
      const existingPath = await this.statSafe(installPath);
      if (existingPath) {
        throw createError('PLUGIN_ALREADY_EXISTS', `Plugin directory already exists: ${installPath}`);
      }

      await fs.mkdir(path.dirname(installPath), { recursive: true });
      await fs.cp(source.pluginRoot, installPath, { recursive: true });
      const relativeManifestPath = path.relative(source.pluginRoot, source.manifestPath);
      const installedManifestPath = path.join(installPath, relativeManifestPath);

      const record: PluginRecord = {
        manifest: source.manifest,
        manifestPath: installedManifestPath,
        installPath,
        enabled: false,
        installedAt: now()
      };

      this.plugins.set(source.manifest.id, record);
      this.quotaByPlugin.set(source.manifest.id, defaultQuota);
      await this.persist();
      return record;
    } finally {
      if (source.cleanup) {
        await source.cleanup();
      }
    }
  }

  public async uninstall(pluginId: string): Promise<void> {
    const record = this.plugins.get(pluginId);
    if (!record) {
      throw createError('PLUGIN_NOT_FOUND', `Plugin not found: ${pluginId}`);
    }

    this.plugins.delete(pluginId);
    this.quotaByPlugin.delete(pluginId);
    this.closeSessions(pluginId);
    await fs.rm(record.installPath, { recursive: true, force: true });
    await this.persist();
  }

  public async enable(pluginId: string): Promise<void> {
    const record = this.plugins.get(pluginId);
    if (!record) {
      throw createError('PLUGIN_NOT_FOUND', `Plugin not found: ${pluginId}`);
    }
    record.enabled = true;
    await this.persist();
  }

  public async disable(pluginId: string): Promise<void> {
    const record = this.plugins.get(pluginId);
    if (!record) {
      throw createError('PLUGIN_NOT_FOUND', `Plugin not found: ${pluginId}`);
    }
    record.enabled = false;
    this.closeSessions(pluginId);
    await this.persist();
  }

  public query(filter?: { type?: PluginType; capability?: string }): PluginRecord[] {
    let list = [...this.plugins.values()];
    if (filter?.type) {
      list = list.filter((record) => record.manifest.type === filter.type);
    }
    if (filter?.capability) {
      list = list.filter((record) => (record.manifest.capabilities ?? []).includes(filter.capability!));
    }
    return list;
  }

  public get(pluginId: string): PluginRecord {
    const record = this.plugins.get(pluginId);
    if (!record) {
      throw createError('PLUGIN_NOT_FOUND', `Plugin not found: ${pluginId}`);
    }
    return record;
  }

  public pluginInit(pluginId: string, launchParams: Record<string, unknown> = {}): PluginSession {
    const plugin = this.get(pluginId);
    if (!plugin.enabled) {
      throw createError('PLUGIN_DISABLED', `Plugin disabled: ${pluginId}`);
    }

    const session: PluginSession = {
      sessionId: createId(),
      pluginId,
      pluginType: plugin.manifest.type,
      permissions: [...plugin.manifest.permissions],
      locale: this.defaults.locale,
      themeId: this.defaults.themeId,
      launchParams,
      sessionNonce: createId(),
      startedAt: now(),
      status: 'handshaking'
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  public completeHandshake(sessionId: string, nonce: string): PluginSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw createError('PLUGIN_SESSION_NOT_FOUND', `Session not found: ${sessionId}`);
    }

    if (session.sessionNonce !== nonce) {
      throw createError('PLUGIN_HANDSHAKE_FAILED', 'Invalid session nonce');
    }

    session.status = 'running';
    return session;
  }

  public stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.status = 'stopped';
    this.sessions.delete(sessionId);
  }

  public ensurePermission(pluginId: string, permission: string): void {
    const plugin = this.get(pluginId);
    if (!plugin.manifest.permissions.includes(permission)) {
      throw createError('PERMISSION_DENIED', `Plugin lacks permission: ${permission}`, {
        pluginId,
        permission
      });
    }
  }

  public getQuota(pluginId: string): RuntimeQuota {
    return this.quotaByPlugin.get(pluginId) ?? defaultQuota;
  }

  public setQuota(pluginId: string, quota: Partial<RuntimeQuota>): RuntimeQuota {
    const existing = this.getQuota(pluginId);
    const next: RuntimeQuota = {
      cpuBudget: quota.cpuBudget ?? existing.cpuBudget,
      memoryBudgetMb: quota.memoryBudgetMb ?? existing.memoryBudgetMb,
      messageRateBudget: quota.messageRateBudget ?? existing.messageRateBudget
    };
    this.quotaByPlugin.set(pluginId, next);
    return next;
  }

  public snapshot(): RuntimeSnapshot {
    return {
      plugins: this.query(),
      sessions: [...this.sessions.values()]
    };
  }

  private closeSessions(pluginId: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.pluginId === pluginId) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private recordsPath(): string {
    return path.join(this.workspacePath, 'plugin-runtime.json');
  }

  private installPath(pluginId: string): string {
    return path.join(this.workspacePath, 'plugins', pluginId);
  }

  private async resolveInstallSource(sourcePath: string): Promise<InstallSource> {
    const absolutePath = path.resolve(sourcePath);
    const sourceStats = await this.statSafe(absolutePath);
    if (!sourceStats) {
      throw createError('PLUGIN_SOURCE_NOT_FOUND', `Plugin source not found: ${absolutePath}`);
    }

    if (sourceStats.isDirectory()) {
      const manifestPath = await this.findManifestPath(absolutePath);
      const manifest = await this.readManifest(manifestPath);
      await this.ensureEntryExists(manifest, manifestPath);
      return {
        manifest,
        manifestPath,
        pluginRoot: absolutePath
      };
    }

    if (path.extname(absolutePath).toLowerCase() === '.cpk') {
      const extracted = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-plugin-cpk-'));
      try {
        await this.zip.extract(absolutePath, extracted);
      } catch (error) {
        await fs.rm(extracted, { recursive: true, force: true });
        throw createError('PLUGIN_PACKAGE_INVALID', 'Failed to extract .cpk package', {
          sourcePath: absolutePath,
          reason: String(error)
        });
      }

      const manifestPath = await this.findManifestPath(extracted);
      const manifest = await this.readManifest(manifestPath);
      await this.ensureEntryExists(manifest, manifestPath);
      return {
        manifest,
        manifestPath,
        pluginRoot: extracted,
        cleanup: async () => {
          await fs.rm(extracted, { recursive: true, force: true });
        }
      };
    }

    const manifest = await this.readManifest(absolutePath);
    const staged = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-plugin-manifest-'));
    const stagedManifestPath = path.join(staged, path.basename(absolutePath));
    await fs.copyFile(absolutePath, stagedManifestPath);

    if (manifest.entry) {
      const sourceEntryPath = path.resolve(path.dirname(absolutePath), manifest.entry);
      const entryStats = await this.statSafe(sourceEntryPath);
      if (!entryStats) {
        await fs.rm(staged, { recursive: true, force: true });
        throw createError('PLUGIN_ENTRY_NOT_FOUND', `Plugin entry not found: ${manifest.entry}`, {
          sourcePath: absolutePath,
          entry: manifest.entry
        });
      }
      const stagedEntryPath = path.join(staged, manifest.entry);
      await fs.mkdir(path.dirname(stagedEntryPath), { recursive: true });
      await fs.cp(sourceEntryPath, stagedEntryPath, { recursive: true });
    }

    return {
      manifest,
      manifestPath: stagedManifestPath,
      pluginRoot: staged,
      cleanup: async () => {
        await fs.rm(staged, { recursive: true, force: true });
      }
    };
  }

  private async findManifestPath(rootPath: string): Promise<string> {
    const canonicalNames = ['manifest.yaml', 'manifest.yml', 'manifest.json'];
    for (const name of canonicalNames) {
      const candidate = path.join(rootPath, name);
      const exists = await this.statSafe(candidate);
      if (exists?.isFile()) {
        return candidate;
      }
    }

    const stack = [rootPath];
    const candidates: string[] = [];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }
        if (entry.isFile() && this.isManifestFileName(entry.name)) {
          candidates.push(fullPath);
        }
      }
    }

    if (candidates.length === 0) {
      throw createError('PLUGIN_MANIFEST_NOT_FOUND', 'Cannot locate plugin manifest file', {
        rootPath
      });
    }

    candidates.sort((left, right) => {
      const leftRank = this.manifestRank(path.basename(left));
      const rightRank = this.manifestRank(path.basename(right));
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.localeCompare(right);
    });

    return candidates[0]!;
  }

  private async readManifest(manifestPath: string): Promise<PluginManifest> {
    const ext = path.extname(manifestPath).toLowerCase();
    const raw = await fs.readFile(manifestPath, 'utf-8');
    let parsed: unknown;

    if (ext === '.json') {
      parsed = JSON.parse(raw);
    } else if (ext === '.yaml' || ext === '.yml') {
      parsed = parseYamlLite(raw);
    } else {
      throw createError('PLUGIN_MANIFEST_UNSUPPORTED', `Unsupported manifest format: ${manifestPath}`, {
        manifestPath
      });
    }

    if (!parsed || typeof parsed !== 'object') {
      throw createError('PLUGIN_INVALID', 'Manifest content must be an object', { manifestPath });
    }

    const record = parsed as Record<string, unknown>;
    if (
      typeof record.id !== 'string' ||
      typeof record.version !== 'string' ||
      typeof record.type !== 'string' ||
      typeof record.name !== 'string'
    ) {
      throw createError('PLUGIN_INVALID', 'Manifest missing required fields', { manifestPath });
    }

    if (!hasPluginType(record.type)) {
      throw createError('PLUGIN_INVALID', `Invalid plugin type: ${record.type}`, { manifestPath });
    }

    const permissions = asStringArray(record.permissions, 'permissions', manifestPath, false);
    const capabilities =
      typeof record.capabilities === 'undefined'
        ? undefined
        : asStringArray(record.capabilities, 'capabilities', manifestPath, true);

    return {
      id: record.id,
      version: record.version,
      type: record.type,
      name: record.name,
      description: typeof record.description === 'string' ? record.description : undefined,
      permissions,
      capabilities,
      entry: typeof record.entry === 'string' ? record.entry : undefined
    };
  }

  private async ensureEntryExists(manifest: PluginManifest, manifestPath: string): Promise<void> {
    if (!manifest.entry) {
      return;
    }

    const entryPath = path.resolve(path.dirname(manifestPath), manifest.entry);
    const entryStats = await this.statSafe(entryPath);
    if (!entryStats) {
      throw createError('PLUGIN_ENTRY_NOT_FOUND', `Plugin entry not found: ${manifest.entry}`, {
        manifestPath,
        entry: manifest.entry
      });
    }
  }

  private manifestRank(fileName: string): number {
    const normalized = fileName.toLowerCase();
    if (normalized === 'manifest.yaml') {
      return 0;
    }
    if (normalized === 'manifest.yml') {
      return 1;
    }
    if (normalized === 'manifest.json') {
      return 2;
    }
    if (normalized.endsWith('.plugin.json')) {
      return 3;
    }
    return 4;
  }

  private isManifestFileName(fileName: string): boolean {
    const normalized = fileName.toLowerCase();
    return (
      normalized === 'manifest.yaml' ||
      normalized === 'manifest.yml' ||
      normalized === 'manifest.json' ||
      normalized.endsWith('.plugin.json')
    );
  }

  private async statSafe(inputPath: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean } | null> {
    try {
      return await fs.stat(inputPath);
    } catch {
      return null;
    }
  }

  private async persist(): Promise<void> {
    await fs.mkdir(this.workspacePath, { recursive: true });
    await fs.writeFile(this.recordsPath(), JSON.stringify(this.query(), null, 2), 'utf-8');
  }
}

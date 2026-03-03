import fs from 'node:fs/promises';
import path from 'node:path';
import { createError } from '../shared/errors';
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

export class PluginRuntime {
  private readonly plugins = new Map<string, PluginRecord>();
  private readonly sessions = new Map<string, PluginSession>();
  private readonly quotaByPlugin = new Map<string, RuntimeQuota>();

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
        this.plugins.set(record.manifest.id, record);
        this.quotaByPlugin.set(record.manifest.id, defaultQuota);
      }
    } catch {
      await this.persist();
    }
  }

  public async install(manifestPath: string): Promise<PluginRecord> {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as PluginManifest;

    if (!manifest.id || !manifest.version || !manifest.type || !manifest.name) {
      throw createError('PLUGIN_INVALID', 'Manifest missing required fields', { manifestPath });
    }

    if (this.plugins.has(manifest.id)) {
      throw createError('PLUGIN_ALREADY_EXISTS', `Plugin already exists: ${manifest.id}`);
    }

    const record: PluginRecord = {
      manifest,
      manifestPath,
      enabled: false,
      installedAt: now()
    };

    this.plugins.set(manifest.id, record);
    this.quotaByPlugin.set(manifest.id, defaultQuota);
    await this.persist();
    return record;
  }

  public async uninstall(pluginId: string): Promise<void> {
    if (!this.plugins.has(pluginId)) {
      throw createError('PLUGIN_NOT_FOUND', `Plugin not found: ${pluginId}`);
    }

    this.plugins.delete(pluginId);
    this.quotaByPlugin.delete(pluginId);
    this.closeSessions(pluginId);
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

  private async persist(): Promise<void> {
    await fs.mkdir(this.workspacePath, { recursive: true });
    await fs.writeFile(this.recordsPath(), JSON.stringify(this.query(), null, 2), 'utf-8');
  }
}

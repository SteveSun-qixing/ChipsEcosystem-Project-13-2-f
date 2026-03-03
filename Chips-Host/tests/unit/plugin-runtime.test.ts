import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginRuntime } from '../../src/runtime';

let workspace: string;
let runtime: PluginRuntime;

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-runtime-test-'));
  runtime = new PluginRuntime(workspace, {
    locale: 'zh-CN',
    themeId: 'chips-official.default-theme'
  });
  await runtime.load();
});

afterEach(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
});

describe('PluginRuntime', () => {
  it('installs/enables/queries plugins', async () => {
    const manifestPath = path.join(workspace, 'demo.plugin.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          id: 'chips.demo.plugin',
          version: '1.0.0',
          type: 'app',
          name: 'Demo Plugin',
          permissions: ['file.read']
        },
        null,
        2
      )
    );

    const record = await runtime.install(manifestPath);
    expect(record.manifest.id).toBe('chips.demo.plugin');

    await runtime.enable('chips.demo.plugin');
    const queried = runtime.query();
    expect(queried).toHaveLength(1);
    expect(queried[0]?.enabled).toBe(true);
  });

  it('creates and completes plugin-init handshake sessions', async () => {
    const manifestPath = path.join(workspace, 'session.plugin.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          id: 'chips.session.plugin',
          version: '1.0.0',
          type: 'app',
          name: 'Session Plugin',
          permissions: ['file.read']
        },
        null,
        2
      )
    );

    await runtime.install(manifestPath);
    await runtime.enable('chips.session.plugin');

    const session = runtime.pluginInit('chips.session.plugin', { entry: 'viewer' });
    expect(session.status).toBe('handshaking');

    const completed = runtime.completeHandshake(session.sessionId, session.sessionNonce);
    expect(completed.status).toBe('running');
  });

  it('enforces permissions and quotas', async () => {
    const manifestPath = path.join(workspace, 'perm.plugin.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          id: 'chips.perm.plugin',
          version: '1.0.0',
          type: 'app',
          name: 'Permission Plugin',
          permissions: ['file.read']
        },
        null,
        2
      )
    );

    await runtime.install(manifestPath);
    expect(() => runtime.ensurePermission('chips.perm.plugin', 'file.write')).toThrow();

    const quota = runtime.setQuota('chips.perm.plugin', {
      cpuBudget: 40,
      memoryBudgetMb: 256
    });
    expect(quota.cpuBudget).toBe(40);
    expect(runtime.getQuota('chips.perm.plugin').memoryBudgetMb).toBe(256);
  });
});

import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StoreZipService } from '../../packages/zip-service/src';
import { PluginRuntime } from '../../src/runtime';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  it('installs plugin from root manifest with dist entry', async () => {
    const projectDir = path.join(workspace, 'root-manifest-project');
    await fs.mkdir(path.join(projectDir, 'dist'), { recursive: true });
    const manifestPath = path.join(projectDir, 'manifest.yaml');
    await fs.writeFile(
      manifestPath,
      [
        'id: chips.root.manifest',
        'version: "1.0.0"',
        'type: app',
        'name: Root Manifest Plugin',
        'permissions:',
        '  - file.read',
        'entry: dist/index.html'
      ].join('\n'),
      'utf-8'
    );
    await fs.writeFile(path.join(projectDir, 'dist', 'index.html'), '<!doctype html>', 'utf-8');

    const record = await runtime.install(manifestPath);
    expect(record.manifest.id).toBe('chips.root.manifest');
    await expect(fs.access(path.join(record.installPath, 'manifest.yaml'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(record.installPath, 'dist', 'index.html'))).resolves.toBeUndefined();
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

  it('installs .cpk package with manifest.yaml', async () => {
    const packageDir = path.join(workspace, 'cpk-source');
    await fs.mkdir(path.join(packageDir, 'dist'), { recursive: true });
    await fs.writeFile(
      path.join(packageDir, 'manifest.yaml'),
      [
        'id: chips.cpk.plugin',
        'version: "1.0.0"',
        'type: app',
        'name: CPK Plugin',
        'permissions:',
        '  - file.read',
        'capabilities:',
        '  - preview',
        'entry: dist/main.js'
      ].join('\n'),
      'utf-8'
    );
    await fs.writeFile(path.join(packageDir, 'dist/main.js'), 'module.exports = {};', 'utf-8');

    const cpkPath = path.join(workspace, 'chips.cpk.plugin.cpk');
    const zip = new StoreZipService();
    await zip.compress(packageDir, cpkPath);

    const record = await runtime.install(cpkPath);
    expect(record.manifest.id).toBe('chips.cpk.plugin');
    expect(record.manifest.permissions).toEqual(['file.read']);
    expect(record.manifest.capabilities).toEqual(['preview']);
    expect(record.manifestPath.endsWith('manifest.yaml')).toBe(true);
    await expect(fs.access(path.join(record.installPath, 'dist/main.js'))).resolves.toBeUndefined();
  });

  it('installs .cpk package generated by chipsdev package', async () => {
    const projectDir = path.join(workspace, 'chipsdev-package-source');
    const sdkCliPath = path.resolve(__dirname, '../../../Chips-SDK/cli/index.js');

    await fs.mkdir(path.join(projectDir, 'dist'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'chips.config.mjs'),
      ['export default {', "  type: 'app',", "  outDir: 'dist'", '};'].join('\n'),
      'utf-8'
    );
    await fs.writeFile(
      path.join(projectDir, 'manifest.yaml'),
      [
        'id: chips.sdk.generated',
        'version: "1.0.0"',
        'type: app',
        'name: SDK Generated Plugin',
        'permissions:',
        '  - file.read',
        'entry: dist/main.js'
      ].join('\n'),
      'utf-8'
    );
    await fs.writeFile(path.join(projectDir, 'dist', 'main.js'), 'module.exports = {};', 'utf-8');

    await new Promise<void>((resolve, reject) => {
      const child = childProcess.spawn('node', [sdkCliPath, 'package'], {
        cwd: projectDir,
        stdio: 'pipe',
        env: process.env
      });
      let stderr = '';

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(stderr || `chipsdev package exited with code ${code}`));
      });
    });

    const cpkPath = path.join(projectDir, 'dist', 'chips.sdk.generated-1.0.0.cpk');
    const record = await runtime.install(cpkPath);
    expect(record.manifest.id).toBe('chips.sdk.generated');
    await expect(fs.access(path.join(record.installPath, 'dist/main.js'))).resolves.toBeUndefined();
  });

  it('requires signature for non-local plugin source', async () => {
    const manifestPath = path.join(workspace, 'signed.plugin.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          id: 'chips.signed.plugin',
          version: '1.0.0',
          type: 'app',
          name: 'Signed Plugin',
          permissions: ['file.read'],
          source: 'official'
        },
        null,
        2
      )
    );

    await expect(runtime.install(manifestPath)).rejects.toMatchObject({
      code: 'PLUGIN_SIGNATURE_INVALID'
    });
  });
});

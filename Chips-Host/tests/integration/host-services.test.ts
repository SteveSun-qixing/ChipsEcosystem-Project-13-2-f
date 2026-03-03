import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HostApplication } from '../../src/main/core/host-application';
import { openAssociatedFile } from '../../src/main/core/file-association';
import { StoreZipService } from '../../packages/zip-service/src';
import { RuntimeClient } from '../../src/renderer/runtime-client';

let workspace: string;
let app: HostApplication;
let runtime: RuntimeClient;

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-host-it-'));
  app = new HostApplication({ workspacePath: workspace });
  await app.start();
  runtime = new RuntimeClient(app.createBridge(), {
    defaultTimeout: 5000,
    maxRetries: 1,
    retryDelay: 10,
    retryBackoff: 2,
    enableRetry: true
  });
});

afterEach(async () => {
  await app.stop();
  await fs.rm(workspace, { recursive: true, force: true });
});

describe('Host services integration', () => {
  it('reads and writes configuration through routes', async () => {
    await runtime.invoke('config.set', { key: 'ui.language', value: 'zh-CN' });
    const result = await runtime.invoke<{ value: string }>('config.get', { key: 'ui.language' });
    expect(result.value).toBe('zh-CN');
  });

  it('lists and applies themes', async () => {
    const list = await runtime.invoke<{ themes: Array<{ id: string }> }>('theme.list', {});
    expect(list.themes.length).toBeGreaterThan(0);

    await runtime.invoke('theme.apply', { id: list.themes[0]!.id });
    const current = await runtime.invoke<{ theme: { id: string } }>('theme.getCurrent', {});
    expect(current.theme.id).toBe(list.themes[0]!.id);
  });

  it('supports i18n translation and locale switching', async () => {
    await runtime.invoke('i18n.setCurrent', { locale: 'en-US' });
    const translated = await runtime.invoke<{ text: string }>('i18n.translate', { key: 'system.ready' });
    expect(translated.text).toBe('System ready');
  });

  it('creates window records via window service', async () => {
    const opened = await runtime.invoke<{ window: { id: string } }>('window.open', {
      config: { title: 'Demo', width: 800, height: 600 }
    });
    expect(opened.window.id).toBeTypeOf('string');

    const focused = await runtime.invoke('window.focus', { windowId: opened.window.id });
    expect(focused).toMatchObject({ ack: true });
  });

  it('writes and queries logs', async () => {
    await runtime.invoke('log.write', { level: 'info', message: 'integration-log' });
    const result = await runtime.invoke<{ entries: Array<{ message: string }> }>('log.query', {});
    expect(result.entries.some((entry) => entry.message === 'integration-log')).toBe(true);
  });

  it('returns control-plane health report', async () => {
    const report = await runtime.invoke<{ status: string; report: { routes: number; services: number } }>('control-plane.health', {});
    expect(report.status).toBe('ok');
    expect(report.report.services).toBe(16);
    expect(report.report.routes).toBeGreaterThan(30);
  });

  it('supports plugin runtime handshake flow', async () => {
    const manifestPath = path.join(workspace, 'runtime.plugin.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        id: 'chips.runtime.plugin',
        version: '1.0.0',
        type: 'app',
        name: 'Runtime Plugin',
        permissions: ['file.read']
      })
    );

    const installed = await runtime.invoke<{ pluginId: string }>('plugin.install', { manifestPath });
    await runtime.invoke('plugin.enable', { pluginId: installed.pluginId });
    const init = await runtime.invoke<{ session: { sessionId: string; sessionNonce: string } }>('plugin.init', {
      pluginId: installed.pluginId
    });
    const completed = await runtime.invoke<{ session: { status: string } }>('plugin.handshake.complete', {
      sessionId: init.session.sessionId,
      nonce: init.session.sessionNonce
    });
    expect(completed.session.status).toBe('running');
  });

  it('installs plugin from .cpk package', async () => {
    const packageDir = path.join(workspace, 'demo-cpk-plugin');
    await fs.mkdir(path.join(packageDir, 'dist'), { recursive: true });
    await fs.writeFile(
      path.join(packageDir, 'manifest.yaml'),
      [
        'id: chips.runtime.cpk',
        'version: "1.0.0"',
        'type: app',
        'name: Runtime CPK Plugin',
        'permissions:',
        '  - file.read',
        'entry: dist/main.js'
      ].join('\n'),
      'utf-8'
    );
    await fs.writeFile(path.join(packageDir, 'dist/main.js'), 'module.exports = {};', 'utf-8');

    const cpkPath = path.join(workspace, 'chips.runtime.cpk.cpk');
    const zip = new StoreZipService();
    await zip.compress(packageDir, cpkPath);

    const installed = await runtime.invoke<{ pluginId: string }>('plugin.install', { manifestPath: cpkPath });
    expect(installed.pluginId).toBe('chips.runtime.cpk');

    const queried = await runtime.invoke<{ plugins: Array<{ id: string; manifestPath: string }> }>('plugin.query', {});
    expect(queried.plugins.some((plugin) => plugin.id === 'chips.runtime.cpk')).toBe(true);
  });

  it('uses plugin handler when opening associated card file', async () => {
    const pluginDir = path.join(workspace, 'card-handler-plugin');
    await fs.mkdir(path.join(pluginDir, 'dist'), { recursive: true });
    await fs.writeFile(
      path.join(pluginDir, 'manifest.yaml'),
      [
        'id: chips.card.handler',
        'version: "1.0.0"',
        'type: app',
        'name: Card Handler',
        'permissions:',
        '  - file.read',
        'capabilities:',
        '  - file-handler:.card',
        'entry: dist/index.html'
      ].join('\n'),
      'utf-8'
    );
    await fs.writeFile(path.join(pluginDir, 'dist/index.html'), '<html><body>card handler</body></html>', 'utf-8');

    const zip = new StoreZipService();
    const cpkPath = path.join(workspace, 'chips.card.handler.cpk');
    await zip.compress(pluginDir, cpkPath);
    const installed = await runtime.invoke<{ pluginId: string }>('plugin.install', { manifestPath: cpkPath });
    await runtime.invoke('plugin.enable', { pluginId: installed.pluginId });

    const cardSourceDir = path.join(workspace, 'card-open-source');
    await fs.mkdir(path.join(cardSourceDir, '.card'), { recursive: true });
    await fs.writeFile(path.join(cardSourceDir, '.card/metadata.yaml'), 'id: test.card\nname: Test Card\n', 'utf-8');
    await fs.writeFile(path.join(cardSourceDir, '.card/structure.yaml'), 'cards: []\n', 'utf-8');
    await fs.writeFile(path.join(cardSourceDir, '.card/cover.html'), '<h1>cover</h1>', 'utf-8');
    const cardFile = path.join(workspace, 'associated.card');
    await zip.compress(cardSourceDir, cardFile);

    const result = await openAssociatedFile(runtime, cardFile);
    expect(result.mode).toBe('card');
    expect(result.pluginId).toBe('chips.card.handler');
    expect(result.windowId).toBeTypeOf('string');
  });
});

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { StoreZipService } from '../../packages/zip-service/src';

let workspace: string;

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-cli-test-'));
  process.env.CHIPS_HOME = workspace;
});

afterEach(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
  delete process.env.CHIPS_HOME;
});

describe('chips host cli', () => {
  it('supports start/status/stop lifecycle', async () => {
    const { runCli } = await import('../../src/main/cli/index');

    expect(await runCli(['start'])).toBe(0);
    expect(await runCli(['status'])).toBe(0);
    expect(await runCli(['stop'])).toBe(0);
  });

  it('supports config set/list', async () => {
    const { runCli } = await import('../../src/main/cli/index');

    expect(await runCli(['config', 'set', 'editor.autoSave', 'true'])).toBe(0);
    expect(await runCli(['config', 'list'])).toBe(0);
  });

  it('supports doctor command', async () => {
    const { runCli } = await import('../../src/main/cli/index');
    const code = await runCli(['doctor']);
    expect(code).toBe(0);
  });

  it('supports plugin lifecycle commands', async () => {
    const { runCli } = await import('../../src/main/cli/index');
    const manifestPath = path.join(workspace, 'demo.plugin.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        id: 'chips.cli.plugin',
        version: '1.0.0',
        type: 'app',
        name: 'CLI Plugin',
        permissions: ['file.read']
      })
    );

    expect(await runCli(['plugin', 'install', manifestPath])).toBe(0);
    expect(await runCli(['plugin', 'list'])).toBe(0);
    expect(await runCli(['plugin', 'query'])).toBe(0);
  });

  it('supports theme management commands', async () => {
    const { runCli } = await import('../../src/main/cli/index');

    expect(await runCli(['theme', 'list'])).toBe(0);
    expect(await runCli(['theme', 'current'])).toBe(0);
    expect(await runCli(['theme', 'validate'])).toBe(0);
  });

  it('opens .card file through file association entry', async () => {
    const { runCli } = await import('../../src/main/cli/index');
    const cardSourceDir = path.join(workspace, 'demo-card-source');
    await fs.mkdir(path.join(cardSourceDir, '.card'), { recursive: true });
    await fs.writeFile(path.join(cardSourceDir, '.card/metadata.yaml'), 'id: demo.card\nname: Demo Card\n', 'utf-8');
    await fs.writeFile(path.join(cardSourceDir, '.card/structure.yaml'), 'cards: []\n', 'utf-8');
    await fs.writeFile(path.join(cardSourceDir, '.card/cover.html'), '<h1>cover</h1>', 'utf-8');

    const cardFile = path.join(workspace, 'demo.card');
    const zip = new StoreZipService();
    await zip.compress(cardSourceDir, cardFile);

    expect(await runCli(['open', cardFile])).toBe(0);
  });
});

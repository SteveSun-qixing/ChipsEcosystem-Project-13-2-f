import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

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
});

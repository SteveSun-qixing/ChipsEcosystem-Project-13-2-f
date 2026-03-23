import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncConfiguredWorkspacePlugins } from '../../src/main/electron/dev-plugin-utils';

let workspace: string;

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-dev-plugin-utils-'));
});

afterEach(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
});

describe('dev-plugin-utils', () => {
  it('reinstalls configured workspace plugins and preserves configured enablement', async () => {
    const projectRoot = path.dirname(workspace);
    const enabledManifestPath = path.join(projectRoot, 'enabled.plugin.yaml');
    const disabledManifestPath = path.join(projectRoot, 'disabled.plugin.yaml');
    await fs.writeFile(enabledManifestPath, 'id: chips.enabled.plugin\n', 'utf-8');
    await fs.writeFile(disabledManifestPath, 'id: chips.disabled.plugin\n', 'utf-8');

    await fs.writeFile(
      path.join(workspace, 'plugins.json'),
      JSON.stringify(
        [
          {
            id: 'chips.enabled.plugin',
            manifestPath: path.basename(enabledManifestPath),
            enabled: true
          },
          {
            id: 'chips.disabled.plugin',
            manifestPath: path.basename(disabledManifestPath),
            enabled: false
          },
          {
            id: 'chips.skipped.plugin',
            manifestPath: '/tmp/skipped.plugin.yaml',
            enabled: true
          }
        ],
        null,
        2
      ),
      'utf-8'
    );

    const invoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
      if (action === 'plugin.install') {
        return {
          pluginId: typeof payload?.manifestPath === 'string' && payload.manifestPath.includes('enabled')
            ? 'chips.enabled.plugin'
            : 'chips.disabled.plugin'
        };
      }
      return { ack: true };
    });

    await syncConfiguredWorkspacePlugins({ invoke } as any, workspace, {
      skipPluginIds: ['chips.skipped.plugin']
    });

    expect(invoke.mock.calls).toEqual([
      ['plugin.disable', { pluginId: 'chips.enabled.plugin' }],
      ['plugin.uninstall', { pluginId: 'chips.enabled.plugin' }],
      ['plugin.install', { manifestPath: enabledManifestPath }],
      ['plugin.enable', { pluginId: 'chips.enabled.plugin' }],
      ['plugin.disable', { pluginId: 'chips.disabled.plugin' }],
      ['plugin.uninstall', { pluginId: 'chips.disabled.plugin' }],
      ['plugin.install', { manifestPath: disabledManifestPath }]
    ]);
  });
});

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reinstallPlugin, syncConfiguredWorkspacePlugins } from '../../src/main/electron/dev-plugin-utils';

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
      ['plugin.install', { manifestPath: enabledManifestPath }],
      ['plugin.enable', { pluginId: 'chips.enabled.plugin' }],
      ['plugin.install', { manifestPath: disabledManifestPath }],
      ['plugin.disable', { pluginId: 'chips.disabled.plugin' }]
    ]);
  });

  it('falls back from missing dist cpk to the project manifest', async () => {
    const projectRoot = path.join(workspace, 'viewer-project');
    await fs.mkdir(path.join(projectRoot, 'dist'), { recursive: true });
    const fallbackManifestPath = path.join(projectRoot, 'manifest.yaml');
    await fs.writeFile(fallbackManifestPath, 'id: chips.viewer\n', 'utf-8');

    await fs.writeFile(
      path.join(workspace, 'plugins.json'),
      JSON.stringify(
        [
          {
            id: 'chips.viewer',
            manifestPath: path.join(projectRoot, 'dist', 'chips.viewer-0.1.0.cpk'),
            enabled: true
          }
        ],
        null,
        2
      ),
      'utf-8'
    );

    const invoke = vi.fn(async (action: string) => {
      if (action === 'plugin.install') {
        return { pluginId: 'chips.viewer' };
      }
      return { ack: true };
    });

    await syncConfiguredWorkspacePlugins({ invoke } as any, workspace);

    expect(invoke.mock.calls).toEqual([
      ['plugin.install', { manifestPath: fallbackManifestPath }],
      ['plugin.enable', { pluginId: 'chips.viewer' }]
    ]);
  });

  it('skips unresolved configured plugin sources without uninstalling the existing copy', async () => {
    await fs.writeFile(
      path.join(workspace, 'plugins.json'),
      JSON.stringify(
        [
          {
            id: 'chips.missing.plugin',
            manifestPath: '/tmp/chips-missing-plugin/dist/chips.missing.plugin-0.1.0.cpk',
            enabled: true
          }
        ],
        null,
        2
      ),
      'utf-8'
    );

    const invoke = vi.fn(async () => ({ ack: true }));

    await syncConfiguredWorkspacePlugins({ invoke } as any, workspace);

    expect(invoke).not.toHaveBeenCalled();
  });

  it('enforces the configured enablement after formal replacement install', async () => {
    const invoke = vi.fn(async (action: string) => {
      if (action === 'plugin.install') {
        return { pluginId: 'chips.replaced.plugin' };
      }
      return { ack: true };
    });

    await reinstallPlugin({ invoke } as any, '/tmp/chips.replaced.plugin/manifest.yaml', {
      pluginId: 'chips.replaced.plugin',
      enabled: false
    });

    expect(invoke.mock.calls).toEqual([
      ['plugin.install', { manifestPath: '/tmp/chips.replaced.plugin/manifest.yaml' }],
      ['plugin.disable', { pluginId: 'chips.replaced.plugin' }]
    ]);
  });
});

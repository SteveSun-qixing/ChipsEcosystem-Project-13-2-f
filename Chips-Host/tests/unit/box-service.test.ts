import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { BoxService } from '../../packages/box-service/src';
import { StoreZipService } from '../../packages/zip-service/src';
import type { PluginRuntime } from '../../src/runtime';

const BOX_ID = 'b1C2d3E4f5';
const ENTRY_ID = 'e9K2m1P4q7';

const workspaces: string[] = [];

const createWorkspace = async (): Promise<string> => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-box-service-test-'));
  workspaces.push(workspace);
  return workspace;
};

const writeText = async (targetPath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, 'utf-8');
};

const createValidBoxDirectory = async (rootDir: string, cardFile: string): Promise<void> => {
  await writeText(
    path.join(rootDir, '.box/metadata.yaml'),
    [
      'chip_standards_version: "1.0.0"',
      `box_id: "${BOX_ID}"`,
      'name: "旅行箱"',
      'created_at: "2026-03-23T09:30:00.000Z"',
      'modified_at: "2026-03-23T11:20:00.000Z"',
      'active_layout_type: "chips.layout.grid"',
      'cover_ratio: "3:4"',
      'tags:',
      '  - "旅行"',
      'cover_asset: "assets/placeholders/box-cover.webp"',
      ''
    ].join('\n')
  );

  await writeText(
    path.join(rootDir, '.box/structure.yaml'),
    [
      'entries:',
      `  - entry_id: "${ENTRY_ID}"`,
      `    url: "${pathToFileURL(cardFile).href}"`,
      '    enabled: true',
      '    snapshot:',
      '      document_id: "c7H1k2L9m3"',
      '      title: "第一天"',
      '      summary: "抵达后的路线记录"',
      '      tags:',
      '        - "旅行"',
      '      cover:',
      '        mode: "asset"',
      '        asset_path: "assets/previews/e9K2m1P4q7-cover.webp"',
      '        mime_type: "image/webp"',
      '        width: 640',
      '        height: 360',
      '      last_known_modified_at: "2026-03-22T08:00:00.000Z"',
      '      content_type: "chips/card"',
      '    layout_hints:',
      '      sort_key: "2026-03-22"',
      '      aspect_ratio: 1.7778',
      '      group: "东京"',
      '      priority: 3',
      ''
    ].join('\n')
  );

  await writeText(
    path.join(rootDir, '.box/cover.html'),
    '<!doctype html><html><body>旅行箱封面</body></html>',
  );

  await writeText(
    path.join(rootDir, '.box/content.yaml'),
    [
      'active_layout_type: "chips.layout.grid"',
      'layout_configs:',
      '  chips.layout.grid:',
      '    schema_version: "1.0.0"',
      '    props:',
      '      column_count: 4',
      '      gap: 16',
      '    asset_refs:',
      '      - "assets/layouts/grid/background.webp"',
      ''
    ].join('\n')
  );

  await writeText(path.join(rootDir, 'assets/placeholders/box-cover.webp'), 'cover');
  await writeText(path.join(rootDir, 'assets/previews/e9K2m1P4q7-cover.webp'), 'preview');
  await writeText(path.join(rootDir, 'assets/layouts/grid/background.webp'), 'layout-background');
};

afterEach(async () => {
  while (workspaces.length > 0) {
    const workspace = workspaces.pop();
    if (!workspace) {
      continue;
    }
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

describe('BoxService', () => {
  it('validates, reads metadata and inspects the normalized box package', async () => {
    const workspace = await createWorkspace();
    const sourceDir = path.join(workspace, 'source-box');
    const boxFile = path.join(workspace, 'travel.box');
    const cardFile = path.join(workspace, 'cards/day-01.card');
    await writeText(cardFile, 'demo card');
    await createValidBoxDirectory(sourceDir, cardFile);

    const service = new BoxService();
    await service.pack(sourceDir, boxFile);

    await expect(service.validate(boxFile)).resolves.toEqual({
      valid: true,
      errors: [],
    });
    await expect(service.readMetadata(boxFile)).resolves.toMatchObject({
      boxId: BOX_ID,
      name: '旅行箱',
      activeLayoutType: 'chips.layout.grid',
      coverRatio: '3:4',
      coverAsset: 'assets/placeholders/box-cover.webp',
    });

    const inspection = await service.inspect(boxFile);
    expect(inspection.content.activeLayoutType).toBe('chips.layout.grid');
    expect(inspection.assets).toContain('assets/previews/e9K2m1P4q7-cover.webp');
    expect(inspection.entries[0]).toMatchObject({
      entryId: ENTRY_ID,
      enabled: true,
      snapshot: {
        title: '第一天',
        cover: {
          mode: 'asset',
          assetPath: 'assets/previews/e9K2m1P4q7-cover.webp',
        },
      },
      layoutHints: {
        group: '东京',
        priority: 3,
      },
    });
  });

  it('opens box view sessions and serves entry detail plus box assets', async () => {
    const workspace = await createWorkspace();
    const sourceDir = path.join(workspace, 'source-box');
    const boxFile = path.join(workspace, 'travel.box');
    const cardFile = path.join(workspace, 'cards/day-01.card');
    await writeText(cardFile, 'demo card');
    await createValidBoxDirectory(sourceDir, cardFile);

    const service = new BoxService();
    await service.pack(sourceDir, boxFile);

    const opened = await service.openView(boxFile, {
      ownerKey: 'app:test-viewer',
      initialQuery: {
        limit: 10,
      },
    });

    expect(opened.box.boxId).toBe(BOX_ID);
    expect(opened.box.coverRatio).toBe('3:4');
    expect(opened.initialView.total).toBe(1);
    expect(opened.initialView.items[0]?.entryId).toBe(ENTRY_ID);

    await expect(service.listEntries(opened.sessionId, 'app:test-viewer', { filter: { enabled: true } })).resolves.toMatchObject({
      total: 1,
    });

    await expect(
      service.readEntryDetail(opened.sessionId, [ENTRY_ID], ['status', 'documentInfo'], {
        ownerKey: 'app:test-viewer',
        readCardInfo: async (resolvedCardFile) => ({
          cardFile: resolvedCardFile,
          info: {
            status: {
              state: 'ready',
              exists: true,
              valid: true
            },
            metadata: {
              raw: {
                name: 'Demo Card'
              },
              name: 'Demo Card'
            }
          }
        }),
      })
    ).resolves.toEqual({
      items: [
        {
          entryId: ENTRY_ID,
          detail: {
            status: {
              state: 'ready',
              scheme: 'file',
              url: pathToFileURL(cardFile).href,
            },
            documentInfo: {
              kind: 'card',
              status: {
                state: 'ready',
                exists: true,
                valid: true
              },
              metadata: {
                raw: {
                  name: 'Demo Card'
                },
                name: 'Demo Card'
              }
            },
          },
        },
      ],
    });

    const asset = await service.readBoxAsset(opened.sessionId, 'assets/layouts/grid/background.webp', 'app:test-viewer');
    expect(asset.mimeType).toBe('image/webp');
    expect(asset.resourceUrl.startsWith('file://')).toBe(true);

    const coverResource = await service.resolveEntryResource(
      opened.sessionId,
      ENTRY_ID,
      { kind: 'cover' },
      {
        ownerKey: 'app:test-viewer',
        readCardInfo: async () => ({
          cardFile,
          info: {
            status: {
              state: 'ready',
              exists: true,
              valid: true
            },
            cover: {
              title: 'Demo Card',
              resourceUrl: pathToFileURL(path.join(workspace, 'cover.html')).href,
              mimeType: 'text/html'
            }
          }
        })
      }
    );
    expect(coverResource.mimeType).toBe('image/webp');
    expect(coverResource.resourceUrl.startsWith('file://')).toBe(true);

    await expect(
      service.renderEntryCover(opened.sessionId, ENTRY_ID, {
        ownerKey: 'app:test-viewer',
        readCardInfo: async () => ({
          cardFile,
          info: {
            status: {
              state: 'ready',
              exists: true,
              valid: true
            },
            cover: {
              title: 'Demo Card',
              resourceUrl: pathToFileURL(path.join(workspace, 'cover.html')).href,
              mimeType: 'text/html',
              ratio: '3:4'
            },
            metadata: {
              raw: {
                name: 'Demo Card'
              },
              name: 'Demo Card',
              coverRatio: '3:4'
            }
          }
        })
      })
    ).resolves.toEqual({
      title: '第一天',
      coverUrl: coverResource.resourceUrl,
      mimeType: 'image/webp',
      ratio: '640:360'
    });

    await expect(
      service.prefetchEntries(opened.sessionId, [ENTRY_ID], ['cover', 'documentInfo'], {
        ownerKey: 'app:test-viewer',
        readCardInfo: async () => ({
          cardFile,
          info: {
            status: {
              state: 'ready',
              exists: true,
              valid: true
            }
          }
        }),
      })
    ).resolves.toEqual({ ack: true });

    await expect(
      service.openEntry(opened.sessionId, ENTRY_ID, {
        ownerKey: 'app:test-viewer',
        openCardFile: async (resolvedCardFile) => ({
          mode: 'document-window',
          documentType: 'card',
          windowId: `window:${resolvedCardFile}`
        })
      })
    ).resolves.toEqual({
      mode: 'document-window',
      documentType: 'card',
      windowId: `window:${cardFile}`
    });

    await expect(service.closeView(opened.sessionId, 'app:test-viewer')).resolves.toEqual({ ack: true });
    await expect(service.listEntries(opened.sessionId, 'app:test-viewer')).rejects.toMatchObject({
      code: 'BOX_VIEW_SESSION_NOT_FOUND',
    });
  });

  it('rejects legacy box fields during validation', async () => {
    const workspace = await createWorkspace();
    const invalidRoot = path.join(workspace, 'invalid-box');
    const invalidBoxFile = path.join(workspace, 'invalid.box');
    const cardFile = path.join(workspace, 'cards/day-01.card');
    await writeText(cardFile, 'demo card');
    await writeText(
      path.join(invalidRoot, '.box/metadata.yaml'),
      [
        'chip_standards_version: "1.0.0"',
        `box_id: "${BOX_ID}"`,
        'name: "坏箱子"',
        'created_at: "2026-03-23T09:30:00.000Z"',
        'modified_at: "2026-03-23T11:20:00.000Z"',
        'active_layout_type: "chips.layout.grid"',
        ''
      ].join('\n')
    );
    await writeText(
      path.join(invalidRoot, '.box/structure.yaml'),
      [
        'entries:',
        `  - entry_id: "${ENTRY_ID}"`,
        `    url: "${pathToFileURL(cardFile).href}"`,
        '    enabled: true',
        '    internal: true',
        ''
      ].join('\n')
    );
    await writeText(
      path.join(invalidRoot, '.box/content.yaml'),
      [
        'active_layout_type: "chips.layout.grid"',
        'layout_configs:',
        '  chips.layout.grid: {}',
        ''
      ].join('\n')
    );
    await writeText(
      path.join(invalidRoot, '.box/cover.html'),
      '<!doctype html><html><body>坏箱子封面</body></html>',
    );

    const zipService = new StoreZipService();
    await zipService.compress(invalidRoot, invalidBoxFile);

    const service = new BoxService();
    await expect(service.validate(invalidBoxFile)).resolves.toEqual({
      valid: false,
      errors: ['structure.entries[0] contains legacy location fields.'],
    });
  });

  it('renders box layout editor documents with a full-height editor root', async () => {
    const workspace = await createWorkspace();
    const pluginDir = path.join(workspace, 'plugins/chips-layout-grid');
    await writeText(
      path.join(pluginDir, 'index.mjs'),
      [
        'export const layoutDefinition = {',
        '  pluginId: "chips.layout.grid.plugin",',
        '  layoutType: "chips.layout.grid",',
        '  displayName: "Grid Layout",',
        '  createDefaultConfig() { return {}; },',
        '  normalizeConfig(input = {}) { return input; },',
        '  validateConfig() { return { valid: true, errors: {} }; },',
        '  renderView() {},',
        '  renderEditor() {},',
        '};',
        '',
      ].join('\n'),
    );

    const runtime: Pick<PluginRuntime, 'query'> = {
      query(filter) {
        if (filter?.type !== 'layout') {
          return [];
        }
        return [
          {
            enabled: true,
            installPath: pluginDir,
            manifestPath: path.join(pluginDir, 'manifest.yaml'),
            installedAt: Date.now(),
            manifest: {
              id: 'chips.layout.grid.plugin',
              version: '1.0.0',
              type: 'layout',
              name: 'Grid Layout',
              permissions: [],
              entry: 'index.mjs',
              layout: {
                layoutType: 'chips.layout.grid',
                displayName: 'Grid Layout',
              },
            },
          },
        ];
      },
    };

    const service = new BoxService(undefined, { runtime });

    const rendered = await service.renderLayoutEditor({
      layoutType: 'chips.layout.grid',
      entries: [],
      initialConfig: {},
      theme: {
        id: 'theme.test',
        tokens: {},
      },
    });

    const documentPath = fileURLToPath(rendered.documentUrl);
    const body = await fs.readFile(documentPath, 'utf-8');
    expect(body).toContain('html, body { margin: 0; padding: 0; width: 100%; height: 100%; min-height: 100%; background: transparent; }');
    expect(body).toContain('#chips-box-layout-editor-root { width: 100%; height: 100%; min-height: 0; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }');

    await service.releaseRenderSession(rendered.sessionId);
  });
});

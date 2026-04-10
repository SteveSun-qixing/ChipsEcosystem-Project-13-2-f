import { beforeEach, describe, expect, it, vi } from 'vitest';
import yaml from 'yaml';
import { BoxDocumentService, DEFAULT_BOX_LAYOUT_TYPE } from '../../src/services/box-document-service';

const { mockFileService, mockClient } = vi.hoisted(() => ({
  mockFileService: {
    exists: vi.fn<[string], Promise<boolean>>(),
    mkdir: vi.fn<[string], Promise<void>>(),
    readText: vi.fn<[string], Promise<string>>(),
    writeText: vi.fn<[string, string], Promise<void>>(),
    writeBinary: vi.fn<[string, Uint8Array], Promise<void>>(),
    delete: vi.fn<[string], Promise<void>>(),
  },
  mockClient: {
    box: {
      pack: vi.fn<[string, { outputPath?: string }?], Promise<string>>(),
      inspect: vi.fn<[string], Promise<any>>(),
      unpack: vi.fn<[string, string], Promise<string>>(),
      readMetadata: vi.fn<[string], Promise<any>>(),
      readLayoutDescriptor: vi.fn<[string], Promise<any>>(),
      normalizeLayoutConfig: vi.fn<[string, Record<string, unknown>], Promise<Record<string, unknown>>>(),
    },
    plugin: {
      query: vi.fn(async () => []),
    },
  },
}));

vi.mock('../../src/services/file-service', () => ({
  fileService: mockFileService,
}));

vi.mock('../../src/services/bridge-client', () => ({
  getChipsClient: () => mockClient,
}));

describe('BoxDocumentService', () => {
  const files = new Map<string, string>();
  const directories = new Set<string>();
  let lastPackedSnapshot: {
    metadata?: Record<string, unknown>;
    content?: Record<string, unknown>;
    structure?: Record<string, unknown>;
  } = {};

  const setFile = (filePath: string, content: string) => {
    files.set(filePath, content);
    const parent = filePath.split('/').slice(0, -1).join('/');
    if (parent) {
      directories.add(parent);
    }
  };

  const deletePath = (targetPath: string) => {
    files.delete(targetPath);
    directories.delete(targetPath);
    for (const filePath of Array.from(files.keys())) {
      if (filePath.startsWith(`${targetPath}/`)) {
        files.delete(filePath);
      }
    }
    for (const dirPath of Array.from(directories)) {
      if (dirPath.startsWith(`${targetPath}/`)) {
        directories.delete(dirPath);
      }
    }
  };

  beforeEach(() => {
    files.clear();
    directories.clear();
    directories.add('/');
    directories.add('/workspace');
    vi.clearAllMocks();
    lastPackedSnapshot = {};

    mockFileService.exists.mockImplementation(async (targetPath) => files.has(targetPath) || directories.has(targetPath));
    mockFileService.mkdir.mockImplementation(async (targetPath) => {
      directories.add(targetPath);
    });
    mockFileService.writeText.mockImplementation(async (targetPath, content) => {
      setFile(targetPath, content);
    });
    mockFileService.readText.mockImplementation(async (targetPath) => {
      return files.get(targetPath) ?? '';
    });
    mockFileService.writeBinary.mockImplementation(async (targetPath, content) => {
      setFile(targetPath, Buffer.from(content).toString('base64'));
    });
    mockFileService.delete.mockImplementation(async (targetPath) => {
      deletePath(targetPath);
    });

    mockClient.box.pack.mockImplementation(async (boxDir, options) => {
      lastPackedSnapshot = {
        metadata: yaml.parse(files.get(`${boxDir}/.box/metadata.yaml`) ?? ''),
        content: yaml.parse(files.get(`${boxDir}/.box/content.yaml`) ?? ''),
        structure: yaml.parse(files.get(`${boxDir}/.box/structure.yaml`) ?? ''),
      };
      return options?.outputPath ?? `${boxDir}.box`;
    });
    mockClient.box.readLayoutDescriptor.mockResolvedValue({
      layoutType: DEFAULT_BOX_LAYOUT_TYPE,
      displayName: '网格布局',
      pluginId: 'chips.layout.grid',
      defaultConfig: {
        schemaVersion: '1.0.0',
        props: {
          columnCount: 4,
          gap: 16,
        },
        assetRefs: [],
      },
    });
    mockClient.box.normalizeLayoutConfig.mockImplementation(async (_layoutType, input) => ({
      schemaVersion: typeof input.schemaVersion === 'string' ? input.schemaVersion : '1.0.0',
      props: {
        columnCount: Number((input.props as Record<string, unknown> | undefined)?.columnCount ?? 4),
        gap: Number((input.props as Record<string, unknown> | undefined)?.gap ?? 16),
      },
      assetRefs: Array.isArray(input.assetRefs) ? input.assetRefs : [],
    }));
  });

  it('creates a single-file .box working package from the new document model', async () => {
    const service = new BoxDocumentService();

    const created = await service.createBoxFile('旅行箱', DEFAULT_BOX_LAYOUT_TYPE, '/workspace', '/workspace');

    expect(created.boxFile).toBe('/workspace/旅行箱.box');
    expect(mockClient.box.pack).toHaveBeenCalledTimes(1);
    expect(lastPackedSnapshot.metadata).toMatchObject({
      name: '旅行箱',
      active_layout_type: DEFAULT_BOX_LAYOUT_TYPE,
    });
    expect(lastPackedSnapshot.content).toMatchObject({
      active_layout_type: DEFAULT_BOX_LAYOUT_TYPE,
    });
    expect(lastPackedSnapshot.structure).toEqual({
      entries: [],
    });
  });

  it('opens, edits and saves a box session back through box.pack', async () => {
    const initialInspection = {
      metadata: {
        chipStandardsVersion: '1.0.0',
        boxId: 'box1234567',
        name: 'Demo Box',
        createdAt: '2026-03-23T00:00:00.000Z',
        modifiedAt: '2026-03-23T00:00:00.000Z',
        activeLayoutType: DEFAULT_BOX_LAYOUT_TYPE,
      },
      content: {
        activeLayoutType: DEFAULT_BOX_LAYOUT_TYPE,
        layoutConfigs: {
          [DEFAULT_BOX_LAYOUT_TYPE]: {
            schemaVersion: '1.0.0',
            props: {
              columnCount: 4,
              gap: 16,
            },
            assetRefs: [],
          },
        },
      },
      entries: [
        {
          entryId: 'entry000001',
          url: 'file:///workspace/cards/demo.card',
          enabled: true,
          snapshot: {
            title: 'Demo Card',
            summary: 'Demo summary',
            cover: {
              mode: 'none',
            },
          },
          layoutHints: {},
        },
      ],
      assets: [],
    };

    mockClient.box.inspect.mockResolvedValue(initialInspection);
    mockClient.box.unpack.mockImplementation(async (_boxFile, outputDir) => {
      directories.add(outputDir);
      directories.add(`${outputDir}/.box`);
      setFile(`${outputDir}/.box/metadata.yaml`, yaml.stringify({
        chip_standards_version: '1.0.0',
        box_id: 'box1234567',
        name: 'Demo Box',
        created_at: '2026-03-23T00:00:00.000Z',
        modified_at: '2026-03-23T00:00:00.000Z',
        active_layout_type: DEFAULT_BOX_LAYOUT_TYPE,
      }));
      setFile(`${outputDir}/.box/content.yaml`, yaml.stringify({
        active_layout_type: DEFAULT_BOX_LAYOUT_TYPE,
        layout_configs: {
          [DEFAULT_BOX_LAYOUT_TYPE]: {
            schema_version: '1.0.0',
            props: {
              columnCount: 4,
              gap: 16,
            },
            asset_refs: [],
          },
        },
      }));
      setFile(`${outputDir}/.box/structure.yaml`, yaml.stringify({
        entries: [
          {
            entry_id: 'entry000001',
            url: 'file:///workspace/cards/demo.card',
            enabled: true,
            snapshot: {
              title: 'Demo Card',
              summary: 'Demo summary',
              cover: {
                mode: 'none',
              },
            },
          },
        ],
      }));
      return outputDir;
    });

    const service = new BoxDocumentService();
    const opened = await service.openBox('/workspace/demo.box', '/workspace', 'box1234567');
    expect(opened.entries).toHaveLength(1);

    service.addEntry('box1234567', 'https://example.com/demo');
    service.updateLayoutConfig('box1234567', DEFAULT_BOX_LAYOUT_TYPE, {
      schemaVersion: '1.0.0',
      props: {
        columnCount: 6,
        gap: 20,
      },
      assetRefs: [],
    });

    const saved = await service.saveBox('box1234567');

    expect(mockClient.box.pack).toHaveBeenCalledTimes(1);
    expect(lastPackedSnapshot.content).toMatchObject({
      layout_configs: {
        [DEFAULT_BOX_LAYOUT_TYPE]: {
          props: {
            columnCount: 6,
            gap: 20,
          },
        },
      },
    });
    expect((lastPackedSnapshot.structure?.entries as Array<unknown>) ?? []).toHaveLength(2);
    expect(saved.isDirty).toBe(false);
  });

  it('deduplicates concurrent box open requests for the same file and box id', async () => {
    const initialInspection = {
      metadata: {
        chipStandardsVersion: '1.0.0',
        boxId: 'box1234567',
        name: 'Demo Box',
        createdAt: '2026-03-23T00:00:00.000Z',
        modifiedAt: '2026-03-23T00:00:00.000Z',
        activeLayoutType: DEFAULT_BOX_LAYOUT_TYPE,
      },
      content: {
        activeLayoutType: DEFAULT_BOX_LAYOUT_TYPE,
        layoutConfigs: {
          [DEFAULT_BOX_LAYOUT_TYPE]: {
            schemaVersion: '1.0.0',
            props: {
              columnCount: 4,
              gap: 16,
            },
            assetRefs: [],
          },
        },
      },
      entries: [],
      assets: [],
    };

    mockClient.box.inspect.mockResolvedValue(initialInspection);

    let releaseUnpack: (() => void) | null = null;
    const unpackStarted = new Promise<void>((resolve) => {
      mockClient.box.unpack.mockImplementationOnce(async (_boxFile, outputDir) => {
        directories.add(outputDir);
        directories.add(`${outputDir}/.box`);
        setFile(`${outputDir}/.box/metadata.yaml`, yaml.stringify({
          chip_standards_version: '1.0.0',
          box_id: 'box1234567',
          name: 'Demo Box',
          created_at: '2026-03-23T00:00:00.000Z',
          modified_at: '2026-03-23T00:00:00.000Z',
          active_layout_type: DEFAULT_BOX_LAYOUT_TYPE,
        }));
        setFile(`${outputDir}/.box/content.yaml`, yaml.stringify({
          active_layout_type: DEFAULT_BOX_LAYOUT_TYPE,
          layout_configs: {
            [DEFAULT_BOX_LAYOUT_TYPE]: {
              schema_version: '1.0.0',
              props: {
                columnCount: 4,
                gap: 16,
              },
              asset_refs: [],
            },
          },
        }));
        setFile(`${outputDir}/.box/structure.yaml`, yaml.stringify({
          entries: [],
        }));
        resolve();
        await new Promise<void>((next) => {
          releaseUnpack = next;
        });
        return outputDir;
      });
    });

    const service = new BoxDocumentService();
    const firstOpen = service.openBox('/workspace/demo.box', '/workspace', 'box1234567');
    await unpackStarted;
    const secondOpen = service.openBox('/workspace/demo.box', '/workspace', 'box1234567');
    releaseUnpack?.();

    const [firstSession, secondSession] = await Promise.all([firstOpen, secondOpen]);

    expect(mockClient.box.inspect).toHaveBeenCalledTimes(1);
    expect(mockClient.box.unpack).toHaveBeenCalledTimes(1);
    expect(firstSession.workspaceDir).toBe(secondSession.workspaceDir);
    expect(firstSession.boxId).toBe('box1234567');
    expect(secondSession.boxId).toBe('box1234567');
  });
});

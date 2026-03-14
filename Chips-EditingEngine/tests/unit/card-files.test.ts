import { beforeEach, describe, expect, it, vi } from 'vitest';
import yaml from 'yaml';
import { createCardInitializer } from '../../src/core/card-initializer';
import { createCardService } from '../../src/core/card-service';

type MockEntry = {
  path: string;
  isDirectory: boolean;
};

const { mockFileService } = vi.hoisted(() => ({
  mockFileService: {
    readText: vi.fn<(path: string) => Promise<string>>(),
    writeText: vi.fn<(path: string, content: string) => Promise<void>>(),
    exists: vi.fn<(path: string) => Promise<boolean>>(),
    ensureDir: vi.fn<(path: string) => Promise<void>>(),
    list: vi.fn<(path: string) => Promise<MockEntry[]>>(),
    delete: vi.fn<(path: string) => Promise<void>>(),
  },
}));

vi.mock('../../src/services/file-service', () => ({
  fileService: mockFileService,
}));

describe('unpacked .card files', () => {
  const files = new Map<string, string>();
  const directories = new Set<string>();

  const setFile = (filePath: string, content: string) => {
    files.set(filePath, content);
    const parent = filePath.split('/').slice(0, -1).join('/');
    if (parent) {
      directories.add(parent);
    }
  };

  const seedCardDirectory = () => {
    directories.add('/workspace/demo.card');
    directories.add('/workspace/demo.card/.card');
    directories.add('/workspace/demo.card/content');

    setFile('/workspace/demo.card/.card/metadata.yaml', yaml.stringify({
      chip_standards_version: '1.0.0',
      card_id: 'demo-card',
      name: '生态介绍',
      created_at: '2026-03-13T00:00:00.000Z',
      modified_at: '2026-03-13T00:00:00.000Z',
      theme: 'chips-official.default-theme',
      description: '测试卡片',
      tags: ['chips'],
    }));

    setFile('/workspace/demo.card/.card/structure.yaml', yaml.stringify({
      structure: [
        {
          id: 'intro',
          type: 'RichTextCard',
          created_at: '2026-03-13T00:00:00.000Z',
          modified_at: '2026-03-13T00:00:00.000Z',
        },
        {
          id: 'details',
          type: 'RichTextCard',
          created_at: '2026-03-13T00:00:00.000Z',
          modified_at: '2026-03-13T00:00:00.000Z',
        },
      ],
      manifest: {
        card_count: 2,
        resource_count: 0,
        resources: [],
      },
    }));

    setFile('/workspace/demo.card/content/intro.yaml', yaml.stringify({
      card_type: 'RichTextCard',
      content_text: '<h1>Intro</h1><p>Hello Chips.</p>',
    }));

    setFile('/workspace/demo.card/content/details.yaml', yaml.stringify({
      id: 'details',
      body: '<p>Second node body.</p>',
      locale: 'zh-CN',
    }));

    setFile('/workspace/demo.card/content/legacy-unused.yaml', yaml.stringify({
      id: 'legacy-unused',
      body: '<p>Unused</p>',
    }));
  };

  beforeEach(() => {
    files.clear();
    directories.clear();
    vi.clearAllMocks();

    mockFileService.readText.mockImplementation(async (filePath) => {
      const content = files.get(filePath);
      if (content === undefined) {
        throw new Error(`Missing file: ${filePath}`);
      }
      return content;
    });

    mockFileService.writeText.mockImplementation(async (filePath, content) => {
      setFile(filePath, content);
    });

    mockFileService.exists.mockImplementation(async (targetPath) => {
      return files.has(targetPath) || directories.has(targetPath);
    });

    mockFileService.ensureDir.mockImplementation(async (targetPath) => {
      directories.add(targetPath);
    });

    mockFileService.list.mockImplementation(async (dirPath) => {
      const prefix = `${dirPath}/`;
      return Array.from(files.keys())
        .filter((filePath) => filePath.startsWith(prefix) && !filePath.slice(prefix.length).includes('/'))
        .map((filePath) => ({
          path: filePath,
          isDirectory: false,
        }));
    });

    mockFileService.delete.mockImplementation(async (targetPath) => {
      files.delete(targetPath);
    });
  });

  it('creates complete unpacked .card folders for new cards', async () => {
    const initializer = createCardInitializer({
      workspaceRoot: '/workspace',
    });

    const result = await initializer.createCard('new-card', '新卡片', {
      id: 'intro',
      type: 'RichTextCard',
      config: {
        id: 'intro',
        body: '<p>你好</p>',
        locale: 'zh-CN',
      },
    });

    expect(result.success).toBe(true);
    expect(result.cardPath).toBe('/workspace/new-card.card');
    expect(directories.has('/workspace/new-card.card/.card')).toBe(true);
    expect(directories.has('/workspace/new-card.card/content')).toBe(true);

    const metadata = yaml.parse(files.get('/workspace/new-card.card/.card/metadata.yaml') ?? '');
    const structure = yaml.parse(files.get('/workspace/new-card.card/.card/structure.yaml') ?? '');
    const content = yaml.parse(files.get('/workspace/new-card.card/content/intro.yaml') ?? '');

    expect(metadata.name).toBe('新卡片');
    expect(structure.structure).toHaveLength(1);
    expect(content.body).toBe('<p>你好</p>');
    expect(files.get('/workspace/new-card.card/.card/cover.html')).toContain('新卡片');
  });

  it('opens unpacked .card directories and persists normalized base card updates', async () => {
    seedCardDirectory();
    const service = createCardService();

    const card = await service.openCard('demo-card', '/workspace/demo.card');

    expect(card.metadata.name).toBe('生态介绍');
    expect(card.structure.basicCards).toHaveLength(2);
    expect(card.structure.basicCards[0]).toMatchObject({
      id: 'intro',
      type: 'RichTextCard',
      data: {
        id: 'intro',
        body: '<h1>Intro</h1><p>Hello Chips.</p>',
        locale: 'zh-CN',
      },
    });

    service.removeBasicCard('demo-card', 'details');
    service.updateBasicCard('demo-card', 'intro', {
      body: '<p>已更新</p>',
    });
    await service.saveCard('demo-card');

    const persistedStructure = yaml.parse(files.get('/workspace/demo.card/.card/structure.yaml') ?? '');
    const persistedIntro = yaml.parse(files.get('/workspace/demo.card/content/intro.yaml') ?? '');

    expect(persistedStructure.structure).toHaveLength(1);
    expect(persistedIntro).toMatchObject({
      id: 'intro',
      body: '<p>已更新</p>',
      locale: 'zh-CN',
    });
    expect(files.has('/workspace/demo.card/content/details.yaml')).toBe(false);
    expect(files.has('/workspace/demo.card/content/legacy-unused.yaml')).toBe(false);
    expect(files.get('/workspace/demo.card/.card/cover.html')).toContain('生态介绍');
  });

  it('serializes rapid base card updates and persists the latest snapshot before preview refresh signals advance', async () => {
    seedCardDirectory();

    let releaseFirstIntroWrite: (() => void) | null = null;
    let firstIntroWriteBlocked = false;

    mockFileService.writeText.mockImplementation(async (filePath, content) => {
      if (filePath === '/workspace/demo.card/content/intro.yaml' && !firstIntroWriteBlocked) {
        firstIntroWriteBlocked = true;
        await new Promise<void>((resolve) => {
          releaseFirstIntroWrite = resolve;
        });
      }
      setFile(filePath, content);
    });

    const service = createCardService();
    await service.openCard('demo-card', '/workspace/demo.card');

    service.updateBasicCard('demo-card', 'intro', {
      body: '<p>first</p>',
    });
    service.updateBasicCard('demo-card', 'intro', {
      body: '<p>second</p>',
    });

    const pendingCard = service.getCard('demo-card');
    expect(pendingCard?.isPersisting).toBe(true);
    expect(pendingCard?.persistedRevision ?? 0).toBe(0);
    expect(pendingCard?.pendingPersistRevision).toBe(2);

    for (let attempt = 0; attempt < 20 && !releaseFirstIntroWrite; attempt += 1) {
      await Promise.resolve();
    }
    expect(releaseFirstIntroWrite).toBeTypeOf('function');
    releaseFirstIntroWrite?.();
    await service.saveCard('demo-card');

    const latestCard = service.getCard('demo-card');
    const persistedIntro = yaml.parse(files.get('/workspace/demo.card/content/intro.yaml') ?? '');

    expect(latestCard?.persistedRevision).toBe(2);
    expect(latestCard?.isPersisting).toBe(false);
    expect(persistedIntro).toMatchObject({
      id: 'intro',
      body: '<p>second</p>',
      locale: 'zh-CN',
    });
  });
});

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CardService } from '../../packages/card-service/src';
import { StoreZipService } from '../../packages/zip-service/src';
import { PluginRuntime } from '../../src/runtime';

const zip = new StoreZipService();
const tempDirs: string[] = [];

const createTempDir = async (prefix: string): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

const createCardArchive = async (): Promise<string> => {
  const sourceDir = await createTempDir('chips-card-source-');
  await fs.mkdir(path.join(sourceDir, '.card'), { recursive: true });
  await fs.mkdir(path.join(sourceDir, 'content'), { recursive: true });

  await fs.writeFile(
    path.join(sourceDir, '.card/metadata.yaml'),
    ['card_id: test-card-id', 'name: Test Card', 'theme: chips-official.default-theme'].join('\n'),
    'utf-8'
  );
  await fs.writeFile(
    path.join(sourceDir, '.card/structure.yaml'),
    ['structure:', '  - id: "intro"', '    type: "RichTextCard"', '  - id: "details"', '    type: "RichTextCard"'].join(
      '\n'
    ),
    'utf-8'
  );
  await fs.writeFile(path.join(sourceDir, '.card/cover.html'), '<h1>cover</h1>', 'utf-8');
  await fs.writeFile(
    path.join(sourceDir, 'content/intro.yaml'),
    ['card_type: "RichTextCard"', 'content_source: "inline"', 'content_text: |', '  <h1>Intro</h1>', '  <p>Hello Chips.</p>'].join(
      '\n'
    ),
    'utf-8'
  );
  await fs.writeFile(
    path.join(sourceDir, 'content/details.yaml'),
    ['card_type: "RichTextCard"', 'content_source: "inline"', 'content_text: |', '  <h1>Details</h1>', '  <p>Second node body.</p>'].join(
      '\n'
    ),
    'utf-8'
  );

  const outputDir = await createTempDir('chips-card-output-');
  const cardFile = path.join(outputDir, 'demo.card');
  await zip.compress(sourceDir, cardFile);
  return cardFile;
};

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

describe('CardService rendering', () => {
  it('renders card through unified rendering engine', async () => {
    const cardFile = await createCardArchive();
    const workspace = await createTempDir('chips-card-runtime-');
    const runtime = new PluginRuntime(workspace, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-theme'
    });
    await runtime.load();
    const install = await runtime.install(path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP'));
    await runtime.enable(install.manifest.id);
    const service = new CardService({ runtime, workspaceRoot: process.cwd() });

    const view = await service.render(cardFile, {
      target: 'card-iframe'
    });

    expect(view.title).toBe('Test Card');
    expect(view.target).toBe('card-iframe');
    expect(view.semanticHash.length).toBeGreaterThan(10);
    expect(view.body).toContain('data-target="card-iframe"');
    expect(view.body).toContain('Intro');
    expect(view.body).toContain('Hello Chips.');
    expect(view.body).toContain('chips.basecard.richtext');
    expect(view.contentFiles).toEqual(['details.yaml', 'intro.yaml']);
  }, 15_000);

  it('can run consistency verification during card render', async () => {
    const cardFile = await createCardArchive();
    const workspace = await createTempDir('chips-card-runtime-');
    const runtime = new PluginRuntime(workspace, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-theme'
    });
    await runtime.load();
    const install = await runtime.install(path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP'));
    await runtime.enable(install.manifest.id);
    const service = new CardService({ runtime, workspaceRoot: process.cwd() });

    const view = await service.render(cardFile, {
      target: 'offscreen-render',
      verifyConsistency: true
    });

    expect(view.target).toBe('offscreen-render');
    expect(view.consistency?.consistent).toBe(true);
    expect(view.body).toContain('data-target="offscreen-render"');
  }, 15_000);
});

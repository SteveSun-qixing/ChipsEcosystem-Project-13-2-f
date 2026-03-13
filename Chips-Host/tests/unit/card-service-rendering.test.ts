import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yaml from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { CardService } from '../../packages/card-service/src';
import { StoreZipService } from '../../packages/zip-service/src';
import { PluginRuntime } from '../../src/runtime';
import { mergeThemeLayers, resolveThemeFromLayers } from '../../src/main/theme-runtime/resolve-algorithm';
import { toRenderThemeSnapshot } from '../../src/main/theme-runtime/render-bridge';

type JsdomWindowLike = typeof globalThis & {
  parent?: unknown;
  dispatchEvent?: (event: unknown) => boolean;
  document?: {
    querySelector?: (selector: string) => {
      style?: {
        height?: string;
      };
    } | null;
  };
};
type JSDOMInstance = {
  window: JsdomWindowLike & { close: () => void };
};
type JSDOMConstructor = new (
  html?: string,
  options?: {
    runScripts?: 'dangerously' | 'outside-only';
    beforeParse?: (window: JsdomWindowLike) => void;
  },
) => JSDOMInstance;

const { JSDOM }: { JSDOM: JSDOMConstructor } = require('jsdom');

const zip = new StoreZipService();
const tempDirs: string[] = [];

const createTempDir = async (prefix: string): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

const createCardDirectory = async (): Promise<string> => {
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

  return sourceDir;
};

const createCardArchive = async (): Promise<string> => {
  const sourceDir = await createCardDirectory();
  const outputDir = await createTempDir('chips-card-output-');
  const cardFile = path.join(outputDir, 'demo.card');
  await zip.compress(sourceDir, cardFile);
  return cardFile;
};

const createPartiallyBrokenCardDirectory = async (): Promise<string> => {
  const sourceDir = await createTempDir('chips-card-source-broken-');
  await fs.mkdir(path.join(sourceDir, '.card'), { recursive: true });
  await fs.mkdir(path.join(sourceDir, 'content'), { recursive: true });

  await fs.writeFile(
    path.join(sourceDir, '.card/metadata.yaml'),
    ['card_id: broken-card-id', 'name: Broken Card', 'theme: chips-official.default-theme'].join('\n'),
    'utf-8',
  );
  await fs.writeFile(
    path.join(sourceDir, '.card/structure.yaml'),
    ['structure:', '  - id: "intro"', '    type: "RichTextCard"', '  - id: "missing"', '    type: "RichTextCard"'].join('\n'),
    'utf-8',
  );
  await fs.writeFile(path.join(sourceDir, '.card/cover.html'), '<h1>cover</h1>', 'utf-8');
  await fs.writeFile(
    path.join(sourceDir, 'content/intro.yaml'),
    ['card_type: "RichTextCard"', 'content_source: "inline"', 'content_text: |', '  <h1>Intro</h1>', '  <p>Hello Chips.</p>'].join('\n'),
    'utf-8',
  );

  return sourceDir;
};

const createYamlStringifiedCardDirectory = async (): Promise<string> => {
  const sourceDir = await createTempDir('chips-card-source-yaml-stringify-');
  await fs.mkdir(path.join(sourceDir, '.card'), { recursive: true });
  await fs.mkdir(path.join(sourceDir, 'content'), { recursive: true });

  await fs.writeFile(
    path.join(sourceDir, '.card/metadata.yaml'),
    yaml.stringify({
      chip_standards_version: '1.0.0',
      card_id: 'yaml-stringified-card-id',
      name: 'YAML Stringified Card',
      created_at: '2026-03-13T12:45:33.919Z',
      modified_at: '2026-03-13T12:45:47.501Z',
      theme: '',
      description: '',
      tags: [],
    }),
    'utf-8',
  );
  await fs.writeFile(
    path.join(sourceDir, '.card/structure.yaml'),
    yaml.stringify({
      structure: [
        {
          id: 'intro',
          type: 'base.richtext',
          created_at: '2026-03-13T12:45:33.919Z',
          modified_at: '2026-03-13T12:45:47.501Z',
        },
      ],
      manifest: {
        card_count: 1,
        resource_count: 0,
        resources: [],
      },
    }),
    'utf-8',
  );
  await fs.writeFile(path.join(sourceDir, '.card/cover.html'), '<h1>cover</h1>', 'utf-8');
  await fs.writeFile(
    path.join(sourceDir, 'content/intro.yaml'),
    yaml.stringify({
      id: 'intro',
      title: '1111',
      body: '<span style="font-weight: normal">2</span><p></p><span style="font-weight: normal">22</span><span style="font-weight: normal"><br></span><span style="font-weight: normal">2</span><span style="font-weight: normal">2</span><span style="font-weight: normal">2</span>',
      locale: 'zh-CN',
    }),
    'utf-8',
  );

  return sourceDir;
};

const loadThemeRenderContext = async (
  themeDir = '../ThemePack/Chips-default',
  themeId = 'chips-official.default-theme'
): Promise<{ theme: ReturnType<typeof toRenderThemeSnapshot>; themeCssText: string }> => {
  const themeRoot = path.resolve(process.cwd(), themeDir);
  const tokens = JSON.parse(await fs.readFile(path.join(themeRoot, 'dist', 'tokens.json'), 'utf-8')) as Record<string, unknown>;
  const themeCssText = await fs.readFile(path.join(themeRoot, 'dist', 'theme.css'), 'utf-8');
  const resolved = resolveThemeFromLayers(mergeThemeLayers([{ id: themeId, tokens }]));
  return {
    theme: toRenderThemeSnapshot(themeId, resolved),
    themeCssText
  };
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
    const themeContext = await loadThemeRenderContext();
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
      target: 'card-iframe',
      ...themeContext
    });

    expect(view.title).toBe('Test Card');
    expect(view.target).toBe('card-iframe');
    expect(view.semanticHash.length).toBeGreaterThan(10);
    expect(view.body).toContain('data-target="card-iframe"');
    expect(view.body).toContain('data-mode="view"');
    expect(view.body).toContain('Intro');
    expect(view.body).toContain('Hello Chips.');
    expect(view.body).toContain('chips.basecard.richtext');
    expect(view.contentFiles).toEqual(['details.yaml', 'intro.yaml']);
  }, 30_000);

  it('can run consistency verification during card render', async () => {
    const cardFile = await createCardArchive();
    const themeContext = await loadThemeRenderContext();
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
      verifyConsistency: true,
      ...themeContext
    });

    expect(view.target).toBe('offscreen-render');
    expect(view.consistency?.consistent).toBe(true);
    expect(view.body).toContain('data-target="offscreen-render"');
  }, 30_000);

  it('emits composite node selection bridge only in preview mode', async () => {
    const cardDir = await createCardDirectory();
    const themeContext = await loadThemeRenderContext();
    const workspace = await createTempDir('chips-card-runtime-');
    const runtime = new PluginRuntime(workspace, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-theme'
    });
    await runtime.load();
    const install = await runtime.install(path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP'));
    await runtime.enable(install.manifest.id);
    const service = new CardService({ runtime, workspaceRoot: process.cwd() });

    const previewView = await service.render(cardDir, {
      target: 'card-iframe',
      mode: 'preview',
      ...themeContext
    });
    const viewOnly = await service.render(cardDir, {
      target: 'card-iframe',
      mode: 'view',
      ...themeContext
    });

    expect(previewView.body).toContain('data-mode="preview"');
    expect(previewView.body).toContain('chips.basecard:select');
    expect(previewView.body).toContain('chips.composite:node-select');
    expect(viewOnly.body).toContain('data-mode="view"');
    expect(viewOnly.body).toContain('chips.basecard:select');
    expect(viewOnly.body).toContain('const isPreviewMode = document.body.dataset.mode === "preview";');
  }, 30_000);

  it('renders unpacked .card directories through the same unified rendering engine', async () => {
    const cardDir = await createCardDirectory();
    const themeContext = await loadThemeRenderContext();
    const workspace = await createTempDir('chips-card-runtime-');
    const runtime = new PluginRuntime(workspace, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-theme'
    });
    await runtime.load();
    const install = await runtime.install(path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP'));
    await runtime.enable(install.manifest.id);
    const service = new CardService({ runtime, workspaceRoot: process.cwd() });

    const view = await service.render(cardDir, {
      target: 'card-iframe',
      ...themeContext
    });

    expect(view.title).toBe('Test Card');
    expect(view.body).toContain('data-target="card-iframe"');
    expect(view.body).toContain('Second node body.');
    expect(view.contentFiles).toEqual(['details.yaml', 'intro.yaml']);
  }, 30_000);

  it('renders formal base card editor documents through the Host card.renderEditor route', async () => {
    const themeContext = await loadThemeRenderContext();
    const workspace = await createTempDir('chips-card-runtime-');
    const runtime = new PluginRuntime(workspace, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-theme'
    });
    await runtime.load();
    const install = await runtime.install(path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP'));
    await runtime.enable(install.manifest.id);
    const service = new CardService({ runtime, workspaceRoot: process.cwd() });

    const view = await service.renderEditor({
      cardType: 'RichTextCard',
      baseCardId: 'intro',
      initialConfig: {
        id: 'intro',
        title: 'Editor Title',
        body: '<p>Editor Body</p>',
        locale: 'zh-CN'
      },
      ...themeContext
    });

    expect(view.cardType).toBe('RichTextCard');
    expect(view.pluginId).toBe('chips.basecard.richtext');
    expect(view.baseCardId).toBe('intro');
    expect(view.body).toContain('data-base-card-id="intro"');
    expect(view.body).toContain('renderBasecardEditor');
    expect(view.body).toContain('chips.card-editor:change');
  }, 30_000);

  it('preserves dark theme color-scheme from theme package css', async () => {
    const cardFile = await createCardArchive();
    const themeContext = await loadThemeRenderContext(
      '../ThemePack/Chips-theme-default-dark',
      'chips-official.default-dark-theme'
    );
    const workspace = await createTempDir('chips-card-runtime-');
    const runtime = new PluginRuntime(workspace, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-dark-theme'
    });
    await runtime.load();
    const install = await runtime.install(path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP'));
    await runtime.enable(install.manifest.id);
    const service = new CardService({ runtime, workspaceRoot: process.cwd() });

    const view = await service.render(cardFile, {
      target: 'card-iframe',
      ...themeContext
    });

    expect(view.body).toContain('color-scheme: dark;');
    expect(view.body).not.toContain('color-scheme: light;');
  }, 30_000);

  it('does not escalate mixed node success and failure into a composite fatal error', async () => {
    const cardDir = await createPartiallyBrokenCardDirectory();
    const themeContext = await loadThemeRenderContext();
    const workspace = await createTempDir('chips-card-runtime-');
    const runtime = new PluginRuntime(workspace, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-theme',
    });
    await runtime.load();
    const install = await runtime.install(path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP'));
    await runtime.enable(install.manifest.id);
    const service = new CardService({ runtime, workspaceRoot: process.cwd() });

    const view = await service.render(cardDir, {
      target: 'card-iframe',
      mode: 'preview',
      ...themeContext,
    });

    const postedMessages: Array<{ type?: string; payload?: unknown }> = [];
    const dom = new JSDOM(view.body, {
      runScripts: 'dangerously',
      beforeParse(window: JsdomWindowLike) {
        Object.defineProperty(window, 'parent', {
          configurable: true,
          value: {
            postMessage(message: { type?: string; payload?: unknown }) {
              postedMessages.push(message);
            },
          },
        });
      },
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(postedMessages.some((message) => message.type === 'chips.composite:node-error')).toBe(true);
      expect(postedMessages.some((message) => message.type === 'chips.composite:fatal-error')).toBe(false);
    } finally {
      dom.window.close();
    }
  }, 30_000);

  it('emits composite resize messages when the composite layout height changes', async () => {
    const cardDir = await createCardDirectory();
    const themeContext = await loadThemeRenderContext();
    const workspace = await createTempDir('chips-card-runtime-');
    const runtime = new PluginRuntime(workspace, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-theme',
    });
    await runtime.load();
    const install = await runtime.install(path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP'));
    await runtime.enable(install.manifest.id);
    const service = new CardService({ runtime, workspaceRoot: process.cwd() });

    const view = await service.render(cardDir, {
      target: 'card-iframe',
      mode: 'preview',
      ...themeContext,
    });

    const postedMessages: Array<{ type?: string; payload?: unknown }> = [];
    const dom = new JSDOM(view.body, {
      runScripts: 'dangerously',
      beforeParse(window: JsdomWindowLike) {
        Object.defineProperty(window, 'parent', {
          configurable: true,
          value: {
            postMessage(message: { type?: string; payload?: unknown }) {
              postedMessages.push(message);
            },
          },
        });
      },
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 5));

      const initialResize = postedMessages.find((message) => message.type === 'chips.composite:resize');
      expect(initialResize).toBeTruthy();
      expect(initialResize?.payload).toMatchObject({
        nodeCount: 2,
        reason: 'initial',
      });

      postedMessages.length = 0;

      const dispatchMessage = dom.window.dispatchEvent;
      if (!dispatchMessage) {
        throw new Error('JSDOM window does not expose dispatchEvent.');
      }

      dispatchMessage.call(
        dom.window,
        new dom.window.MessageEvent('message', {
          data: {
            type: 'chips.basecard:height',
            payload: {
              nodeId: 'intro',
              height: 512,
            },
          },
          origin: 'null',
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 5));

      const introFrame = dom.window.document?.querySelector?.(
        '.chips-composite__frame[data-node-id="intro"]',
      );
      expect(introFrame?.style?.height).toBe('512px');

      const resizeMessage = postedMessages.find((message) => message.type === 'chips.composite:resize');
      expect(resizeMessage?.payload).toMatchObject({
        nodeCount: 2,
        reason: 'node-height',
      });
      expect((resizeMessage?.payload as { height: number }).height).toBeGreaterThanOrEqual(240);
    } finally {
      dom.window.close();
    }
  }, 30_000);

  it('renders card content written by yaml.stringify without parse failures', async () => {
    const cardDir = await createYamlStringifiedCardDirectory();
    const themeContext = await loadThemeRenderContext();
    const workspace = await createTempDir('chips-card-runtime-');
    const runtime = new PluginRuntime(workspace, {
      locale: 'zh-CN',
      themeId: 'chips-official.default-theme',
    });
    await runtime.load();
    const install = await runtime.install(path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP'));
    await runtime.enable(install.manifest.id);
    const service = new CardService({ runtime, workspaceRoot: process.cwd() });

    const view = await service.render(cardDir, {
      target: 'card-iframe',
      mode: 'preview',
      ...themeContext,
    });

    expect(view.title).toBe('YAML Stringified Card');
    expect(view.body).toContain('1111');
    expect(view.body).toContain('font-weight: normal');
  }, 30_000);
});

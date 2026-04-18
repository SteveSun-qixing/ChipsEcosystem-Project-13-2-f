import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HostApplication } from '../../src/main/core/host-application';
import { openAssociatedFile } from '../../src/main/core/file-association';
import { StoreZipService } from '../../packages/zip-service/src';
import { RuntimeClient } from '../../src/renderer/runtime-client';
import { PluginRuntime } from '../../src/runtime';

let workspace: string;
let app: HostApplication;
let runtime: RuntimeClient;

const ELECTRON_MOCK_KEY = '__chipsElectronMock';
const TIFF_SAMPLE_BASE64 =
  'SUkqAAgAAAAKAAABBAABAAAAAgAAAAEBBAABAAAAAgAAAAIBAwADAAAAhgAAAAMBAwABAAAAAQAAAAYBAwABAAAAAgAAABEBBAABAAAAjAAAABUBAwABAAAAAwAAABYBBAABAAAAAgAAABcBBAABAAAADAAAABwBAwABAAAAAQAAAAAAAAAIAAgACAD/AAD/AAD/AAD/AAA=';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-host-it-'));
  const bootstrapRuntime = new PluginRuntime(workspace, {
    locale: 'zh-CN',
    themeId: 'chips-official.default-theme'
  });
  await bootstrapRuntime.load();
  const defaultTheme = await bootstrapRuntime.install(path.resolve(process.cwd(), '../ThemePack/Chips-default/manifest.yaml'));
  await bootstrapRuntime.enable(defaultTheme.manifest.id);
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
  delete (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY];
  await app.stop();
  await fs.rm(workspace, { recursive: true, force: true });
});

describe('Host services integration', () => {
  it('reads and writes configuration through routes', async () => {
    await runtime.invoke('config.set', { key: 'ui.language', value: 'zh-CN' });
    const result = await runtime.invoke<{ value: string }>('config.get', { key: 'ui.language' });
    expect(result.value).toBe('zh-CN');
  });

  it('resolves layered config precedence by scope', async () => {
    await runtime.invoke('config.set', { key: 'chips.layer.key', value: 'system', scope: 'system' });
    await runtime.invoke('config.set', { key: 'chips.layer.key', value: 'workspace', scope: 'workspace' });
    const workspaceValue = await runtime.invoke<{ value: string }>('config.get', { key: 'chips.layer.key' });
    expect(workspaceValue.value).toBe('workspace');

    await runtime.invoke('config.set', { key: 'chips.layer.key', value: 'user', scope: 'user' });
    const userValue = await runtime.invoke<{ value: string }>('config.get', { key: 'chips.layer.key' });
    expect(userValue.value).toBe('user');

    await runtime.invoke('config.reset', { key: 'chips.layer.key', scope: 'user' });
    const fallbackWorkspace = await runtime.invoke<{ value: string }>('config.get', { key: 'chips.layer.key' });
    expect(fallbackWorkspace.value).toBe('workspace');

    await runtime.invoke('config.reset', { key: 'chips.layer.key', scope: 'workspace' });
    const fallbackSystem = await runtime.invoke<{ value: string }>('config.get', { key: 'chips.layer.key' });
    expect(fallbackSystem.value).toBe('system');
  });

  it('lists and applies themes', async () => {
    const list = await runtime.invoke<{ themes: Array<{ id: string }> }>('theme.list', {});
    expect(list.themes.length).toBeGreaterThan(0);

    await runtime.invoke('theme.apply', { id: list.themes[0]!.id });
    const current = await runtime.invoke<{ themeId: string }>('theme.getCurrent', {});
    expect(current.themeId).toBe(list.themes[0]!.id);
  });

  it('only exposes enabled themes to theme service', async () => {
    const darkInstall = await runtime.invoke<{ pluginId: string }>('plugin.install', {
      manifestPath: path.resolve(process.cwd(), '../ThemePack/Chips-theme-default-dark/manifest.yaml')
    });

    const beforeEnable = await runtime.invoke<{ themes: Array<{ id: string }> }>('theme.list', {});
    expect(beforeEnable.themes.some((theme) => theme.id === 'chips-official.default-dark-theme')).toBe(false);

    await runtime.invoke('plugin.enable', { pluginId: darkInstall.pluginId });
    const afterEnable = await runtime.invoke<{ themes: Array<{ id: string }> }>('theme.list', {});
    expect(afterEnable.themes.some((theme) => theme.id === 'chips-official.default-dark-theme')).toBe(true);
  });

  it('resolves theme token chain and enforces max depth', async () => {
    const resolved = await runtime.invoke<{
      resolved: Array<{ id: string; displayName: string; order: number }>;
      tokens: Record<string, unknown>;
    }>('theme.resolve', {
      chain: ['chips-official.default-theme']
    });
    expect(resolved.resolved.length).toBeGreaterThan(0);
    expect(resolved.resolved[0]?.id).toBe('chips-official.default-theme');
    expect(resolved.resolved[0]?.order).toBe(0);
    expect(Object.keys(resolved.tokens).length).toBeGreaterThan(0);

    await expect(
      runtime.invoke('theme.resolve', {
        chain: ['a', 'b', 'c', 'd', 'e', 'f', 'g']
      })
    ).rejects.toMatchObject({ code: 'THEME_CHAIN_TOO_DEEP' });
  });

  it('supports i18n translation and locale switching', async () => {
    await runtime.invoke('i18n.setCurrent', { locale: 'en-US' });
    const translated = await runtime.invoke<{ text: string }>('i18n.translate', { key: 'system.ready' });
    expect(translated.text).toBe('System ready');
  });

  it('lists enabled box layout plugins through the box service chain', async () => {
    const install = await runtime.invoke<{ pluginId: string }>('plugin.install', {
      manifestPath: path.resolve(process.cwd(), '../Chips-BoxLayoutPlugin/manifest.yaml')
    });
    await runtime.invoke('plugin.enable', { pluginId: install.pluginId });

    const listed = await runtime.invoke<{
      descriptors: Array<{
        pluginId: string;
        layoutType: string;
        displayName: string;
      }>;
    }>('box.listLayoutDescriptors', {});

    expect(listed.descriptors).toContainEqual(expect.objectContaining({
      pluginId: 'chips.layout.grid',
      layoutType: 'chips.layout.grid',
      displayName: '网格布局插件'
    }));

    const descriptor = await runtime.invoke<{
      descriptor: {
        pluginId: string;
        layoutType: string;
        displayName: string;
      };
    }>('box.readLayoutDescriptor', {
      layoutType: 'chips.layout.grid'
    });

    expect(descriptor.descriptor).toMatchObject({
      pluginId: 'chips.layout.grid',
      layoutType: 'chips.layout.grid',
      displayName: '网格布局插件'
    });
  });

  it('returns structured file entries from file.list', async () => {
    const cardsDir = path.join(workspace, 'cards');
    const cardPath = path.join(cardsDir, 'demo.card');
    await fs.mkdir(cardsDir, { recursive: true });
    await fs.writeFile(cardPath, 'demo', 'utf-8');

    const rootListed = await runtime.invoke<{
      entries: Array<{ path: string; isFile: boolean; isDirectory: boolean }>;
    }>('file.list', { dir: workspace });
    const nestedListed = await runtime.invoke<{
      entries: Array<{ path: string; isFile: boolean; isDirectory: boolean }>;
    }>('file.list', { dir: cardsDir });

    expect(rootListed.entries).toContainEqual(
      expect.objectContaining({
        path: cardsDir,
        isDirectory: true,
        isFile: false
      })
    );
    expect(nestedListed.entries).toContainEqual(
      expect.objectContaining({
        path: cardPath,
        isFile: true,
        isDirectory: false
      })
    );
  });

  it('resolves local resource paths as encoded file urls', async () => {
    const imageDir = path.join(workspace, '资源目录');
    const imageFile = path.join(imageDir, '图 片.png');
    await fs.mkdir(imageDir, { recursive: true });
    await fs.writeFile(imageFile, 'png', 'utf-8');

    const resolved = await runtime.invoke<{ uri: string }>('resource.resolve', {
      resourceId: imageFile
    });

    expect(resolved.uri.startsWith('file://')).toBe(true);
    expect(resolved.uri).toContain('%20');
    expect(fileURLToPath(resolved.uri)).toBe(imageFile);
  });

  it.runIf(process.platform === 'darwin')('converts TIFF resources to PNG files through the resource service', async () => {
    const imageDir = path.join(workspace, 'resource-image');
    const tiffFile = path.join(imageDir, 'cover.tiff');
    const pngFile = path.join(imageDir, 'cover.png');
    await fs.mkdir(imageDir, { recursive: true });
    await fs.writeFile(tiffFile, Buffer.from(TIFF_SAMPLE_BASE64, 'base64'));

    const converted = await runtime.invoke<{
      outputFile: string;
      mimeType: 'image/png';
      sourceMimeType: 'image/tiff';
      width?: number;
      height?: number;
    }>('resource.convertTiffToPng', {
      resourceId: tiffFile,
      outputFile: pngFile,
      overwrite: true
    });

    const outputBuffer = await fs.readFile(pngFile);
    expect(converted).toEqual({
      outputFile: pngFile,
      mimeType: 'image/png',
      sourceMimeType: 'image/tiff',
      width: 2,
      height: 2
    });
    expect(outputBuffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)).toBe(true);
  });

  it('renders card through unified rendering target options', async () => {
    const install = await runtime.invoke<{ pluginId: string }>('plugin.install', {
      manifestPath: path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP/manifest.yaml')
    });
    await runtime.invoke('plugin.enable', { pluginId: install.pluginId });

    const source = path.join(workspace, 'render-card-source');
    await fs.mkdir(path.join(source, '.card'), { recursive: true });
    await fs.mkdir(path.join(source, 'content'), { recursive: true });
    await fs.writeFile(path.join(source, '.card/metadata.yaml'), 'card_id: card.render.demo\nname: Render Demo\n', 'utf-8');
    await fs.writeFile(
      path.join(source, '.card/structure.yaml'),
      'structure:\n  - id: "intro"\n    type: "RichTextCard"\n',
      'utf-8'
    );
    await fs.writeFile(path.join(source, '.card/cover.html'), '<h1>cover</h1>', 'utf-8');
    await fs.writeFile(
      path.join(source, 'content/intro.yaml'),
      'card_type: "RichTextCard"\ncontent_format: "markdown"\ncontent_source: "inline"\ncontent_text: |\n  # Render Intro\n\n  Rendered through host service.\n',
      'utf-8'
    );

    const cardFile = path.join(workspace, 'render-demo.card');
    const zip = new StoreZipService();
    await zip.compress(source, cardFile);

    const rendered = await runtime.invoke<{
      view: {
        target: string;
        body: string;
        documentUrl: string;
        sessionId: string;
        semanticHash: string;
        consistency?: { consistent: boolean };
      };
    }>('card.render', {
      cardFile,
      options: {
        target: 'offscreen-render',
        verifyConsistency: true
      }
    });

    expect(rendered.view.target).toBe('offscreen-render');
    expect(rendered.view.body).toContain('data-target="offscreen-render"');
    expect(rendered.view.documentUrl.startsWith('file://')).toBe(true);
    expect(rendered.view.sessionId).toMatch(/^card-render-/);
    const indexPath = fileURLToPath(rendered.view.documentUrl);
    const sessionRoot = path.dirname(indexPath);
    const frameSrc = rendered.view.body.match(/data-node-id="intro"[^>]*src="([^"]+)"/)?.[1];
    expect(frameSrc).toBeTruthy();
    const persistedCompositeHtml = await fs.readFile(indexPath, 'utf-8');
    const introNodeHtml = await fs.readFile(path.resolve(sessionRoot, frameSrc ?? ''), 'utf-8');

    expect(persistedCompositeHtml).toBe(rendered.view.body);
    expect(introNodeHtml).toContain('Render Intro');
    expect(introNodeHtml).toContain('Rendered through host service.');
    expect(rendered.view.semanticHash.length).toBeGreaterThan(10);
    expect(rendered.view.consistency?.consistent).toBe(true);

    await expect(
      runtime.invoke<{ path: string }>('card.resolveDocumentPath', { documentUrl: rendered.view.documentUrl }),
    ).resolves.toEqual({ path: indexPath });

    await expect(runtime.invoke('card.releaseRenderSession', { sessionId: rendered.view.sessionId })).resolves.toBeDefined();
  }, 30_000);

  it('rejects invalid card.render options target by schema', async () => {
    await expect(
      runtime.invoke('card.render', {
        cardFile: '/tmp/invalid.card',
        options: {
          target: 'invalid-target'
        }
      })
    ).rejects.toMatchObject({ code: 'SCHEMA_VALIDATION_FAILED' });
  });

  it('supports card.render theme and locale overrides', async () => {
    const richTextInstall = await runtime.invoke<{ pluginId: string }>('plugin.install', {
      manifestPath: path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP/manifest.yaml')
    });
    await runtime.invoke('plugin.enable', { pluginId: richTextInstall.pluginId });

    const darkThemeInstall = await runtime.invoke<{ pluginId: string }>('plugin.install', {
      manifestPath: path.resolve(process.cwd(), '../ThemePack/Chips-theme-default-dark/manifest.yaml')
    });
    await runtime.invoke('plugin.enable', { pluginId: darkThemeInstall.pluginId });

    const source = path.join(workspace, 'render-override-source');
    await fs.mkdir(path.join(source, '.card'), { recursive: true });
    await fs.mkdir(path.join(source, 'content'), { recursive: true });
    await fs.writeFile(path.join(source, '.card/metadata.yaml'), 'card_id: card.render.override\nname: Override Demo\n', 'utf-8');
    await fs.writeFile(
      path.join(source, '.card/structure.yaml'),
      'structure:\n  - id: "intro"\n    type: "RichTextCard"\n',
      'utf-8'
    );
    await fs.writeFile(path.join(source, '.card/cover.html'), '<h1>cover</h1>', 'utf-8');
    await fs.writeFile(
      path.join(source, 'content/intro.yaml'),
      'card_type: "RichTextCard"\ncontent_format: "markdown"\ncontent_source: "inline"\ncontent_text: |\n  override test\n',
      'utf-8'
    );

    const cardFile = path.join(workspace, 'render-override.card');
    const zip = new StoreZipService();
    await zip.compress(source, cardFile);

    const baseline = await runtime.invoke<{ view: { semanticHash: string } }>('card.render', {
      cardFile
    });
    const overridden = await runtime.invoke<{ view: { body: string; semanticHash: string } }>('card.render', {
      cardFile,
      options: {
        themeId: 'chips-official.default-dark-theme',
        locale: 'en-US'
      }
    });

    expect(overridden.view.body).toContain('<html lang="en-US">');
    expect(overridden.view.semanticHash).not.toBe(baseline.view.semanticHash);
  }, 30_000);

  it('exports local html to pdf through formal platform action', async () => {
    const outputFile = path.join(workspace, 'exported.pdf');
    const htmlDir = path.join(workspace, 'html-export-pdf');
    const executedScripts: string[] = [];
    await fs.mkdir(htmlDir, { recursive: true });
    await fs.writeFile(path.join(htmlDir, 'index.html'), '<!doctype html><html><body><h1>PDF</h1></body></html>', 'utf-8');

    class MockBrowserWindow {
      public webContents = {
        executeJavaScript: async (code: string) => {
          executedScripts.push(code);
          return true;
        },
        printToPDF: async () => Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Page >>\nendobj\n%%EOF', 'latin1'),
        capturePage: async () => {
          throw new Error('not used');
        },
        send: () => undefined,
        id: 1
      };

      public constructor(_options: Record<string, unknown>) {}
      public focus(): void {}
      public setSize(_width: number, _height: number): void {}
      public getBounds(): { width: number; height: number } {
        return { width: 1280, height: 960 };
      }
      public setTitle(_title: string): void {}
      public isFocused(): boolean { return false; }
      public isMinimized(): boolean { return false; }
      public isMaximized(): boolean { return false; }
      public isFullScreen(): boolean { return false; }
      public minimize(): void {}
      public maximize(): void {}
      public setFullScreen(_flag: boolean): void {}
      public restore(): void {}
      public close(): void {}
      public isDestroyed(): boolean { return false; }
      public on(_event: 'closed', _listener: () => void): void {}
      public async loadURL(_url: string): Promise<void> {}
      public async loadFile(_filePath: string): Promise<void> {}
    }

    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      BrowserWindow: MockBrowserWindow
    };

    const result = await runtime.invoke<{ outputFile: string; pageCount?: number }>('platform.renderHtmlToPdf', {
      htmlDir,
      outputFile
    });

    const written = await fs.readFile(outputFile);
    expect(result.outputFile).toBe(outputFile);
    expect(result.pageCount).toBe(1);
    expect(written.toString('latin1')).toContain('%PDF-1.7');
    expect(executedScripts.some((code) => code.includes('.chips-composite__frame'))).toBe(true);
    expect(executedScripts.some((code) => code.includes('frame.loading = "eager"'))).toBe(true);
    expect(executedScripts.some((code) => code.includes('chipsCompositeReady'))).toBe(true);
    expect(executedScripts.some((code) => code.includes('frame.dataset.renderReady === "true"'))).toBe(true);
  });

  it('exports local html to image through formal platform action', async () => {
    const outputFile = path.join(workspace, 'exported.png');
    const htmlDir = path.join(workspace, 'html-export-image');
    await fs.mkdir(htmlDir, { recursive: true });
    await fs.writeFile(path.join(htmlDir, 'index.html'), '<!doctype html><html><body><h1>PNG</h1></body></html>', 'utf-8');

    class MockBrowserWindow {
      public webContents = {
        executeJavaScript: async <T,>() => ({ width: 640, height: 360 } as T),
        printToPDF: async () => Buffer.alloc(0),
        capturePage: async () => ({
          toPNG: () => Buffer.from('png-binary'),
          toJPEG: () => Buffer.from('jpeg-binary'),
          getSize: () => ({ width: 640, height: 360 })
        }),
        send: () => undefined,
        id: 1
      };

      public constructor(_options: Record<string, unknown>) {}
      public focus(): void {}
      public setSize(_width: number, _height: number): void {}
      public getBounds(): { width: number; height: number } {
        return { width: 1280, height: 960 };
      }
      public setTitle(_title: string): void {}
      public isFocused(): boolean { return false; }
      public isMinimized(): boolean { return false; }
      public isMaximized(): boolean { return false; }
      public isFullScreen(): boolean { return false; }
      public minimize(): void {}
      public maximize(): void {}
      public setFullScreen(_flag: boolean): void {}
      public restore(): void {}
      public close(): void {}
      public isDestroyed(): boolean { return false; }
      public on(_event: 'closed', _listener: () => void): void {}
      public async loadURL(_url: string): Promise<void> {}
      public async loadFile(_filePath: string): Promise<void> {}
    }

    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      BrowserWindow: MockBrowserWindow
    };

    const result = await runtime.invoke<{ outputFile: string; width?: number; height?: number; format: string }>(
      'platform.renderHtmlToImage',
      {
        htmlDir,
        outputFile,
        options: {
          format: 'png',
          background: 'theme'
        }
      }
    );

    const written = await fs.readFile(outputFile, 'utf-8');
    expect(result.outputFile).toBe(outputFile);
    expect(result.format).toBe('png');
    expect(result.width).toBe(640);
    expect(result.height).toBe(360);
    expect(written).toBe('png-binary');
  });

  it('re-waits and re-measures image export after resizing the capture viewport', async () => {
    const outputFile = path.join(workspace, 'exported-resized.png');
    const htmlDir = path.join(workspace, 'html-export-image-resized');
    await fs.mkdir(htmlDir, { recursive: true });
    await fs.writeFile(path.join(htmlDir, 'index.html'), '<!doctype html><html><body><h1>PNG</h1></body></html>', 'utf-8');

    const setSizeCalls: Array<{ width: number; height: number }> = [];
    const captureRects: Array<{ x: number; y: number; width: number; height: number }> = [];
    let measureCall = 0;

    class MockBrowserWindow {
      public webContents = {
        executeJavaScript: async <T,>(code: string) => {
          if (code.includes('chipsCompositeReady')) {
            return true as T;
          }
          measureCall += 1;
          if (measureCall === 1) {
            return { width: 640, height: 320 } as T;
          }
          return { width: 640, height: 960 } as T;
        },
        printToPDF: async () => Buffer.alloc(0),
        capturePage: async (rect?: { x: number; y: number; width: number; height: number }) => {
          if (rect) {
            captureRects.push(rect);
          }
          return {
            toPNG: () => Buffer.from('png-resized'),
            toJPEG: () => Buffer.from('jpeg-resized'),
            getSize: () => ({ width: rect?.width ?? 0, height: rect?.height ?? 0 })
          };
        },
        send: () => undefined,
        id: 1
      };

      public constructor(_options: Record<string, unknown>) {}
      public focus(): void {}
      public setSize(width: number, height: number): void {
        setSizeCalls.push({ width, height });
      }
      public getBounds(): { width: number; height: number } {
        return { width: 1280, height: 960 };
      }
      public setTitle(_title: string): void {}
      public isFocused(): boolean { return false; }
      public isMinimized(): boolean { return false; }
      public isMaximized(): boolean { return false; }
      public isFullScreen(): boolean { return false; }
      public minimize(): void {}
      public maximize(): void {}
      public setFullScreen(_flag: boolean): void {}
      public restore(): void {}
      public close(): void {}
      public isDestroyed(): boolean { return false; }
      public on(_event: 'closed', _listener: () => void): void {}
      public async loadURL(_url: string): Promise<void> {}
      public async loadFile(_filePath: string): Promise<void> {}
    }

    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      BrowserWindow: MockBrowserWindow
    };

    const result = await runtime.invoke<{ outputFile: string; width?: number; height?: number; format: string }>(
      'platform.renderHtmlToImage',
      {
        htmlDir,
        outputFile,
        options: {
          format: 'png',
        }
      }
    );

    expect(result.outputFile).toBe(outputFile);
    expect(result.width).toBe(640);
    expect(result.height).toBe(960);
    expect(setSizeCalls).toEqual([
      { width: 640, height: 320 },
      { width: 640, height: 960 }
    ]);
    expect(captureRects).toEqual([
      { x: 0, y: 0, width: 640, height: 960 }
    ]);
    expect(await fs.readFile(outputFile, 'utf-8')).toBe('png-resized');
  });

  it('packs directory cards through card service routes and restores generated metadata on unpack', async () => {
    const source = path.join(workspace, 'pack-card-source');
    await fs.mkdir(path.join(source, '.card'), { recursive: true });
    await fs.mkdir(path.join(source, 'content'), { recursive: true });
    await fs.writeFile(
      path.join(source, '.card/metadata.yaml'),
      [
        'chip_standards_version: "1.0.0"',
        'card_id: "packcard01"',
        'name: "Packed Through Route"',
        'created_at: "2026-03-17T09:00:00.000Z"',
        'modified_at: "2026-03-17T09:00:00.000Z"'
      ].join('\n'),
      'utf-8'
    );
    await fs.writeFile(
      path.join(source, '.card/structure.yaml'),
      'structure:\n  - id: "intro"\n    type: "RichTextCard"\n',
      'utf-8'
    );
    await fs.writeFile(path.join(source, '.card/cover.html'), '<h1>cover</h1>', 'utf-8');
    await fs.writeFile(
      path.join(source, 'content/intro.yaml'),
      'card_type: "RichTextCard"\ncontent_format: "markdown"\ncontent_source: "inline"\ncontent_text: |\n  route pack\n',
      'utf-8'
    );

    const cardFile = path.join(workspace, 'route-packed.card');
    const packed = await runtime.invoke<{ cardFile: string }>('card.pack', {
      cardDir: source,
      outputPath: cardFile
    });
    expect(packed.cardFile).toBe(cardFile);

    const metadata = await runtime.invoke<{ metadata: Record<string, unknown> }>('card.readMetadata', {
      cardFile
    });
    expect(metadata.metadata.name).toBe('Packed Through Route');
    expect(metadata.metadata.file_info).toMatchObject({
      file_count: 4,
      total_size: expect.any(Number),
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
      generated_at: expect.any(String)
    });

    const unpackDir = path.join(workspace, 'route-packed-unpacked');
    const unpacked = await runtime.invoke<{ outputDir: string }>('card.unpack', {
      cardFile,
      outputDir: unpackDir
    });
    expect(unpacked.outputDir).toBe(unpackDir);

    const structure = yaml.parse(
      await fs.readFile(path.join(unpackDir, '.card/structure.yaml'), 'utf-8')
    ) as Record<string, unknown>;
    expect((structure.manifest as Record<string, unknown>).card_count).toBe(1);
  });

  it('creates window records via window service', async () => {
    const opened = await runtime.invoke<{ window: { id: string; chrome?: { backgroundColor?: string } } }>('window.open', {
      config: {
        title: 'Demo',
        width: 800,
        height: 600,
        chrome: {
          backgroundColor: '#ffffff'
        }
      }
    });
    expect(opened.window.id).toBeTypeOf('string');
    expect(opened.window.chrome?.backgroundColor).toBe('#ffffff');

    const focused = await runtime.invoke('window.focus', { windowId: opened.window.id });
    expect(focused).toMatchObject({ ack: true });
  });

  it('fills themed window background color when caller does not provide one', async () => {
    const opened = await runtime.invoke<{ window: { chrome?: { backgroundColor?: string } } }>('window.open', {
      config: {
        title: 'Theme Window',
        width: 640,
        height: 480
      }
    });

    expect(opened.window.chrome?.backgroundColor).toBeTypeOf('string');
    expect(opened.window.chrome?.backgroundColor?.length).toBeGreaterThan(0);
  });

  it('writes and queries logs', async () => {
    await runtime.invoke('log.write', { level: 'info', message: 'integration-log' });
    const result = await runtime.invoke<{ entries: Array<{ message: string }> }>('log.query', {});
    expect(result.entries.some((entry) => entry.message === 'integration-log')).toBe(true);
  });

  it('persists encrypted credentials across host restart', async () => {
    await runtime.invoke('credential.set', { ref: 'chips.api.token', value: 'secret-token' });
    const stored = await fs.readFile(path.join(workspace, 'credentials.enc.json'), 'utf-8');
    expect(stored.includes('secret-token')).toBe(false);

    await app.stop();
    app = new HostApplication({ workspacePath: workspace });
    await app.start();
    runtime = new RuntimeClient(app.createBridge(), {
      defaultTimeout: 5000,
      maxRetries: 1,
      retryDelay: 10,
      retryBackoff: 2,
      enableRetry: true
    });

    const restored = await runtime.invoke<{ value: string | null }>('credential.get', { ref: 'chips.api.token' });
    expect(restored.value).toBe('secret-token');
  });

  it('returns control-plane health report', async () => {
    const report = await runtime.invoke<{ status: string; report: { routes: number; services: number } }>('control-plane.health', {});
    expect(report.status).toBe('ok');
    expect(report.report.services).toBe(19);
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

  it('loads, resolves and invokes module plugins through the formal module service', async () => {
    try {
      const moduleProjectDir = path.join(workspace, 'markdown-module');
      await fs.mkdir(path.join(moduleProjectDir, 'dist'), { recursive: true });
      await fs.mkdir(path.join(moduleProjectDir, 'contracts'), { recursive: true });
      await fs.writeFile(
        path.join(moduleProjectDir, 'manifest.yaml'),
        [
          'id: chips.module.markdown-renderer',
          'version: "1.0.0"',
          'type: module',
          'name: Markdown Renderer Module',
          'description: Shared markdown rendering module',
          'permissions:',
          '  - file.read',
          'entry: dist/index.cjs',
          'module:',
          '  apiVersion: 1',
          '  runtime: worker',
          '  activation: onDemand',
          '  provides:',
          '    - capability: text.markdown.render',
          '      version: "1.0.0"',
          '      methods:',
          '        - name: render',
          '          mode: sync',
          '          inputSchema: contracts/render.input.schema.json',
          '          outputSchema: contracts/render.output.schema.json',
          '        - name: inspectFile',
          '          mode: sync',
          '          inputSchema: contracts/inspectFile.input.schema.json',
          '          outputSchema: contracts/inspectFile.output.schema.json',
          '        - name: proxyModuleCall',
          '          mode: sync',
          '          inputSchema: contracts/proxyModuleCall.input.schema.json',
          '          outputSchema: contracts/proxyModuleCall.output.schema.json',
          '        - name: renderAsync',
          '          mode: job',
          '          inputSchema: contracts/renderAsync.input.schema.json',
          '          outputSchema: contracts/renderAsync.output.schema.json',
          '  consumes: []'
        ].join('\n'),
        'utf-8'
      );
      await fs.writeFile(
        path.join(moduleProjectDir, 'dist/index.cjs'),
        [
          'const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));',
          '',
          'module.exports = {',
          '  async activate(ctx) {',
          "    ctx.logger.info('module activated', { capability: 'text.markdown.render' });",
          '  },',
          '  providers: [',
          '    {',
          "      capability: 'text.markdown.render',",
          '      methods: {',
          '        async render(_ctx, input) {',
          '          return {',
          "            html: `<article>${input.markdown}</article>`,",
          "            provider: 'chips.module.markdown-renderer'",
          '          };',
          '        },',
          '        async inspectFile(ctx, input) {',
          "          const result = await ctx.host.invoke('file.stat', { path: input.path });",
          '          return {',
          '            isFile: result.meta?.isFile === true,',
          '            isDirectory: result.meta?.isDirectory === true',
          '          };',
          '        },',
          '        async proxyModuleCall(ctx) {',
          "          return await ctx.host.invoke('module.listProviders', {});",
          '        },',
          '        async renderAsync(ctx, input) {',
          "          await ctx.job?.reportProgress({ stage: 'started', percent: 10 });",
          '          await sleep(typeof input.delayMs === "number" ? input.delayMs : 30);',
          "          await ctx.job?.reportProgress({ stage: 'completed', percent: 100 });",
          '          return {',
          '            ok: true,',
          "            html: `<article>${input.markdown}</article>`",
          '          };',
          '        }',
          '      }',
          '    }',
          '  ]',
          '};'
        ].join('\n'),
        'utf-8'
      );
      await fs.writeFile(
        path.join(moduleProjectDir, 'contracts/render.input.schema.json'),
        JSON.stringify(
          {
            type: 'object',
            required: ['markdown'],
            properties: {
              markdown: { type: 'string' }
            },
            additionalProperties: false
          },
          null,
          2
        ),
        'utf-8'
      );
      await fs.writeFile(
        path.join(moduleProjectDir, 'contracts/render.output.schema.json'),
        JSON.stringify(
          {
            type: 'object',
            required: ['html', 'provider'],
            properties: {
              html: { type: 'string' },
              provider: { type: 'string' }
            },
            additionalProperties: false
          },
          null,
          2
        ),
        'utf-8'
      );
      await fs.writeFile(
        path.join(moduleProjectDir, 'contracts/inspectFile.input.schema.json'),
        JSON.stringify(
          {
            type: 'object',
            required: ['path'],
            properties: {
              path: { type: 'string' }
            },
            additionalProperties: false
          },
          null,
          2
        ),
        'utf-8'
      );
      await fs.writeFile(
        path.join(moduleProjectDir, 'contracts/inspectFile.output.schema.json'),
        JSON.stringify(
          {
            type: 'object',
            required: ['isFile', 'isDirectory'],
            properties: {
              isFile: { type: 'boolean' },
              isDirectory: { type: 'boolean' }
            },
            additionalProperties: false
          },
          null,
          2
        ),
        'utf-8'
      );
      await fs.writeFile(
        path.join(moduleProjectDir, 'contracts/proxyModuleCall.input.schema.json'),
        JSON.stringify(
          {
            type: 'object',
            additionalProperties: false
          },
          null,
          2
        ),
        'utf-8'
      );
      await fs.writeFile(
        path.join(moduleProjectDir, 'contracts/proxyModuleCall.output.schema.json'),
        JSON.stringify(
          {
            type: 'object',
            additionalProperties: true
          },
          null,
          2
        ),
        'utf-8'
      );
      await fs.writeFile(
        path.join(moduleProjectDir, 'contracts/renderAsync.input.schema.json'),
        JSON.stringify(
          {
            type: 'object',
            required: ['markdown'],
            properties: {
              markdown: { type: 'string' },
              delayMs: { type: 'number' }
            },
            additionalProperties: false
          },
          null,
          2
        ),
        'utf-8'
      );
      await fs.writeFile(
        path.join(moduleProjectDir, 'contracts/renderAsync.output.schema.json'),
        JSON.stringify(
          {
            type: 'object',
            required: ['ok', 'html'],
            properties: {
              ok: { type: 'boolean' },
              html: { type: 'string' }
            },
            additionalProperties: false
          },
          null,
          2
        ),
        'utf-8'
      );

      const installed = await runtime.invoke<{ pluginId: string }>('plugin.install', {
        manifestPath: path.join(moduleProjectDir, 'manifest.yaml')
      });
      await runtime.invoke('plugin.enable', { pluginId: installed.pluginId });

      const listed = await runtime.invoke<{
        providers: Array<{
          pluginId: string;
          capability: string;
          version: string;
          status: string;
          methods: Array<{ name: string; mode: string }>;
        }>;
      }>('module.listProviders', {
        capability: 'text.markdown.render'
      });
      expect(listed.providers).toContainEqual(
        expect.objectContaining({
          pluginId: 'chips.module.markdown-renderer',
          capability: 'text.markdown.render',
          version: '1.0.0',
          status: 'enabled',
          methods: expect.arrayContaining([
            expect.objectContaining({ name: 'render', mode: 'sync' }),
            expect.objectContaining({ name: 'renderAsync', mode: 'job' })
          ])
        })
      );

      const resolved = await runtime.invoke<{
        provider: {
          pluginId: string;
          capability: string;
          version: string;
        };
      }>('module.resolve', {
        capability: 'text.markdown.render',
        versionRange: '^1.0.0'
      });
      expect(resolved.provider).toMatchObject({
        pluginId: 'chips.module.markdown-renderer',
        capability: 'text.markdown.render',
        version: '1.0.0'
      });

      const syncResult = await runtime.invoke<{
        mode: 'sync';
        output: { html: string; provider: string };
      }>('module.invoke', {
        capability: 'text.markdown.render',
        method: 'render',
        input: {
          markdown: '# Hello Markdown'
        }
      });
      expect(syncResult.mode).toBe('sync');
      expect(syncResult.output).toMatchObject({
        html: '<article># Hello Markdown</article>',
        provider: 'chips.module.markdown-renderer'
      });

      const inspected = await runtime.invoke<{
        mode: 'sync';
        output: {
          isFile: boolean;
          isDirectory: boolean;
        };
      }>('module.invoke', {
        capability: 'text.markdown.render',
        method: 'inspectFile',
        input: {
          path: path.join(moduleProjectDir, 'manifest.yaml')
        }
      });
      expect(inspected.mode).toBe('sync');
      expect(inspected.output).toMatchObject({
        isFile: true,
        isDirectory: false
      });

      await expect(
        runtime.invoke('module.invoke', {
          capability: 'text.markdown.render',
          method: 'proxyModuleCall',
          input: {}
        })
      ).rejects.toMatchObject({
        code: 'MODULE_HOST_ACTION_FORBIDDEN'
      });

      const started = await runtime.invoke<{ mode: 'job'; jobId: string }>('module.invoke', {
        capability: 'text.markdown.render',
        method: 'renderAsync',
        input: {
          markdown: '## Async Markdown',
          delayMs: 10
        }
      });
      expect(started.mode).toBe('job');
      expect(typeof started.jobId).toBe('string');

      let completedJob:
        | {
            job: {
              status: string;
              output?: { ok: boolean; html: string };
              progress?: { stage?: string; percent?: number };
            };
          }
        | undefined;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const snapshot = await runtime.invoke<{
          job: {
            status: string;
            output?: { ok: boolean; html: string };
            progress?: { stage?: string; percent?: number };
          };
        }>('module.job.get', { jobId: started.jobId });
        if (snapshot.job.status === 'completed') {
          completedJob = snapshot;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      expect(completedJob?.job.status).toBe('completed');
      expect(completedJob?.job.output).toMatchObject({
        ok: true,
        html: '<article>## Async Markdown</article>'
      });
      expect(completedJob?.job.progress?.percent).toBe(100);
    } catch (error) {
      throw error;
    }
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

    const queried = await runtime.invoke<{
      plugins: Array<{ id: string; manifestPath: string; name: string; version: string; enabled: boolean }>;
    }>('plugin.query', {});
    expect(queried.plugins).toContainEqual(
      expect.objectContaining({
        id: 'chips.runtime.cpk',
        name: 'Runtime CPK Plugin',
        version: '1.0.0',
        enabled: false
      })
    );
  });

  it('exposes plugin governance metadata through list/get/query', async () => {
    const darkInstall = await runtime.invoke<{ pluginId: string }>('plugin.install', {
      manifestPath: path.resolve(process.cwd(), '../ThemePack/Chips-theme-default-dark/manifest.yaml')
    });

    const listed = await runtime.invoke<{
      plugins: Array<{
        id: string;
        name: string;
        version: string;
        type: string;
        theme?: {
          themeId: string;
          displayName: string;
          isDefault: boolean;
        };
      }>;
    }>('plugin.list', { type: 'theme' });
    expect(listed.plugins).toContainEqual(
      expect.objectContaining({
        id: darkInstall.pluginId,
        name: '薯片官方 · 暗夜主题',
        version: '1.0.0',
        type: 'theme',
        theme: expect.objectContaining({
          themeId: 'chips-official.default-dark-theme',
          displayName: '薯片官方 · 暗夜主题',
          isDefault: false
        })
      })
    );

    const queried = await runtime.invoke<{
      plugins: Array<{
        id: string;
        enabled: boolean;
        theme?: {
          themeId: string;
          displayName: string;
        };
      }>;
    }>('plugin.query', { type: 'theme' });
    expect(queried.plugins).toContainEqual(
      expect.objectContaining({
        id: darkInstall.pluginId,
        enabled: false,
        theme: expect.objectContaining({
          themeId: 'chips-official.default-dark-theme',
          displayName: '薯片官方 · 暗夜主题'
        })
      })
    );

    const fetched = await runtime.invoke<{
      plugin: {
        id: string;
        name: string;
        theme?: {
          themeId: string;
        };
      };
    }>('plugin.get', { pluginId: darkInstall.pluginId });
    expect(fetched.plugin).toMatchObject({
      id: darkInstall.pluginId,
      name: '薯片官方 · 暗夜主题',
      theme: {
        themeId: 'chips-official.default-dark-theme'
      }
    });
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
        'ui:',
        '  window:',
        '    chrome:',
        '      backgroundColor: "#ffffff"',
        '      titleBarStyle: hidden',
        '      titleBarOverlay:',
        '        color: "#ffffff00"',
        '        symbolColor: "#667085"',
        '        height: 44',
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

    const queried = await runtime.invoke<{
      plugins: Array<{
        id: string;
        ui?: {
          window?: {
            chrome?: {
              titleBarStyle?: string;
              backgroundColor?: string;
            };
          };
        };
      }>;
    }>('plugin.query', { type: 'app' });
    const handler = queried.plugins.find((plugin) => plugin.id === 'chips.card.handler');
    expect(handler?.ui?.window?.chrome?.backgroundColor).toBe('#ffffff');
    expect(handler?.ui?.window?.chrome?.titleBarStyle).toBe('hidden');
  });

  it('routes associated image files to enabled app plugins through generic file-handler capabilities', async () => {
    const pluginDir = path.join(workspace, 'image-handler-plugin');
    await fs.mkdir(path.join(pluginDir, 'dist'), { recursive: true });
    await fs.writeFile(
      path.join(pluginDir, 'manifest.yaml'),
      [
        'id: chips.image.handler',
        'version: "1.0.0"',
        'type: app',
        'name: Image Handler',
        'permissions:',
        '  - file.read',
        'entry: dist/index.html',
        'capabilities:',
        '  - file-handler:.png'
      ].join('\n'),
      'utf-8'
    );
    await fs.writeFile(path.join(pluginDir, 'dist/index.html'), '<html><body>image handler</body></html>', 'utf-8');

    const zip = new StoreZipService();
    const cpkPath = path.join(workspace, 'chips.image.handler.cpk');
    await zip.compress(pluginDir, cpkPath);
    const installed = await runtime.invoke<{ pluginId: string }>('plugin.install', { manifestPath: cpkPath });
    await runtime.invoke('plugin.enable', { pluginId: installed.pluginId });

    const imageFile = path.join(workspace, 'associated image.png');
    await fs.writeFile(imageFile, 'png', 'utf-8');

    const result = await openAssociatedFile(runtime, imageFile);
    expect(result.mode).toBe('plugin');
    expect(result.extension).toBe('.png');
    expect(result.pluginId).toBe('chips.image.handler');
    expect(result.windowId).toBeTypeOf('string');
  });

  it('routes local resources to enabled app plugins through resource-handler capabilities', async () => {
    const pluginDir = path.join(workspace, 'resource-handler-plugin');
    await fs.mkdir(path.join(pluginDir, 'dist'), { recursive: true });
    await fs.writeFile(
      path.join(pluginDir, 'manifest.yaml'),
      [
        'id: chips.resource.image.viewer',
        'version: "1.0.0"',
        'type: app',
        'name: Resource Image Viewer',
        'permissions:',
        '  - resource.read',
        'entry: dist/index.html',
        'capabilities:',
        '  - resource-handler:view:image/*'
      ].join('\n'),
      'utf-8',
    );
    await fs.writeFile(path.join(pluginDir, 'dist/index.html'), '<html><body>resource handler</body></html>', 'utf-8');

    const zip = new StoreZipService();
    const cpkPath = path.join(workspace, 'chips.resource.image.viewer.cpk');
    await zip.compress(pluginDir, cpkPath);
    const installed = await runtime.invoke<{ pluginId: string }>('plugin.install', { manifestPath: cpkPath });
    await runtime.invoke('plugin.enable', { pluginId: installed.pluginId });

    const imageFile = path.join(workspace, 'nested', 'resource image.png');
    await fs.mkdir(path.dirname(imageFile), { recursive: true });
    await fs.writeFile(imageFile, 'png', 'utf-8');

    const result = await runtime.invoke<{
      result: {
        mode: string;
        pluginId?: string;
        windowId?: string;
        matchedCapability?: string;
        resolved: {
          filePath?: string;
          mimeType?: string;
        };
      };
    }>('resource.open', {
      resource: {
        resourceId: imageFile,
      },
    });

    expect(result.result.mode).toBe('plugin');
    expect(result.result.pluginId).toBe('chips.resource.image.viewer');
    expect(result.result.windowId).toBeTypeOf('string');
    expect(result.result.matchedCapability).toBe('resource-handler:view:image/*');
    expect(result.result.resolved.filePath).toBe(imageFile);
    expect(result.result.resolved.mimeType).toBe('image/png');
  });
});

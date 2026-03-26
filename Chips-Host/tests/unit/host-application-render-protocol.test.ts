import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostApplication } from '../../src/main/core/host-application';
import { RuntimeClient } from '../../src/renderer/runtime-client';
import { StoreZipService } from '../../packages/zip-service/src';
import { CHIPS_RENDER_DOCUMENT_SCHEME } from '../../src/main/electron/render-document-protocol';

const ELECTRON_MOCK_KEY = '__chipsElectronMock';

let workspace: string;

const createRenderCardArchive = async (): Promise<string> => {
  const source = path.join(workspace, 'render-protocol-card-source');
  await fs.mkdir(path.join(source, '.card'), { recursive: true });
  await fs.mkdir(path.join(source, 'content'), { recursive: true });
  await fs.writeFile(path.join(source, '.card/metadata.yaml'), 'card_id: host.protocol.demo\nname: Host Protocol Demo\n', 'utf-8');
  await fs.writeFile(
    path.join(source, '.card/structure.yaml'),
    'structure:\n  - id: "intro"\n    type: "RichTextCard"\n',
    'utf-8',
  );
  await fs.writeFile(path.join(source, '.card/cover.html'), '<h1>cover</h1>', 'utf-8');
  await fs.writeFile(
    path.join(source, 'content/intro.yaml'),
    'card_type: "RichTextCard"\ncontent_format: "markdown"\ncontent_source: "inline"\ncontent_text: |\n  render protocol\n',
    'utf-8',
  );

  const cardFile = path.join(workspace, 'render-protocol-demo.card');
  const zip = new StoreZipService();
  await zip.compress(source, cardFile);
  return cardFile;
};

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-host-render-protocol-'));
});

afterEach(async () => {
  delete (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY];
  await fs.rm(workspace, { recursive: true, force: true });
});

describe('HostApplication managed render protocol', () => {
  it('registers a protocol handler that resolves managed render session urls back to files', async () => {
    let protocolHandler:
      | ((request: { url: string }) => Promise<Response> | Response)
      | undefined;
    const fetchMock = vi.fn(async (url: string) => new Response(url));

    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      protocol: {
        handle: vi.fn((scheme: string, handler: (request: { url: string }) => Promise<Response> | Response) => {
          expect(scheme).toBe(CHIPS_RENDER_DOCUMENT_SCHEME);
          protocolHandler = handler;
        }),
      },
      net: {
        fetch: fetchMock,
      },
    };

    const bootstrapApp = new HostApplication({ workspacePath: workspace });
    await bootstrapApp.start();
    const bootstrapRuntime = new RuntimeClient(bootstrapApp.createBridge());

    try {
      const defaultTheme = await bootstrapRuntime.invoke<{ pluginId: string }>('plugin.install', {
        manifestPath: path.resolve(process.cwd(), '../ThemePack/Chips-default/manifest.yaml'),
      });
      await bootstrapRuntime.invoke('plugin.enable', { pluginId: defaultTheme.pluginId });
      const richtextPlugin = await bootstrapRuntime.invoke<{ pluginId: string }>('plugin.install', {
        manifestPath: path.resolve(process.cwd(), '../Chips-BaseCardPlugin/richtext-BCP/manifest.yaml'),
      });
      await bootstrapRuntime.invoke('plugin.enable', { pluginId: richtextPlugin.pluginId });

      const cardFile = await createRenderCardArchive();
      const rendered = await bootstrapRuntime.invoke<{
        view: {
          documentUrl: string;
          sessionId: string;
        };
      }>('card.render', {
        cardFile,
      });

      expect(protocolHandler).toBeTypeOf('function');
      expect(rendered.view.documentUrl.startsWith('chips-render://session/')).toBe(true);
      expect(rendered.view.sessionId).toMatch(/^card-render-/);

      const response = await protocolHandler?.({ url: rendered.view.documentUrl });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const resolvedFileUrl = response ? await response.text() : '';
      expect(resolvedFileUrl.startsWith('file://')).toBe(true);
      expect(resolvedFileUrl.endsWith('/index.html')).toBe(true);
    } finally {
      await bootstrapApp.stop();
    }
  }, 30_000);
});

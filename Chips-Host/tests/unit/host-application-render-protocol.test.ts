import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostApplication } from '../../src/main/core/host-application';
import { RuntimeClient } from '../../src/renderer/runtime-client';
import { StoreZipService } from '../../packages/zip-service/src';
import { CHIPS_RENDER_DOCUMENT_SCHEME } from '../../src/main/electron/render-document-protocol';

const ELECTRON_MOCK_KEY = '__chipsElectronMock';
const MANAGED_RESOURCE_FILE_NAME = '封面 图.png';
const MANAGED_RESOURCE_CONTENT = Buffer.from('cover-bytes', 'utf-8');

let workspace: string;

const unwrapBinaryRoutePayload = (value: Buffer | { type: 'Buffer'; data: number[] }): Buffer => {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  return Buffer.from(value.data);
};

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
  await fs.writeFile(path.join(source, '.card/cover.html'), `<img src="../${MANAGED_RESOURCE_FILE_NAME}" alt="cover" />`, 'utf-8');
  await fs.writeFile(path.join(source, MANAGED_RESOURCE_FILE_NAME), MANAGED_RESOURCE_CONTENT);
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

  it('resolves and reads managed card-root resources through resource routes', async () => {
    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      protocol: {
        handle: vi.fn(),
      },
      net: {
        fetch: vi.fn(async (url: string) => new Response(url)),
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

      const cardFile = await createRenderCardArchive();
      const coverView = await bootstrapRuntime.invoke<{
        view: {
          coverUrl: string;
        };
      }>('card.renderCover', {
        cardFile,
      });

      expect(coverView.view.coverUrl.startsWith('chips-render://card-root/')).toBe(true);

      const managedResourceId = new URL(`../${MANAGED_RESOURCE_FILE_NAME}`, coverView.view.coverUrl).toString();
      const resolved = await bootstrapRuntime.invoke<{ uri: string }>('resource.resolve', {
        resourceId: managedResourceId,
      });
      const metadata = await bootstrapRuntime.invoke<{
        metadata: {
          size: number;
          isFile: boolean;
        };
      }>('resource.readMetadata', {
        resourceId: managedResourceId,
      });
      const binary = await bootstrapRuntime.invoke<{
        data: Buffer | { type: 'Buffer'; data: number[] };
      }>('resource.readBinary', {
        resourceId: managedResourceId,
      });

      expect(resolved.uri.startsWith('file://')).toBe(true);
      expect(await fs.readFile(fileURLToPath(resolved.uri))).toEqual(MANAGED_RESOURCE_CONTENT);
      expect(metadata.metadata).toMatchObject({
        size: MANAGED_RESOURCE_CONTENT.byteLength,
        isFile: true,
      });
      expect(unwrapBinaryRoutePayload(binary.data)).toEqual(MANAGED_RESOURCE_CONTENT);
    } finally {
      await bootstrapApp.stop();
    }
  }, 30_000);
});

import { describe, expect, it, vi } from 'vitest';
import { ResourceOpenService } from '../../packages/resource-open-service/src';

describe('ResourceOpenService', () => {
  it('prefers resource-handler capabilities before file-handler fallbacks', async () => {
    const launchPlugin = vi.fn().mockResolvedValue({ windowId: 'window-1' });
    const service = new ResourceOpenService({
      queryHandlerPlugins: vi.fn().mockResolvedValue([
        {
          id: 'chips.photo.viewer',
          enabled: true,
          type: 'app',
          capabilities: ['resource-handler:view:image/*', 'file-handler:.png'],
        },
      ]),
      launchPlugin,
      resolveResourceFilePath: () => '/tmp/demo.png',
      openPath: vi.fn(),
      openExternalUrl: vi.fn(),
    });

    await expect(
      service.openResource({
        resource: {
          resourceId: 'chips-render://card-root/test-token/assets/demo.png',
          mimeType: 'image/png',
          payload: {
            kind: 'chips.music-card',
            version: '1.0.0',
          },
        },
      }),
    ).resolves.toEqual({
      mode: 'plugin',
      pluginId: 'chips.photo.viewer',
      windowId: 'window-1',
      matchedCapability: 'resource-handler:view:image/*',
      resolved: {
        resourceId: 'chips-render://card-root/test-token/assets/demo.png',
        filePath: '/tmp/demo.png',
        mimeType: 'image/png',
        extension: '.png',
        fileName: 'demo.png',
      },
    });

    expect(launchPlugin).toHaveBeenCalledWith(
      'chips.photo.viewer',
      expect.objectContaining({
        targetPath: '/tmp/demo.png',
        trigger: 'resource-open-service',
        resourceOpen: expect.objectContaining({
          resourceId: 'chips-render://card-root/test-token/assets/demo.png',
          filePath: '/tmp/demo.png',
          mimeType: 'image/png',
          matchedCapability: 'resource-handler:view:image/*',
          payload: {
            kind: 'chips.music-card',
            version: '1.0.0',
          },
        }),
      }),
    );
  });

  it('falls back to file-handler capability when mime handler is missing', async () => {
    const launchPlugin = vi.fn().mockResolvedValue({ windowId: 'window-2' });
    const service = new ResourceOpenService({
      queryHandlerPlugins: vi.fn().mockResolvedValue([
        {
          id: 'chips.png.viewer',
          enabled: true,
          type: 'app',
          capabilities: ['file-handler:.png'],
        },
      ]),
      launchPlugin,
      resolveResourceFilePath: () => null,
      openPath: vi.fn(),
      openExternalUrl: vi.fn(),
    });

    await expect(
      service.openResource({
        resource: {
          resourceId: '/tmp/demo.png',
        },
      }),
    ).resolves.toMatchObject({
      mode: 'plugin',
      pluginId: 'chips.png.viewer',
      matchedCapability: 'file-handler:.png',
    });
  });

  it('falls back to shell path opening when no handler plugin exists for a local file', async () => {
    const openPath = vi.fn().mockResolvedValue(undefined);
    const service = new ResourceOpenService({
      queryHandlerPlugins: vi.fn().mockResolvedValue([]),
      launchPlugin: vi.fn(),
      resolveResourceFilePath: () => null,
      openPath,
      openExternalUrl: vi.fn(),
    });

    await expect(
      service.openResource({
        resource: {
          resourceId: '/tmp/manual.pdf',
          mimeType: 'application/pdf',
        },
      }),
    ).resolves.toEqual({
      mode: 'shell',
      resolved: {
        resourceId: '/tmp/manual.pdf',
        filePath: '/tmp/manual.pdf',
        mimeType: 'application/pdf',
        extension: '.pdf',
        fileName: 'manual.pdf',
      },
    });

    expect(openPath).toHaveBeenCalledWith('/tmp/manual.pdf');
  });

  it('opens external urls when no handler exists', async () => {
    const openExternalUrl = vi.fn().mockResolvedValue(undefined);
    const service = new ResourceOpenService({
      queryHandlerPlugins: vi.fn().mockResolvedValue([]),
      launchPlugin: vi.fn(),
      resolveResourceFilePath: () => null,
      openPath: vi.fn(),
      openExternalUrl,
    });

    await expect(
      service.openResource({
        resource: {
          resourceId: 'https://example.com/demo.png',
          mimeType: 'image/png',
        },
      }),
    ).resolves.toEqual({
      mode: 'external',
      resolved: {
        resourceId: 'https://example.com/demo.png',
        mimeType: 'image/png',
        extension: '.png',
      },
    });

    expect(openExternalUrl).toHaveBeenCalledWith('https://example.com/demo.png');
  });
});

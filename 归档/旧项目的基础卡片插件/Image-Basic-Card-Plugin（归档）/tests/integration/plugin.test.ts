/**
 * 插件集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageCardPlugin } from '../../src/plugin';

describe('ImageCardPlugin Integration', () => {
  let plugin: ImageCardPlugin;
  let mockCore: {
    request: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    plugin = new ImageCardPlugin();
    mockCore = {
      request: vi.fn().mockResolvedValue({ success: true, data: {} }),
      on: vi.fn(),
      off: vi.fn(),
    };
    await plugin.initialize(mockCore as any);
  });

  describe('full lifecycle', () => {
    it('should complete full lifecycle', async () => {
      await plugin.start();
      await plugin.stop();
      await plugin.destroy();
    });
  });

  describe('renderer creation and usage', () => {
    it('should create renderer with core', () => {
      const renderer = plugin.createRenderer();
      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
    });

    it('should create multiple renderers', () => {
      const renderer1 = plugin.createRenderer();
      const renderer2 = plugin.createRenderer();
      expect(renderer1).not.toBe(renderer2);
    });
  });

  describe('editor creation and usage', () => {
    it('should create editor with core', () => {
      const editor = plugin.createEditor();
      expect(editor).toBeDefined();
      expect(typeof editor.render).toBe('function');
    });

    it('should create multiple editors', () => {
      const editor1 = plugin.createEditor();
      const editor2 = plugin.createEditor();
      expect(editor1).not.toBe(editor2);
    });
  });

  describe('config validation scenarios', () => {
    it('should validate single image config', () => {
      expect(
        plugin.validateConfig({
          card_type: 'ImageCard',
          images: [
            { id: 'img001', source: 'url', url: 'https://example.com/photo.jpg' },
          ],
          layout_type: 'single',
        })
      ).toBe(true);
    });

    it('should validate grid config', () => {
      expect(
        plugin.validateConfig({
          card_type: 'ImageCard',
          images: [
            { id: 'img001', source: 'url', url: 'https://example.com/1.jpg' },
            { id: 'img002', source: 'url', url: 'https://example.com/2.jpg' },
            { id: 'img003', source: 'url', url: 'https://example.com/3.jpg' },
            { id: 'img004', source: 'url', url: 'https://example.com/4.jpg' },
          ],
          layout_type: 'grid',
          layout_options: {
            grid_mode: '2x2',
            gap: 8,
          },
        })
      ).toBe(true);
    });

    it('should validate horizontal scroll config', () => {
      expect(
        plugin.validateConfig({
          card_type: 'ImageCard',
          images: [
            { id: 'img001', source: 'file', file_path: 'images/1.jpg' },
            { id: 'img002', source: 'file', file_path: 'images/2.jpg' },
          ],
          layout_type: 'horizontal-scroll',
        })
      ).toBe(true);
    });

    it('should validate long scroll config', () => {
      expect(
        plugin.validateConfig({
          card_type: 'ImageCard',
          images: [
            { id: 'img001', source: 'url', url: 'https://example.com/1.jpg' },
            { id: 'img002', source: 'url', url: 'https://example.com/2.jpg' },
          ],
          layout_type: 'long-scroll',
          layout_options: {
            scroll_mode: 'fixed-window',
            fixed_window_height: 500,
          },
        })
      ).toBe(true);
    });
  });

  describe('service registration', () => {
    it('should register image.render service', () => {
      const renderCalls = mockCore.request.mock.calls.filter(
        (call: any[]) =>
          call[0]?.service === 'core.register_service' &&
          call[0]?.payload?.name === 'image.render'
      );
      expect(renderCalls.length).toBe(1);
    });

    it('should register image.upload service', () => {
      const uploadCalls = mockCore.request.mock.calls.filter(
        (call: any[]) =>
          call[0]?.service === 'core.register_service' &&
          call[0]?.payload?.name === 'image.upload'
      );
      expect(uploadCalls.length).toBe(1);
    });
  });
});

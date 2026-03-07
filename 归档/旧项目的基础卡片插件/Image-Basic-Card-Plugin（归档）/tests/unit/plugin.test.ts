/**
 * 插件主类测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageCardPlugin } from '../../src/plugin';

describe('ImageCardPlugin', () => {
  let plugin: ImageCardPlugin;

  beforeEach(() => {
    plugin = new ImageCardPlugin();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(plugin.metadata.id).toBe('chipshub:image-card');
    });

    it('should have correct cardType', () => {
      expect(plugin.metadata.cardType).toBe('ImageCard');
    });

    it('should have version', () => {
      expect(plugin.metadata.version).toBeDefined();
      expect(plugin.metadata.version).toBe('1.0.0');
    });

    it('should have name', () => {
      expect(plugin.metadata.name).toBe('图片卡片');
    });

    it('should have description', () => {
      expect(plugin.metadata.description).toBeTruthy();
    });

    it('should have icon', () => {
      expect(plugin.metadata.icon).toBeTruthy();
    });
  });

  describe('configSchema', () => {
    it('should have required fields', () => {
      expect(plugin.configSchema.required).toContain('card_type');
      expect(plugin.configSchema.required).toContain('images');
    });

    it('should define images as array', () => {
      expect(plugin.configSchema.properties.images.type).toBe('array');
    });

    it('should define layout_type enum', () => {
      const layoutType = plugin.configSchema.properties.layout_type;
      expect(layoutType.enum).toContain('single');
      expect(layoutType.enum).toContain('grid');
      expect(layoutType.enum).toContain('long-scroll');
      expect(layoutType.enum).toContain('horizontal-scroll');
    });

    it('should define layout_options properties', () => {
      const opts = plugin.configSchema.properties.layout_options.properties;
      expect(opts.grid_mode).toBeDefined();
      expect(opts.scroll_mode).toBeDefined();
      expect(opts.single_width_percent).toBeDefined();
      expect(opts.single_alignment).toBeDefined();
      expect(opts.gap).toBeDefined();
    });
  });

  describe('lifecycle', () => {
    it('should initialize with core', async () => {
      const mockCore = {
        request: vi.fn().mockResolvedValue({ success: true, data: {} }),
        on: vi.fn(),
        off: vi.fn(),
      };

      await plugin.initialize(mockCore as any);
      // Should not throw
    });

    it('should handle double initialization gracefully', async () => {
      const mockCore = {
        request: vi.fn().mockResolvedValue({ success: true, data: {} }),
        on: vi.fn(),
        off: vi.fn(),
      };

      await plugin.initialize(mockCore as any);
      await expect(plugin.initialize(mockCore as any)).resolves.not.toThrow();
    });

    it('should start after initialization', async () => {
      const mockCore = {
        request: vi.fn().mockResolvedValue({ success: true, data: {} }),
        on: vi.fn(),
        off: vi.fn(),
      };

      await plugin.initialize(mockCore as any);
      await plugin.start();
      // Should not throw
    });

    it('should throw when starting without initialization', async () => {
      await expect(plugin.start()).rejects.toThrow('插件未初始化');
    });

    it('should stop', async () => {
      const mockCore = {
        request: vi.fn().mockResolvedValue({ success: true, data: {} }),
        on: vi.fn(),
        off: vi.fn(),
      };

      await plugin.initialize(mockCore as any);
      await plugin.start();
      await plugin.stop();
      // Should not throw
    });

    it('should destroy', async () => {
      const mockCore = {
        request: vi.fn().mockResolvedValue({ success: true, data: {} }),
        on: vi.fn(),
        off: vi.fn(),
      };

      await plugin.initialize(mockCore as any);
      await plugin.destroy();
      // Should not throw
    });

    it('should register services on initialize', async () => {
      const mockCore = {
        request: vi.fn().mockResolvedValue({ success: true, data: {} }),
        on: vi.fn(),
        off: vi.fn(),
      };

      await plugin.initialize(mockCore as any);

      // Check that register_service was called for both services
      const registerCalls = mockCore.request.mock.calls.filter(
        (call: any[]) => call[0]?.service === 'core.register_service'
      );
      expect(registerCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createRenderer', () => {
    it('should create renderer instance', () => {
      const renderer = plugin.createRenderer();
      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
      expect(typeof renderer.update).toBe('function');
      expect(typeof renderer.getState).toBe('function');
      expect(typeof renderer.destroy).toBe('function');
    });
  });

  describe('createEditor', () => {
    it('should create editor instance', () => {
      const editor = plugin.createEditor();
      expect(editor).toBeDefined();
      expect(typeof editor.render).toBe('function');
      expect(typeof editor.getConfig).toBe('function');
      expect(typeof editor.validate).toBe('function');
      expect(typeof editor.onChange).toBe('function');
      expect(typeof editor.destroy).toBe('function');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const config = {
        card_type: 'ImageCard',
        images: [],
      };
      expect(plugin.validateConfig(config)).toBe(true);
    });

    it('should validate config with images', () => {
      const config = {
        card_type: 'ImageCard',
        images: [
          {
            id: 'abc1234567',
            source: 'url',
            url: 'https://example.com/image.jpg',
          },
        ],
        layout_type: 'single',
      };
      expect(plugin.validateConfig(config)).toBe(true);
    });

    it('should reject wrong card_type', () => {
      const config = {
        card_type: 'WrongType',
        images: [],
      };
      expect(plugin.validateConfig(config)).toBe(false);
    });

    it('should reject missing images', () => {
      const config = {
        card_type: 'ImageCard',
      };
      expect(plugin.validateConfig(config)).toBe(false);
    });

    it('should reject null', () => {
      expect(plugin.validateConfig(null)).toBe(false);
    });

    it('should reject non-object', () => {
      expect(plugin.validateConfig('string')).toBe(false);
    });

    it('should reject undefined', () => {
      expect(plugin.validateConfig(undefined)).toBe(false);
    });
  });
});

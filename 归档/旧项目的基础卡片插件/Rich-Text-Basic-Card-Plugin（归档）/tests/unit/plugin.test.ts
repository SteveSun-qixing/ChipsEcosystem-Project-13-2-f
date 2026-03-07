/**
 * 插件主类测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RichTextCardPlugin } from '../../src/plugin';

describe('RichTextCardPlugin', () => {
  let plugin: RichTextCardPlugin;

  beforeEach(() => {
    plugin = new RichTextCardPlugin();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(plugin.metadata.id).toBe('chipshub:rich-text-card');
    });

    it('should have correct cardType', () => {
      expect(plugin.metadata.cardType).toBe('RichTextCard');
    });

    it('should have version', () => {
      expect(plugin.metadata.version).toBeDefined();
    });
  });

  describe('configSchema', () => {
    it('should have required fields', () => {
      expect(plugin.configSchema.required).toContain('card_type');
      expect(plugin.configSchema.required).toContain('content_source');
    });

    it('should define content_source enum', () => {
      const contentSource = plugin.configSchema.properties.content_source;
      expect(contentSource.enum).toContain('file');
      expect(contentSource.enum).toContain('inline');
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
      
      // 第二次初始化应该不抛出错误
      await expect(plugin.initialize(mockCore as any)).resolves.not.toThrow();
      
      // 验证第二次初始化也调用了logInfo（通过request）
      // 由于logInfo内部可能降级到console.log，我们验证它正常返回即可
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
  });

  describe('createRenderer', () => {
    it('should create renderer instance', () => {
      const renderer = plugin.createRenderer();
      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
    });
  });

  describe('createEditor', () => {
    it('should create editor instance', () => {
      const editor = plugin.createEditor();
      expect(editor).toBeDefined();
      expect(typeof editor.render).toBe('function');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const config = {
        card_type: 'RichTextCard',
        content_source: 'inline',
      };
      expect(plugin.validateConfig(config)).toBe(true);
    });

    it('should reject wrong card_type', () => {
      const config = {
        card_type: 'WrongType',
        content_source: 'inline',
      };
      expect(plugin.validateConfig(config)).toBe(false);
    });

    it('should reject wrong content_source', () => {
      const config = {
        card_type: 'RichTextCard',
        content_source: 'wrong',
      };
      expect(plugin.validateConfig(config)).toBe(false);
    });

    it('should reject null', () => {
      expect(plugin.validateConfig(null)).toBe(false);
    });

    it('should reject non-object', () => {
      expect(plugin.validateConfig('string')).toBe(false);
    });
  });
});

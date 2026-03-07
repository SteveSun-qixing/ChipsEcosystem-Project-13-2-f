/**
 * 国际化工具测试
 */

import { describe, it, expect } from 'vitest';
import { t, hasKey, getAllKeys } from '../../src/utils/i18n';

describe('t()', () => {
  it('should return translated text for known key', () => {
    expect(t('plugin.initialized')).toBe('图片卡片插件已初始化');
  });

  it('should return key for unknown key', () => {
    expect(t('unknown.key')).toBe('unknown.key');
  });

  it('should handle variable substitution', () => {
    const result = t('error.image_too_large', { max: 10 });
    expect(result).toBe('图片大小超过 10MB');
  });

  it('should handle multiple variables', () => {
    const result = t('editor.image_count', { count: 5 });
    expect(result).toBe('共 5 张图片');
  });

  it('should handle missing variables gracefully', () => {
    const result = t('error.image_too_large');
    expect(result).toContain('{max}');
  });

  it('should normalize key with image. prefix', () => {
    expect(t('image.plugin.initialized')).toBe('图片卡片插件已初始化');
  });

  it('should return layout translations', () => {
    expect(t('layout.single')).toBe('单张图片');
    expect(t('layout.grid')).toBe('网格排版');
    expect(t('layout.long_scroll')).toBe('长图拼接');
    expect(t('layout.horizontal_scroll')).toBe('横向滑动');
  });

  it('should return grid mode translations', () => {
    expect(t('layout.grid_2x2')).toBe('2 × 2 网格');
    expect(t('layout.grid_3x3')).toBe('3 × 3 网格');
    expect(t('layout.grid_3col_infinite')).toBe('3 列瀑布流');
  });

  it('should return editor translations', () => {
    expect(t('editor.upload')).toBe('上传图片');
    expect(t('editor.upload_hint')).toBe('点击上传图片，或将图片拖放到此处');
  });

  it('should return error translations', () => {
    expect(t('error.render_failed')).toBe('渲染失败');
    expect(t('error.upload_failed')).toBe('图片上传失败');
  });
});

describe('hasKey()', () => {
  it('should return true for existing key', () => {
    expect(hasKey('plugin.initialized')).toBe(true);
  });

  it('should return false for non-existing key', () => {
    expect(hasKey('nonexistent.key')).toBe(false);
  });

  it('should handle normalized keys', () => {
    expect(hasKey('image.plugin.initialized')).toBe(true);
  });
});

describe('getAllKeys()', () => {
  it('should return all vocabulary keys', () => {
    const keys = getAllKeys();
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toContain('plugin.initialized');
    expect(keys).toContain('editor.upload');
    expect(keys).toContain('layout.title');
  });
});

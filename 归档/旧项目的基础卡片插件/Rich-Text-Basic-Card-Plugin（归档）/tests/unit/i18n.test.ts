/**
 * 国际化工具测试
 */

import { describe, it, expect } from 'vitest';
import { t, hasKey, getAllKeys } from '../../src/utils/i18n';

describe('t (translation)', () => {
  it('should return translation for valid key', () => {
    expect(t('toolbar.bold')).toBe('加粗');
    expect(t('toolbar.italic')).toBe('斜体');
  });

  it('should return key for unknown key', () => {
    expect(t('unknown.key')).toBe('unknown.key');
  });

  it('should replace variables', () => {
    expect(t('error.content_too_long', { max: 100 })).toBe('内容超过最大长度 100');
    expect(t('hint.image_max_size', { max: 5 })).toBe('最大 5MB');
  });

  it('should handle multiple variables', () => {
    const result = t('error.image_too_large', { max: 10 });
    expect(result).toContain('10');
  });
});

describe('hasKey', () => {
  it('should return true for existing key', () => {
    expect(hasKey('toolbar.bold')).toBe(true);
  });

  it('should return false for non-existing key', () => {
    expect(hasKey('non.existing.key')).toBe(false);
  });
});

describe('getAllKeys', () => {
  it('should return all vocabulary keys', () => {
    const keys = getAllKeys();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toContain('toolbar.bold');
    expect(keys).toContain('toolbar.italic');
  });
});

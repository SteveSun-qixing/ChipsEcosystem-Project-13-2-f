/**
 * 配置验证器测试
 */

import { describe, it, expect } from 'vitest';
import { validateConfig, getDefaultConfig, mergeDefaults } from '../../src/utils/validator';

describe('validateConfig', () => {
  it('should validate correct inline config', () => {
    const config = {
      card_type: 'RichTextCard',
      content_source: 'inline',
      content_text: '<p>Hello</p>',
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should validate correct file config', () => {
    const config = {
      card_type: 'RichTextCard',
      content_source: 'file',
      content_file: 'content.html',
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid card_type', () => {
    const config = {
      card_type: 'WrongType',
      content_source: 'inline',
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.some((e) => e.field === 'card_type')).toBe(true);
  });

  it('should reject invalid content_source', () => {
    const config = {
      card_type: 'RichTextCard',
      content_source: 'invalid',
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.field === 'content_source')).toBe(true);
  });

  it('should require content_file for file mode', () => {
    const config = {
      card_type: 'RichTextCard',
      content_source: 'file',
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.field === 'content_file')).toBe(true);
  });

  it('should reject non-object config', () => {
    const result = validateConfig('string');
    expect(result.valid).toBe(false);
  });

  it('should reject null config', () => {
    const result = validateConfig(null);
    expect(result.valid).toBe(false);
  });

  it('should validate layout options', () => {
    const config = {
      card_type: 'RichTextCard',
      content_source: 'inline',
      layout: {
        height_mode: 'fixed',
        fixed_height: 300,
      },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid height_mode', () => {
    const config = {
      card_type: 'RichTextCard',
      content_source: 'inline',
      layout: {
        height_mode: 'invalid',
      },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.field === 'layout.height_mode')).toBe(true);
  });
});

describe('getDefaultConfig', () => {
  it('should return default config', () => {
    const defaults = getDefaultConfig();
    expect(defaults.theme).toBe('');
    expect(defaults.toolbar).toBe(false);
    expect(defaults.read_only).toBe(true);
    expect(defaults.layout?.height_mode).toBe('auto');
  });
});

describe('mergeDefaults', () => {
  it('should merge user config with defaults', () => {
    const config = {
      content_source: 'inline' as const,
      content_text: '<p>Test</p>',
    };
    const result = mergeDefaults(config);

    expect(result.card_type).toBe('RichTextCard');
    expect(result.content_source).toBe('inline');
    expect(result.content_text).toBe('<p>Test</p>');
    expect(result.toolbar).toBe(false);
    expect(result.read_only).toBe(true);
  });

  it('should allow user config to override defaults', () => {
    const config = {
      content_source: 'inline' as const,
      toolbar: true,
      read_only: false,
    };
    const result = mergeDefaults(config);

    expect(result.toolbar).toBe(true);
    expect(result.read_only).toBe(false);
  });
});

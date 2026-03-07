/**
 * 验证器测试
 */

import { describe, it, expect } from 'vitest';
import {
  validateConfig,
  validateImageUrl,
  validateImageFormat,
  validateImageSize,
  getDefaultConfig,
  mergeDefaults,
} from '../../src/utils/validator';

describe('validateConfig', () => {
  it('should validate minimal correct config', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [],
      layout_type: 'single',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should validate full config', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [
        { id: 'abc1234567', source: 'url', url: 'https://example.com/a.jpg' },
        { id: 'def7890123', source: 'file', file_path: 'images/b.png' },
      ],
      layout_type: 'grid',
      layout_options: {
        grid_mode: '3x3',
        gap: 12,
      },
      layout: {
        height_mode: 'auto',
      },
    });
    expect(result.valid).toBe(true);
  });

  it('should reject null', () => {
    const result = validateConfig(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBe(1);
    expect(result.errors?.[0]?.code).toBe('INVALID_TYPE');
  });

  it('should reject non-object', () => {
    const result = validateConfig('string');
    expect(result.valid).toBe(false);
  });

  it('should reject wrong card_type', () => {
    const result = validateConfig({
      card_type: 'WrongType',
      images: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'INVALID_CARD_TYPE')).toBe(true);
  });

  it('should reject non-array images', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: 'not-array',
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'INVALID_IMAGES')).toBe(true);
  });

  it('should reject invalid layout_type', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [],
      layout_type: 'invalid',
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'INVALID_LAYOUT_TYPE')).toBe(true);
  });

  it('should validate image items', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [
        { id: '', source: 'invalid' },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it('should require file_path for file source', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [
        { id: 'abc1234567', source: 'file' },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'MISSING_FILE_PATH')).toBe(true);
  });

  it('should require url for url source', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [
        { id: 'abc1234567', source: 'url' },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'MISSING_URL')).toBe(true);
  });

  it('should validate grid_mode', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [],
      layout_type: 'grid',
      layout_options: {
        grid_mode: 'invalid',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'INVALID_GRID_MODE')).toBe(true);
  });

  it('should validate scroll_mode', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [],
      layout_type: 'long-scroll',
      layout_options: {
        scroll_mode: 'invalid',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'INVALID_SCROLL_MODE')).toBe(true);
  });

  it('should validate single_width_percent range', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [],
      layout_type: 'single',
      layout_options: {
        single_width_percent: 5,
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'INVALID_WIDTH_PERCENT')).toBe(true);
  });

  it('should validate alignment', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [],
      layout_options: {
        single_alignment: 'invalid',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'INVALID_ALIGNMENT')).toBe(true);
  });

  it('should validate gap', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [],
      layout_options: {
        gap: -1,
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'INVALID_GAP')).toBe(true);
  });

  it('should validate layout height_mode', () => {
    const result = validateConfig({
      card_type: 'ImageCard',
      images: [],
      layout: {
        height_mode: 'invalid',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.code === 'INVALID_HEIGHT_MODE')).toBe(true);
  });
});

describe('validateImageUrl', () => {
  it('should accept valid http URL', () => {
    expect(validateImageUrl('https://example.com/image.jpg')).toBe(true);
  });

  it('should accept valid http URL', () => {
    expect(validateImageUrl('http://example.com/image.jpg')).toBe(true);
  });

  it('should accept data URL', () => {
    expect(validateImageUrl('data:image/png;base64,abc123')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(validateImageUrl('')).toBe(false);
  });

  it('should reject javascript URL', () => {
    expect(validateImageUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('validateImageFormat', () => {
  it('should accept JPEG', () => {
    expect(validateImageFormat('image/jpeg')).toBe(true);
  });

  it('should accept PNG', () => {
    expect(validateImageFormat('image/png')).toBe(true);
  });

  it('should accept WebP', () => {
    expect(validateImageFormat('image/webp')).toBe(true);
  });

  it('should accept GIF', () => {
    expect(validateImageFormat('image/gif')).toBe(true);
  });

  it('should accept SVG', () => {
    expect(validateImageFormat('image/svg+xml')).toBe(true);
  });

  it('should reject non-image types', () => {
    expect(validateImageFormat('text/plain')).toBe(false);
  });

  it('should reject application types', () => {
    expect(validateImageFormat('application/pdf')).toBe(false);
  });

  it('should accept custom format list', () => {
    expect(validateImageFormat('image/bmp', ['image/bmp'])).toBe(true);
  });
});

describe('validateImageSize', () => {
  it('should accept file within limit', () => {
    expect(validateImageSize(5 * 1024 * 1024, 10)).toBe(true);
  });

  it('should reject file exceeding limit', () => {
    expect(validateImageSize(11 * 1024 * 1024, 10)).toBe(false);
  });

  it('should accept exact limit', () => {
    expect(validateImageSize(10 * 1024 * 1024, 10)).toBe(true);
  });

  it('should accept zero size', () => {
    expect(validateImageSize(0, 10)).toBe(true);
  });
});

describe('getDefaultConfig', () => {
  it('should return default config', () => {
    const config = getDefaultConfig();
    expect(config.card_type).toBe('ImageCard');
    expect(config.images).toEqual([]);
    expect(config.layout_type).toBe('single');
  });

  it('should return a new object each time', () => {
    const config1 = getDefaultConfig();
    const config2 = getDefaultConfig();
    expect(config1).not.toBe(config2);
  });
});

describe('mergeDefaults', () => {
  it('should merge with defaults', () => {
    const config = mergeDefaults({
      images: [{ id: 'abc1234567', source: 'url', url: 'https://example.com/a.jpg' }],
      layout_type: 'grid',
    });
    expect(config.card_type).toBe('ImageCard');
    expect(config.images.length).toBe(1);
    expect(config.layout_type).toBe('grid');
    expect(config.layout_options?.gap).toBe(8);
  });

  it('should preserve user values', () => {
    const config = mergeDefaults({
      layout_options: {
        gap: 16,
      },
    });
    expect(config.layout_options?.gap).toBe(16);
  });
});

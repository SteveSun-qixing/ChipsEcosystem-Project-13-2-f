/**
 * DOM工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  generateId,
  getFileExtension,
  formatFileSize,
  escapeHtml,
  arrayMove,
} from '../../src/utils/dom';

describe('generateId', () => {
  it('should generate 10-character ID', () => {
    const id = generateId();
    expect(id.length).toBe(10);
  });

  it('should only contain base62 characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9A-Za-z]+$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('getFileExtension', () => {
  it('should return extension for jpg', () => {
    expect(getFileExtension('photo.jpg')).toBe('.jpg');
  });

  it('should return lowercase extension', () => {
    expect(getFileExtension('photo.JPG')).toBe('.jpg');
  });

  it('should handle multiple dots', () => {
    expect(getFileExtension('my.photo.png')).toBe('.png');
  });

  it('should return empty string for no extension', () => {
    expect(getFileExtension('noextension')).toBe('');
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500.0 B');
  });

  it('should format KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  it('should format MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('should format GB', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });

  it('should format zero', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });
});

describe('escapeHtml', () => {
  it('should escape angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('should escape ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should handle plain text', () => {
    expect(escapeHtml('hello')).toBe('hello');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('arrayMove', () => {
  it('should move element forward', () => {
    const result = arrayMove([1, 2, 3, 4], 0, 2);
    expect(result).toEqual([2, 3, 1, 4]);
  });

  it('should move element backward', () => {
    const result = arrayMove([1, 2, 3, 4], 3, 1);
    expect(result).toEqual([1, 4, 2, 3]);
  });

  it('should handle same position', () => {
    const result = arrayMove([1, 2, 3], 1, 1);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should not mutate original array', () => {
    const original = [1, 2, 3];
    arrayMove(original, 0, 2);
    expect(original).toEqual([1, 2, 3]);
  });

  it('should handle objects', () => {
    const items = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ];
    const result = arrayMove(items, 2, 0);
    expect(result.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
});

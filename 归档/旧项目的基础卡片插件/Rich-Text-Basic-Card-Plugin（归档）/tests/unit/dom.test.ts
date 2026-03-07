/**
 * DOM工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  extractText,
  countWords,
  isEmpty,
  getFirstImage,
  getAllLinks,
  escapeHtml,
  capitalize,
  debounce,
  throttle,
} from '../../src/utils/dom';

describe('extractText', () => {
  it('should extract text from HTML', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    expect(extractText(html)).toBe('Hello World');
  });

  it('should handle nested tags', () => {
    const html = '<div><p><em>Nested</em> content</p></div>';
    expect(extractText(html)).toBe('Nested content');
  });

  it('should handle empty HTML', () => {
    expect(extractText('')).toBe('');
  });
});

describe('countWords', () => {
  it('should count Chinese characters', () => {
    const html = '<p>你好世界</p>';
    expect(countWords(html)).toBe(4);
  });

  it('should count mixed content', () => {
    const html = '<p>Hello 世界</p>';
    expect(countWords(html)).toBe(7); // H-e-l-l-o + 世 + 界
  });

  it('should ignore whitespace', () => {
    const html = '<p>Hello   World</p>';
    expect(countWords(html)).toBe(10); // HelloWorld without spaces
  });
});

describe('isEmpty', () => {
  it('should return true for empty content', () => {
    expect(isEmpty('<p></p>')).toBe(true);
    expect(isEmpty('<p>   </p>')).toBe(true);
  });

  it('should return false for non-empty content', () => {
    expect(isEmpty('<p>Hello</p>')).toBe(false);
  });
});

describe('getFirstImage', () => {
  it('should return first image src', () => {
    const html = '<p>Text</p><img src="image1.jpg" /><img src="image2.jpg" />';
    expect(getFirstImage(html)).toBe('image1.jpg');
  });

  it('should return null when no image', () => {
    const html = '<p>No image here</p>';
    expect(getFirstImage(html)).toBeNull();
  });

  it('should handle single quotes', () => {
    const html = "<img src='image.jpg' />";
    expect(getFirstImage(html)).toBe('image.jpg');
  });
});

describe('getAllLinks', () => {
  it('should return all link hrefs', () => {
    const html = '<a href="link1">Link 1</a><a href="link2">Link 2</a>';
    expect(getAllLinks(html)).toEqual(['link1', 'link2']);
  });

  it('should return empty array when no links', () => {
    const html = '<p>No links</p>';
    expect(getAllLinks(html)).toEqual([]);
  });
});

describe('escapeHtml', () => {
  it('should escape special characters', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"quotes"')).toBe('"quotes"');
    expect(escapeHtml("'single'")).toBe("'single'");
    expect(escapeHtml('&amp')).toBe('&amp;amp');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });

  it('should handle single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('debounce', () => {
  it('should debounce function calls', async () => {
    let count = 0;
    const fn = debounce(() => {
      count++;
    }, 50);

    fn();
    fn();
    fn();

    expect(count).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(count).toBe(1);
  });
});

describe('throttle', () => {
  it('should throttle function calls', async () => {
    let count = 0;
    const fn = throttle(() => {
      count++;
    }, 50);

    fn(); // Should execute
    fn(); // Should be throttled
    fn(); // Should be throttled

    expect(count).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 60));

    fn(); // Should execute
    expect(count).toBe(2);
  });
});

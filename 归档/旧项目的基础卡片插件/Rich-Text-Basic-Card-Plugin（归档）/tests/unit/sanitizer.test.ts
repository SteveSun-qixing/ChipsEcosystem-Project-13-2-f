/**
 * HTML安全过滤器测试
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, isSafeHtml } from '../../src/utils/sanitizer';

describe('sanitizeHtml', () => {
  it('should keep safe HTML tags', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    const result = sanitizeHtml(html);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
  });

  it('should remove script tags', () => {
    const html = '<p>Hello</p><script>alert(1)</script>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should remove onclick attributes', () => {
    const html = '<p onclick="alert(1)">Click me</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('onclick');
  });

  it('should remove javascript: URLs', () => {
    const html = '<a href="javascript:alert(1)">Link</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('javascript:');
  });

  it('should allow safe URLs', () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = sanitizeHtml(html);
    expect(result).toContain('href="https://example.com"');
  });

  it('should allow relative URLs', () => {
    const html = '<a href="/page">Link</a>';
    const result = sanitizeHtml(html);
    expect(result).toContain('href="/page"');
  });

  it('should keep safe style attributes', () => {
    const html = '<span style="color: red;">Text</span>';
    const result = sanitizeHtml(html);
    expect(result).toContain('color: red');
  });

  it('should remove unsafe style attributes', () => {
    const html = '<span style="background: url(javascript:alert(1));">Text</span>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('url(');
  });

  it('should handle nested tags', () => {
    const html = '<div><p><strong>Bold <em>and italic</em></strong></p></div>';
    const result = sanitizeHtml(html);
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('should unwrap unknown tags but keep content', () => {
    const html = '<custom>Content</custom>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<custom>');
    expect(result).toContain('Content');
  });

  it('should allow data:image URLs for images', () => {
    const html = '<img src="data:image/png;base64,abc123" />';
    const result = sanitizeHtml(html);
    expect(result).toContain('data:image/png');
  });

  it('should remove data: URLs for non-image content', () => {
    const html = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('data:text');
  });
});

describe('isSafeHtml', () => {
  it('should return true for safe HTML', () => {
    const html = '<p>Safe content</p>';
    expect(isSafeHtml(html)).toBe(true);
  });

  it('should return false for unsafe HTML', () => {
    const html = '<script>alert(1)</script>';
    expect(isSafeHtml(html)).toBe(false);
  });
});

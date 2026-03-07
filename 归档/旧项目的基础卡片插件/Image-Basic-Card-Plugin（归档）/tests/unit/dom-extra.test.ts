/**
 * DOM工具函数额外测试 - 提升覆盖率
 */

import { describe, it, expect, vi } from 'vitest';
import {
  fileToDataUrl,
  getImageNaturalSize,
  preloadImage,
  preloadImages,
  debounce,
  throttle,
  isTouchDevice,
} from '../../src/utils/dom';

describe('fileToDataUrl', () => {
  it('should convert file to data URL', async () => {
    const blob = new Blob(['test'], { type: 'image/png' });
    const file = new File([blob], 'test.png', { type: 'image/png' });
    
    const result = await fileToDataUrl(file);
    expect(result).toBe('data:image/png;base64,mockdata');
  });
});

describe('getImageNaturalSize', () => {
  it('should return natural dimensions', async () => {
    const result = await getImageNaturalSize('https://example.com/test.jpg');
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });
});

describe('preloadImage', () => {
  it('should preload and return image element', async () => {
    const img = await preloadImage('https://example.com/test.jpg');
    expect(img).toBeDefined();
  });
});

describe('preloadImages', () => {
  it('should preload multiple images', async () => {
    const results = await preloadImages([
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
    ]);
    expect(results.size).toBe(2);
  });
});

describe('debounce', () => {
  it('should debounce function calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    
    debounced();
    debounced();
    debounced();
    
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('should reset timer on subsequent calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(50);
    
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('throttle', () => {
  it('should throttle function calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
    
    vi.useRealTimers();
  });
});

describe('isTouchDevice', () => {
  it('should return boolean', () => {
    const result = isTouchDevice();
    expect(typeof result).toBe('boolean');
  });
});

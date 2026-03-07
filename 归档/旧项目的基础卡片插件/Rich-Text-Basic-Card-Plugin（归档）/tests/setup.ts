/**
 * 测试环境设置
 */

import { vi } from 'vitest';

// Mock window.getSelection
Object.defineProperty(window, 'getSelection', {
  value: () => ({
    rangeCount: 0,
    getRangeAt: () => ({
      startOffset: 0,
      endOffset: 0,
      collapsed: true,
      commonAncestorContainer: document.body,
      surroundContents: vi.fn(),
    }),
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  }),
  writable: true,
});

// Mock document.execCommand
document.execCommand = vi.fn(() => true);

// Mock document.queryCommandState
document.queryCommandState = vi.fn(() => false);

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock DOMParser
class MockDOMParser {
  parseFromString(html: string, _type: string) {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = html;
    return doc;
  }
}

global.DOMParser = MockDOMParser as unknown as typeof DOMParser;

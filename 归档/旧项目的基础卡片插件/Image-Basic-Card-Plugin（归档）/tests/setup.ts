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

// Mock Image
class MockImage {
  src = '';
  naturalWidth = 800;
  naturalHeight = 600;
  onload: (() => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

global.Image = MockImage as unknown as typeof Image;

// Mock URL.createObjectURL
URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

// Mock FileReader
class MockFileReader {
  result: string | ArrayBuffer | null = 'data:image/png;base64,mockdata';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(_file: Blob): void {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }

  readAsArrayBuffer(_file: Blob): void {
    this.result = new ArrayBuffer(8);
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

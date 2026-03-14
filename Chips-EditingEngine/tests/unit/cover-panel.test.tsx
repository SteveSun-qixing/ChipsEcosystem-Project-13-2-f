// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoverPanel } from '../../src/components/CardSettings/panels/CoverPanel';

const { mockFileService } = vi.hoisted(() => ({
  mockFileService: {
    readBinary: vi.fn(),
  },
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/services/file-service', () => ({
  fileService: mockFileService,
}));

describe('CoverPanel', () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalResizeObserver: typeof ResizeObserver | undefined;
  let clientWidthDescriptor: PropertyDescriptor | undefined;
  let clientHeightDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    originalResizeObserver = globalThis.ResizeObserver;
    clientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    clientHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
    mockFileService.readBinary.mockReset();

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 520,
    });

    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 700,
    });

    globalThis.ResizeObserver = class ResizeObserverMock {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }

      unobserve() {}

      disconnect() {}
    } as typeof ResizeObserver;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();

    if (clientWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidthDescriptor);
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).clientWidth;
    }

    if (clientHeightDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', clientHeightDescriptor);
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).clientHeight;
    }

    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
    } else {
      delete (globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    }
  });

  it('renders the left preview area as a single cover iframe without extra text elements', async () => {
    await act(async () => {
      root.render(
        <CoverPanel
          cardId="card-1"
          cardPath="/workspace/demo.card"
          cardName="Demo Card"
          currentCoverHtml="<html><body><main>Preview</main></body></html>"
          currentRatio="3:4"
          onDraftChange={() => undefined}
        />,
      );
    });

    const previewPane = document.body.querySelector('.cover-panel__preview-pane');
    const previewFrame = previewPane?.querySelector('.cover-panel__preview-frame') as HTMLDivElement | null;
    const previewIframes = previewPane?.querySelectorAll('iframe');

    expect(previewPane).not.toBeNull();
    expect(previewPane?.textContent?.trim()).toBe('');
    expect(previewIframes).toHaveLength(1);
    expect(previewFrame?.style.width).toBe('300px');
    expect(previewFrame?.style.height).toBe('400px');
  });

  it('uses a data URL inside the preview iframe for generated image covers', async () => {
    mockFileService.readBinary.mockResolvedValue(new Uint8Array([137, 80, 78, 71]));

    await act(async () => {
      root.render(
        <CoverPanel
          cardId="card-2"
          cardPath="/workspace/demo.card"
          cardName="Image Card"
          currentCoverHtml={'<!doctype html><html><body data-chips-cover-mode="image" data-chips-cover-image-source="./cardcover/cover-image.png"><img src="./cardcover/cover-image.png" alt="" /></body></html>'}
          currentRatio="3:4"
          onDraftChange={() => undefined}
        />,
      );
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    const previewFrame = document.body.querySelector('.cover-panel__preview-pane iframe') as HTMLIFrameElement | null;
    const srcDoc = previewFrame?.srcdoc ?? previewFrame?.getAttribute('srcdoc') ?? '';

    expect(mockFileService.readBinary).toHaveBeenCalledWith('/workspace/demo.card/.card/cardcover/cover-image.png');
    expect(srcDoc).toContain('data:image/png;base64,');
    expect(srcDoc).not.toContain('blob:');
  });
});

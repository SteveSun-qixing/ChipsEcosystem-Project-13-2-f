// @vitest-environment jsdom

import React, { act, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BasecardFrameHost } from '../../src/basecard-runtime/frame-host';

const mockRenderView = vi.fn();

vi.mock('../../src/basecard-runtime/registry', () => ({
  getBasecardDescriptor: () => ({
    pluginId: 'mock.basecard',
    cardType: 'base.mock',
    displayName: 'Mock Basecard',
    commitDebounceMs: 260,
    createInitialConfig: (baseCardId: string) => ({ id: baseCardId }),
    normalizeConfig: (input: Record<string, unknown>, baseCardId: string) => ({
      ...input,
      id: baseCardId,
    }),
    validateConfig: () => ({
      valid: true,
      errors: {},
    }),
    renderView: mockRenderView,
  }),
  normalizeBasecardConfig: (_cardType: string, baseCardId: string, input: Record<string, unknown>) => ({
    ...input,
    id: baseCardId,
  }),
}));

function ParentHarness() {
  const [readyRevision, setReadyRevision] = useState(0);
  const stableConfig = useMemo(() => ({
    id: 'base-1',
    body: '<p>demo</p>',
  }), []);

  return (
    <div data-ready-revision={String(readyRevision)}>
      <BasecardFrameHost
        baseCardId="base-1"
        cardType="base.mock"
        config={stableConfig}
        selectable
        interactionPolicy="delegate"
        themeCacheKey="theme-1"
        onSelect={() => undefined}
        onInteraction={() => undefined}
        onStatusChange={(status) => {
          if (status.state === 'ready') {
            setReadyRevision((current) => current === 0 ? 1 : current);
          }
        }}
      />
    </div>
  );
}

describe('BasecardFrameHost', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockRenderView.mockReset();
    mockRenderView.mockImplementation(({ container: mountContainer }: { container: HTMLElement }) => {
      const marker = mountContainer.ownerDocument.createElement('div');
      marker.textContent = 'mounted';
      mountContainer.appendChild(marker);
      return () => {
        while (mountContainer.firstChild) {
          mountContainer.removeChild(mountContainer.firstChild);
        }
      };
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps the iframe mounted after ready-driven parent rerenders', async () => {
    await act(async () => {
      root.render(<ParentHarness />);
      await Promise.resolve();
    });

    const frame = container.querySelector('iframe') as HTMLIFrameElement | null;
    expect(frame).not.toBeNull();

    const frameWindow = frame?.contentWindow as (Window & { requestAnimationFrame?: (cb: FrameRequestCallback) => number }) | null;
    expect(frameWindow).not.toBeNull();
    Object.defineProperty(frameWindow, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: ((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }) as (cb: FrameRequestCallback) => number,
    });

    await act(async () => {
      frame?.dispatchEvent(new Event('load'));
      await Promise.resolve();
    });

    expect(mockRenderView).toHaveBeenCalled();
    expect(container.querySelector('.basecard-frame-host__overlay[data-state="loading"]')).toBeNull();
    expect(container.querySelector('.basecard-frame-host__overlay[data-state="error"]')).toBeNull();
    expect(container.querySelector('[data-ready-revision="1"]')).not.toBeNull();
  });
});

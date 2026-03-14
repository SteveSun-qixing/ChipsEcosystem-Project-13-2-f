// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardWindow } from '../../src/components/CardWindow/CardWindow';
import { globalEventEmitter } from '../../src/core/event-emitter';

const compositeWindowApi = {
  render: vi.fn(async () => ({
    frame: document.createElement('iframe'),
    origin: 'http://localhost',
  })),
  onReady: vi.fn((_frame: HTMLIFrameElement, handler: () => void) => {
    handler();
    return () => {};
  }),
  onResize: vi.fn(() => () => {}),
  onInteraction: vi.fn(() => () => {}),
  onNodeSelect: vi.fn(),
  onFatalError: vi.fn(() => () => {}),
  onNodeError: vi.fn(() => () => {}),
};

const setActiveCard = vi.fn();
const setSelectedBaseCard = vi.fn();
const panByInput = vi.fn();
const zoomByFactorAtPoint = vi.fn();
const markInteractionSequence = vi.fn();

vi.mock('../../src/services/bridge-client', () => ({
  getChipsClient: () => ({
    card: {
      compositeWindow: compositeWindowApi,
    },
  }),
}));

vi.mock('../../src/context/CardContext', () => ({
  useCard: () => ({
    openCards: new Map([
      [
        'card-1',
        {
          id: 'card-1',
          path: '/workspace/demo.card',
          metadata: {
            name: 'Demo Card',
            modifiedAt: '2026-03-13T00:00:00.000Z',
          },
          structure: {
            basicCards: [
              {
                id: 'base-1',
                type: 'RichTextCard',
                data: { id: 'base-1', body: '<p>Intro</p>' },
              },
            ],
          },
        },
      ],
    ]),
    activeCardId: 'card-1',
    selectedBaseCardId: null,
    setActiveCard,
    setSelectedBaseCard,
  }),
}));

vi.mock('@chips/component-library', () => ({
  useThemeRuntime: () => ({
    cacheKey: 'theme-cache-key',
  }),
}));

vi.mock('../../src/layouts/InfiniteCanvas/CanvasContext', () => ({
  useCanvas: () => ({
    zoom: 1,
    panByInput,
    panByScreenDelta: vi.fn(),
    zoomByFactorAtPoint,
    markInteractionSequence,
    clearInteractionSequence: vi.fn(),
    isDesktopZoomSuppressed: vi.fn(() => false),
  }),
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/components/CardWindowBase/CardWindowBase', () => ({
  CardWindowBase: ({
    children,
    headerSlot,
  }: {
    children: React.ReactNode;
    headerSlot?: React.ReactNode;
  }) => (
    <div>
      <div>{headerSlot}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('../../src/components/CardSettings/CardSettingsDialog', () => ({
  CardSettingsDialog: ({ visible }: { visible: boolean }) => (
    visible ? <div data-testid="card-settings-dialog">card-settings-dialog</div> : null
  ),
}));

vi.mock('../../src/components/WindowMenu/WindowMenu', () => ({
  WindowMenu: ({ onSettings }: { onSettings?: () => void }) => (
    <button type="button" data-testid="window-settings" onClick={() => onSettings?.()}>
      settings
    </button>
  ),
}));

vi.mock('../../src/services/workspace-service', () => ({
  workspaceService: {
    renameFile: vi.fn(),
  },
}));

describe('CardWindow', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    compositeWindowApi.render.mockClear();
    compositeWindowApi.onReady.mockClear();
    compositeWindowApi.onResize.mockClear();
    compositeWindowApi.onInteraction.mockClear();
    compositeWindowApi.onNodeSelect.mockClear();
    compositeWindowApi.onFatalError.mockClear();
    compositeWindowApi.onNodeError.mockClear();
    setActiveCard.mockClear();
    setSelectedBaseCard.mockClear();
    panByInput.mockClear();
    zoomByFactorAtPoint.mockClear();
    markInteractionSequence.mockClear();
    globalEventEmitter.clear();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await act(async () => {
      root.unmount();
    });
    globalEventEmitter.clear();
    container.remove();
  });

  it('maps composite node selection events into card selection state', async () => {
    let nodeSelectHandler: ((payload: { nodeId: string }) => void) | undefined;
    compositeWindowApi.onNodeSelect.mockImplementation((_frame, handler) => {
      nodeSelectHandler = handler;
      return () => {};
    });

    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-1',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'normal',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    expect(compositeWindowApi.render.mock.calls.length).toBeGreaterThan(0);
    expect(compositeWindowApi.onNodeSelect.mock.calls.length).toBeGreaterThan(0);
    expect(nodeSelectHandler).toBeTypeOf('function');

    await act(async () => {
      nodeSelectHandler?.({ nodeId: 'base-1' });
    });

    expect(setActiveCard).toHaveBeenCalledWith('card-1');
    expect(setSelectedBaseCard).toHaveBeenCalledWith('base-1');

    await act(async () => {
      nodeSelectHandler?.({ nodeId: 'missing-node' });
    });

    expect(setSelectedBaseCard).toHaveBeenCalledTimes(1);
  });

  it('applies composite resize payloads to the preview container height', async () => {
    let resizeHandler:
      | ((payload: { height: number; nodeCount: number; reason: string }) => void)
      | undefined;

    compositeWindowApi.onResize.mockImplementation((_frame, handler) => {
      resizeHandler = handler;
      return () => {};
    });

    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-2',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'normal',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    expect(compositeWindowApi.onResize.mock.calls.length).toBeGreaterThan(0);
    expect(resizeHandler).toBeTypeOf('function');

    await act(async () => {
      resizeHandler?.({ height: 912.2, nodeCount: 1, reason: 'node-height' });
      await Promise.resolve();
    });

    const preview = container.querySelector('.card-window__preview') as HTMLDivElement | null;
    expect(preview?.style.height).toBe('913px');
    expect(preview?.style.minHeight).toBe('913px');
    expect(preview?.style.width).toBe('100%');
    expect(preview?.style.maxWidth).toBe('100%');
    expect(preview?.style.flex).toBe('1 1 auto');
  });

  it('keeps short composite cards content-driven in expanded mode', async () => {
    let resizeHandler:
      | ((payload: { height: number; nodeCount: number; reason: string }) => void)
      | undefined;

    compositeWindowApi.onResize.mockImplementation((_frame, handler) => {
      resizeHandler = handler;
      return () => {};
    });

    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-3',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'normal',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      resizeHandler?.({ height: 128.1, nodeCount: 1, reason: 'node-height' });
      await Promise.resolve();
    });

    const preview = container.querySelector('.card-window__preview') as HTMLDivElement | null;
    expect(preview?.style.height).toBe('129px');
    expect(preview?.style.minHeight).toBe('129px');
  });

  it('passes the formal composite interaction policy through the preview render request', async () => {
    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-policy',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'normal',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    expect(compositeWindowApi.render).toHaveBeenLastCalledWith({
      cardFile: '/workspace/demo.card',
      mode: 'preview',
      interactionPolicy: 'delegate',
    });

    compositeWindowApi.render.mockClear();

    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-policy',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'collapsed',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    expect(compositeWindowApi.render).toHaveBeenLastCalledWith({
      cardFile: '/workspace/demo.card',
      mode: 'preview',
      interactionPolicy: 'native',
    });
  });

  it('routes composite interaction events into canvas pan and anchored zoom actions', async () => {
    let interactionHandler:
      | ((payload: {
        cardId: string;
        source: 'basecard-frame' | 'composite-shell' | 'degraded-node';
        device: 'wheel' | 'touch';
        intent: 'scroll' | 'zoom';
        deltaX: number;
        deltaY: number;
        zoomDelta?: number;
        clientX: number;
        clientY: number;
        pointerCount: number;
      }) => void)
      | undefined;

    const frame = document.createElement('iframe');
    frame.getBoundingClientRect = vi.fn(() => ({
      x: 120,
      y: 240,
      left: 120,
      top: 240,
      right: 760,
      bottom: 720,
      width: 640,
      height: 480,
      toJSON: () => ({}),
    })) as unknown as typeof frame.getBoundingClientRect;

    compositeWindowApi.render.mockImplementationOnce(async () => ({
      frame,
      origin: 'http://localhost',
    }));
    compositeWindowApi.onInteraction.mockImplementationOnce((_frame, handler) => {
      interactionHandler = handler;
      return () => {};
    });

    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-interaction',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'normal',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    expect(compositeWindowApi.onInteraction).toHaveBeenCalledTimes(1);
    expect(interactionHandler).toBeTypeOf('function');

    await act(async () => {
      interactionHandler?.({
        cardId: 'card-1',
        source: 'basecard-frame',
        device: 'wheel',
        intent: 'scroll',
        deltaX: 12,
        deltaY: 36,
        clientX: 32,
        clientY: 64,
        pointerCount: 1,
      });
    });

    expect(markInteractionSequence).toHaveBeenCalledWith({ suppressDesktopZoom: true });
    expect(panByInput).toHaveBeenCalledWith(12, 36);

    await act(async () => {
      interactionHandler?.({
        cardId: 'card-1',
        source: 'basecard-frame',
        device: 'touch',
        intent: 'zoom',
        deltaX: 0,
        deltaY: 0,
        zoomDelta: 0.2,
        clientX: 50,
        clientY: 80,
        pointerCount: 2,
      });
    });

    expect(zoomByFactorAtPoint).toHaveBeenCalledWith(1.2, 170, 320);
  });

  it('opens the card settings dialog from the window menu settings action', async () => {
    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-4',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'normal',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="card-settings-dialog"]')).toBeNull();

    await act(async () => {
      (container.querySelector('[data-testid="window-settings"]') as HTMLButtonElement).click();
    });

    expect(container.querySelector('[data-testid="card-settings-dialog"]')).not.toBeNull();
  });

  it('debounces preview rerenders while edit-mode updates stream in', async () => {
    vi.useFakeTimers();

    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-4',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'normal',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    expect(compositeWindowApi.render).toHaveBeenCalledTimes(1);

    await act(async () => {
      globalEventEmitter.emit('card:basic-card-updated', { cardId: 'card-1', basicCardId: 'base-1' });
      globalEventEmitter.emit('card:basic-card-updated', { cardId: 'card-1', basicCardId: 'base-1' });
      vi.advanceTimersByTime(319);
      await Promise.resolve();
    });

    expect(compositeWindowApi.render).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(compositeWindowApi.render).toHaveBeenCalledTimes(2);
  });

  it('keeps the current preview visible while a background refresh is pending', async () => {
    vi.useFakeTimers();

    let renderCount = 0;
    let resolveBackgroundRender: (() => void) | null = null;

    compositeWindowApi.render.mockImplementation(async () => {
      renderCount += 1;
      const frame = document.createElement('iframe');

      if (renderCount === 1) {
        return {
          frame,
          origin: 'http://localhost',
        };
      }

      return await new Promise<{ frame: HTMLIFrameElement; origin: string }>((resolve) => {
        resolveBackgroundRender = () => {
          resolve({
            frame,
            origin: 'http://localhost',
          });
        };
      });
    });

    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-5',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'normal',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('.card-window__overlay')).toBeNull();

    await act(async () => {
      globalEventEmitter.emit('card:basic-card-updated', { cardId: 'card-1', basicCardId: 'base-1' });
      vi.advanceTimersByTime(320);
      await Promise.resolve();
    });

    expect(resolveBackgroundRender).toBeTypeOf('function');
    expect(container.querySelector('.card-window__overlay')).toBeNull();

    await act(async () => {
      resolveBackgroundRender?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('.card-window__overlay')).toBeNull();
  });

  it('waits for a longer idle window before refreshing while the editor is actively typing', async () => {
    vi.useFakeTimers();

    await act(async () => {
      root.render(
        <CardWindow
          config={{
            id: 'window-6',
            type: 'card',
            cardId: 'card-1',
            position: { x: 0, y: 0 },
            size: { width: 640, height: 480 },
            state: 'normal',
            isEditing: true,
            title: 'Demo Card',
          }}
          onUpdateConfig={() => undefined}
          onClose={() => undefined}
          onFocus={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    expect(compositeWindowApi.render).toHaveBeenCalledTimes(1);

    await act(async () => {
      globalEventEmitter.emit('card:editor-activity', { cardId: 'card-1', at: Date.now() });
      globalEventEmitter.emit('card:basic-card-updated', { cardId: 'card-1', basicCardId: 'base-1' });
      vi.advanceTimersByTime(1199);
      await Promise.resolve();
    });

    expect(compositeWindowApi.render).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(compositeWindowApi.render).toHaveBeenCalledTimes(2);
  });
});

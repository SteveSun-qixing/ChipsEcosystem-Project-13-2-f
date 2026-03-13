// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardWindow } from '../../src/components/CardWindow/CardWindow';

const compositeWindowApi = {
  render: vi.fn(async () => ({
    frame: document.createElement('iframe'),
    origin: 'http://localhost',
  })),
  onReady: vi.fn(() => () => {}),
  onNodeSelect: vi.fn(),
  onFatalError: vi.fn(() => () => {}),
  onNodeError: vi.fn(() => () => {}),
};

const setActiveCard = vi.fn();
const setSelectedBaseCard = vi.fn();

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
                data: { id: 'base-1', title: 'Intro' },
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
  }),
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/components/CardWindowBase/CardWindowBase', () => ({
  CardWindowBase: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../src/components/WindowMenu/WindowMenu', () => ({
  WindowMenu: () => null,
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
    compositeWindowApi.onNodeSelect.mockClear();
    compositeWindowApi.onFatalError.mockClear();
    compositeWindowApi.onNodeError.mockClear();
    setActiveCard.mockClear();
    setSelectedBaseCard.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
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
});

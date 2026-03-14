// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';

const mockState = vi.hoisted(() => {
  const workspaceListeners = new Map<string, Set<(payload: unknown) => void>>();

  return {
    capturedCanvasDrop: null as
      | ((data: unknown, worldPosition: { x: number; y: number }) => void | Promise<void>)
      | null,
    editorState: {
      currentLayout: 'infinite-canvas' as const,
      setState: vi.fn(),
    },
    uiState: {
      windows: [] as Array<Record<string, unknown>>,
      createToolWindow: vi.fn(),
      createCardWindow: vi.fn(),
      updateWindow: vi.fn(),
      focusWindow: vi.fn(),
    },
    cardState: {
      openCard: vi.fn(async () => undefined),
    },
    workspaceListeners,
    workspaceServiceMock: {
      initialize: vi.fn(async () => undefined),
      getState: vi.fn(() => ({ rootPath: '/workspace' })),
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        const handlers = workspaceListeners.get(event) ?? new Set<(payload: unknown) => void>();
        handlers.add(handler);
        workspaceListeners.set(event, handlers);
      }),
      off: vi.fn((event: string, handler: (payload: unknown) => void) => {
        workspaceListeners.get(event)?.delete(handler);
      }),
      openFile: vi.fn(),
      createCard: vi.fn(),
      createBox: vi.fn(),
    },
    bridgeClient: {
      theme: {
        getCurrent: vi.fn(async () => ({
          themeId: 'chips-official.default-theme',
          version: '1',
        })),
      },
      events: {
        on: vi.fn(() => () => undefined),
      },
    },
  };
});

vi.mock('@chips/component-library', () => ({
  ChipsThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/context', () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/context/EditorContext', () => ({
  useEditor: () => mockState.editorState,
}));

vi.mock('../../src/context/UIContext', () => ({
  useUI: () => mockState.uiState,
}));

vi.mock('../../src/context/CardContext', () => ({
  useCard: () => mockState.cardState,
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/services/bridge-client', () => ({
  getChipsClient: () => mockState.bridgeClient,
}));

vi.mock('../../src/services/i18n-service', () => ({
  i18nService: {
    initLocale: vi.fn(async () => 'zh-CN'),
  },
}));

vi.mock('../../src/services/workspace-service', () => ({
  workspaceService: mockState.workspaceServiceMock,
}));

vi.mock('../../src/layouts/InfiniteCanvas', () => ({
  InfiniteCanvas: ({ onDropCreate }: { onDropCreate?: (data: unknown, worldPosition: { x: number; y: number }) => void }) => {
    mockState.capturedCanvasDrop = onDropCreate ?? null;
    return <div className="mock-infinite-canvas" />;
  },
}));

vi.mock('../../src/layouts/Workbench', () => ({
  Workbench: () => <div className="mock-workbench" />,
}));

vi.mock('../../src/components/Dock/Dock', () => ({
  Dock: () => null,
}));

vi.mock('../../src/i18n', () => ({
  setLocale: vi.fn(),
}));

describe('App canvas drop integration', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockState.capturedCanvasDrop = null;
    mockState.workspaceListeners.clear();
    mockState.editorState.setState.mockClear();
    mockState.uiState.windows = [];
    mockState.uiState.createToolWindow.mockClear();
    mockState.uiState.createCardWindow.mockClear();
    mockState.uiState.updateWindow.mockClear();
    mockState.uiState.focusWindow.mockClear();
    mockState.cardState.openCard.mockClear();
    mockState.workspaceServiceMock.initialize.mockClear();
    mockState.workspaceServiceMock.getState.mockClear();
    mockState.workspaceServiceMock.on.mockClear();
    mockState.workspaceServiceMock.off.mockClear();
    mockState.workspaceServiceMock.openFile.mockClear();
    mockState.workspaceServiceMock.createCard.mockClear();
    mockState.workspaceServiceMock.createBox.mockClear();
    mockState.bridgeClient.theme.getCurrent.mockClear();
    mockState.bridgeClient.events.on.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('opens dropped workspace cards at the canvas drop position', async () => {
    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.capturedCanvasDrop).toBeTypeOf('function');

    await act(async () => {
      await mockState.capturedCanvasDrop?.(
        {
          type: 'workspace-file',
          fileId: 'card-1',
          fileType: 'card',
          filePath: '/workspace/demo.card',
          name: 'demo.card',
        },
        { x: 320, y: 180 },
      );
    });

    expect(mockState.workspaceServiceMock.openFile).toHaveBeenCalledWith('card-1', {
      windowPosition: { x: 320, y: 180 },
      isEditing: true,
    });
  });

  it('repositions an already opened card window when the workspace open event includes a drop position', async () => {
    mockState.uiState.windows = [
      {
        id: 'window-card-1',
        type: 'card',
        cardId: 'card-1',
        title: 'demo.card',
        position: { x: 20, y: 20 },
        size: { width: 400, height: 600 },
        state: 'collapsed',
        zIndex: 10,
      },
    ];

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const fileOpenedHandlers = Array.from(mockState.workspaceListeners.get('workspace:file-opened') ?? []);
    expect(fileOpenedHandlers).toHaveLength(1);

    await act(async () => {
      fileOpenedHandlers[0]?.({
        file: {
          id: 'card-1',
          path: '/workspace/demo.card',
          type: 'card',
          name: 'demo.card',
        },
        openOptions: {
          windowPosition: { x: 640, y: 360 },
          isEditing: true,
        },
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.cardState.openCard).toHaveBeenCalledWith('card-1', '/workspace/demo.card');
    expect(mockState.uiState.updateWindow).toHaveBeenCalledWith('window-card-1', {
      position: { x: 640, y: 360 },
      isEditing: true,
      state: 'normal',
    });
    expect(mockState.uiState.focusWindow).toHaveBeenCalledWith('window-card-1');
    expect(mockState.uiState.createCardWindow).not.toHaveBeenCalled();
  });
});

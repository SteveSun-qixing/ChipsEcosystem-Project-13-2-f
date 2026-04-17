// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoxEditorPanel } from '../../src/components/EditPanel/BoxEditorPanel';

const sessionRef = vi.hoisted(() => ({
  current: {
    boxId: 'box-1',
    boxFile: '/workspace/demo.box',
    workspaceDir: '/workspace/.chips-editing-engine/box-sessions/session-box-1',
    metadata: {
      boxId: 'box-1',
      name: 'Demo Box',
      activeLayoutType: 'chips.layout.grid',
      coverRatio: '3:4',
      createdAt: '2026-04-09T00:00:00.000Z',
      modifiedAt: '2026-04-09T00:00:00.000Z',
    },
    coverHtml: '<html></html>',
    content: {
      activeLayoutType: 'chips.layout.grid',
      layoutConfigs: {},
    },
    entries: [
      {
        entryId: 'entry-1',
        url: 'file:///workspace/first.card',
        enabled: true,
        snapshot: {
          title: '第一张卡片',
          documentId: 'first.card',
          contentType: 'chips/card',
          cover: {
            mode: 'none',
          },
        },
      },
      {
        entryId: 'entry-2',
        url: 'file:///workspace/second.card',
        enabled: true,
        snapshot: {
          title: '第二张卡片',
          documentId: 'second.card',
          contentType: 'chips/card',
          cover: {
            mode: 'none',
          },
        },
      },
    ],
    assets: [],
    isDirty: false,
    isSaving: false,
  },
}));

const serviceMocks = vi.hoisted(() => ({
  moveEntryToIndex: vi.fn(),
  removeEntry: vi.fn(),
  importDocumentFiles: vi.fn(),
}));

vi.mock('@chips/component-library', async () => {
  const ReactModule = await import('react');
  return {
    ChipsTabs: ({
      value,
      onValueChange,
      items,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      items: Array<{ value: string; label: string; content: React.ReactNode }>;
    }) => (
      <div data-testid="chips-tabs">
        <div>
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              data-testid={`tab-${item.value}`}
              onClick={() => onValueChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div data-testid={`panel-${value}`}>
          {items.find((item) => item.value === value)?.content ?? null}
        </div>
      </div>
    ),
  };
});

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
  }),
}));

vi.mock('../../src/hooks/useBoxDocumentSession', () => ({
  useBoxDocumentSession: () => ({
    session: sessionRef.current,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../src/hooks/useBoxLayoutDefinition', () => ({
  useBoxLayoutDefinition: () => ({
    layoutDefinition: {
      layoutType: 'chips.layout.grid',
      displayName: 'Grid Layout',
      defaultConfig: {},
    },
    error: null,
  }),
}));

vi.mock('../../src/services/bridge-client', () => ({
  getChipsClient: () => ({
    box: {
      normalizeLayoutConfig: vi.fn(async (_layoutType: string, input: Record<string, unknown>) => input),
      editorPanel: {
        render: vi.fn(async () => ({
          frame: document.createElement('iframe'),
          origin: 'file://',
          dispose: vi.fn(async () => undefined),
        })),
        onReady: vi.fn(() => () => undefined),
        onChange: vi.fn(() => () => undefined),
        onError: vi.fn(() => () => undefined),
      },
    },
    platform: {
      openFile: vi.fn(async () => []),
    },
  }),
}));

vi.mock('../../src/services/box-document-service', () => ({
  boxDocumentService: {
    updateLayoutConfig: vi.fn(),
    readBoxAsset: vi.fn(),
    importBoxAsset: vi.fn(),
    deleteBoxAsset: vi.fn(),
    moveEntryToIndex: serviceMocks.moveEntryToIndex,
    removeEntry: serviceMocks.removeEntry,
    importDocumentFiles: serviceMocks.importDocumentFiles,
  },
}));

describe('BoxEditorPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    serviceMocks.moveEntryToIndex.mockClear();
    serviceMocks.removeEntry.mockClear();
    serviceMocks.importDocumentFiles.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderPanel(tab: 'config' | 'content' = 'content') {
    await act(async () => {
      root.render(
        <BoxEditorPanel
          boxId="box-1"
          boxPath="/workspace/demo.box"
        />,
      );
      await Promise.resolve();
    });

    if (tab === 'content') {
      await act(async () => {
        (container.querySelector('[data-testid="tab-content"]') as HTMLButtonElement).click();
        await Promise.resolve();
      });
    }
  }

  it('mounts the layout editor in a dedicated fill container for the config tab', async () => {
    await renderPanel('config');

    expect(container.querySelector('.box-editor-panel__tab-content--layout')).not.toBeNull();
    expect(container.querySelector('.box-editor-panel__layout-slot')).not.toBeNull();
    const frame = container.querySelector('.box-editor-panel__layout-editor iframe') as HTMLIFrameElement | null;
    expect(frame).not.toBeNull();
    expect(frame?.style.width).toBe('100%');
    expect(frame?.style.height).toBe('100%');
  });

  it('shows entry titles only in the content list', async () => {
    await renderPanel();

    const titles = Array.from(container.querySelectorAll('.box-editor-panel__entry-title')).map((node) => node.textContent);
    expect(titles).toEqual(['第一张卡片', '第二张卡片']);
    expect(container.textContent).not.toContain('/workspace/first.card');
    expect(container.textContent).not.toContain('box_editor.tail_drop_hint');
    expect(container.querySelector('.box-editor-panel__entry-location')).toBeNull();
  });

  it('reorders entries by dragging the list handle', async () => {
    await renderPanel();

    const rows = Array.from(container.querySelectorAll('.box-editor-panel__entry')) as HTMLDivElement[];
    const handles = Array.from(container.querySelectorAll('.box-editor-panel__drag-handle')) as HTMLButtonElement[];
    if (rows.length < 2 || handles.length < 2) {
      throw new Error('未找到箱子内容列表拖拽测试所需条目');
    }

    rows[0].getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      width: 320,
      height: 44,
      top: 0,
      left: 0,
      right: 320,
      bottom: 44,
      toJSON: () => ({}),
    });
    rows[1].getBoundingClientRect = () => ({
      x: 0,
      y: 56,
      width: 320,
      height: 44,
      top: 56,
      left: 0,
      right: 320,
      bottom: 100,
      toJSON: () => ({}),
    });

    const PointerCtor = window.PointerEvent ?? window.MouseEvent;

    await act(async () => {
      handles[0].dispatchEvent(new PointerCtor('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 18,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
      }));

      window.dispatchEvent(new PointerCtor('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 32,
        clientY: 92,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
      }));

      window.dispatchEvent(new PointerCtor('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: 32,
        clientY: 92,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
      }));

      await Promise.resolve();
    });

    expect(serviceMocks.moveEntryToIndex).toHaveBeenCalledWith('box-1', 'entry-1', 1);
  });
});

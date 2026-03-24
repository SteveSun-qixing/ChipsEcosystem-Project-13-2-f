// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoxWindow } from '../../src/components/BoxWindow/BoxWindow';

const mockState = vi.hoisted(() => {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  const session = {
    boxId: 'box1234567',
    boxFile: '/workspace/demo.box',
    workspaceDir: '/workspace/.chips-editing-engine/box-sessions/session-box',
    metadata: {
      chipStandardsVersion: '1.0.0',
      boxId: 'box1234567',
      name: 'Demo Box',
      createdAt: '2026-03-24T00:00:00.000Z',
      modifiedAt: '2026-03-24T00:00:00.000Z',
      activeLayoutType: 'chips.layout.grid',
    },
    content: {
      activeLayoutType: 'chips.layout.grid',
      layoutConfigs: {
        'chips.layout.grid': {
          schemaVersion: '1.0.0',
          props: {
            columnCount: 4,
            gap: 16,
          },
          assetRefs: [],
        },
      },
    },
    entries: [
      {
        entryId: 'entry000001',
        url: 'file:///workspace/demo.card',
        enabled: true,
        snapshot: {
          title: 'Demo Card',
          summary: 'Demo Summary',
          cover: {
            mode: 'none',
          },
        },
        layoutHints: {},
      },
    ],
    assets: [],
    isDirty: false,
    isSaving: false,
    lastSavedAt: '2026-03-24T00:00:00.000Z',
  };

  const emit = () => {
    for (const handler of listeners.get(`session:${session.boxId}`) ?? []) {
      handler({ ...session, entries: [...session.entries] });
    }
  };

  return {
    listeners,
    session,
    emit,
    renderEditor: vi.fn(() => () => undefined),
    renderView: vi.fn(() => () => undefined),
    onClose: vi.fn(),
    onFocus: vi.fn(),
    onUpdateConfig: vi.fn(),
    saveBox: vi.fn(async () => {
      session.isDirty = false;
      session.isSaving = false;
      emit();
      return { ...session, entries: [...session.entries] };
    }),
  };
});

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/services/bridge-client', () => ({
  getChipsClient: () => ({ plugin: { query: vi.fn(async () => []) } }),
}));

vi.mock('../../src/services/workspace-service', () => ({
  workspaceService: {
    getState: () => ({
      rootPath: '/workspace',
    }),
  },
}));

vi.mock('../../src/components/CardWindowBase/CardWindowBase', () => ({
  CardWindowBase: ({ children, headerSlot }: { children: React.ReactNode; headerSlot?: React.ReactNode }) => (
    <div>
      <div>{headerSlot}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('../../src/services/box-document-service', () => ({
  boxDocumentService: {
    getSession: vi.fn(() => ({ ...mockState.session, entries: [...mockState.session.entries] })),
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      const handlers = mockState.listeners.get(event) ?? new Set<(payload: unknown) => void>();
      handlers.add(handler);
      mockState.listeners.set(event, handlers);
    }),
    off: vi.fn((event: string, handler: (payload: unknown) => void) => {
      mockState.listeners.get(event)?.delete(handler);
    }),
    openBox: vi.fn(async () => ({ ...mockState.session, entries: [...mockState.session.entries] })),
    closeBox: vi.fn(async () => undefined),
    saveBox: mockState.saveBox,
    readBoxAsset: vi.fn(async (assetPath: string) => ({
      resourceUrl: `file:///workspace/${assetPath}`,
      mimeType: 'image/webp',
    })),
    importBoxAsset: vi.fn(async () => ({ assetPath: 'assets/layouts/grid/bg.webp' })),
    deleteBoxAsset: vi.fn(async () => undefined),
    updateLayoutConfig: vi.fn((_boxId: string, _layoutType: string, next: Record<string, unknown>) => {
      mockState.session.content.layoutConfigs['chips.layout.grid'] = next as never;
      mockState.session.isDirty = true;
      mockState.emit();
      return { ...mockState.session, entries: [...mockState.session.entries] };
    }),
    addEntry: vi.fn((_boxId: string, url: string) => {
      mockState.session.entries = [
        ...mockState.session.entries,
        {
          entryId: `entry-${mockState.session.entries.length + 1}`,
          url,
          enabled: true,
          snapshot: {
            title: url,
            summary: url,
            cover: {
              mode: 'none',
            },
          },
          layoutHints: {},
        },
      ];
      mockState.session.isDirty = true;
      mockState.emit();
      return { ...mockState.session, entries: [...mockState.session.entries] };
    }),
    updateEntry: vi.fn((_boxId: string, entryId: string, patch: Record<string, unknown>) => {
      mockState.session.entries = mockState.session.entries.map((entry) =>
        entry.entryId === entryId ? { ...entry, ...patch } : entry
      );
      mockState.session.isDirty = true;
      mockState.emit();
      return { ...mockState.session, entries: [...mockState.session.entries] };
    }),
    moveEntry: vi.fn(),
    removeEntry: vi.fn(),
  },
}));

vi.mock('chips-box-layout-host', () => ({
  loadLayoutDefinition: vi.fn(async () => ({
    pluginId: 'chips.layout.grid',
    layoutType: 'chips.layout.grid',
    displayName: '网格布局',
    createDefaultConfig: () => ({
      schemaVersion: '1.0.0',
      props: {
        columnCount: 4,
        gap: 16,
      },
      assetRefs: [],
    }),
    normalizeConfig: (input: Record<string, unknown>) => input,
    validateConfig: () => ({
      valid: true,
      errors: {},
    }),
    renderEditor: mockState.renderEditor,
    renderView: mockState.renderView,
  })),
  createInMemoryBoxLayoutRuntime: vi.fn(() => ({
    listEntries: vi.fn(),
    readEntryDetail: vi.fn(),
    resolveEntryResource: vi.fn(),
    readBoxAsset: vi.fn(),
    prefetchEntries: vi.fn(),
  })),
}));

describe('编辑引擎箱子编辑链路基础流程', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
    mockState.listeners.clear();
    mockState.session.entries = [
      {
        entryId: 'entry000001',
        url: 'file:///workspace/demo.card',
        enabled: true,
        snapshot: {
          title: 'Demo Card',
          summary: 'Demo Summary',
          cover: {
            mode: 'none',
          },
        },
        layoutHints: {},
      },
    ];
    mockState.session.isDirty = false;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('会加载箱子会话、挂载布局编辑与预览，并支持新增条目后保存', async () => {
    await act(async () => {
      root.render(
        <BoxWindow
          config={{
            id: 'box-window-1',
            type: 'box',
            title: 'Demo Box',
            boxId: 'box1234567',
            boxPath: '/workspace/demo.box',
            position: { x: 0, y: 0 },
            size: { width: 1200, height: 800 },
            state: 'normal',
            zIndex: 1,
          }}
          onUpdateConfig={mockState.onUpdateConfig}
          onClose={mockState.onClose}
          onFocus={mockState.onFocus}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.renderEditor).toHaveBeenCalled();
    expect(mockState.renderView).toHaveBeenCalled();
    expect(container.querySelectorAll('input[type="text"]').length).toBeGreaterThan(0);

    const inputs = container.querySelectorAll('input[type="text"]');
    const addUrlInput = Array.from(inputs).find((input) => input.getAttribute('placeholder') === 'box_window.entry_url_placeholder');
    expect(addUrlInput).toBeTruthy();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(addUrlInput, 'https://example.com/new-entry');
      addUrlInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const addButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'box_window.add_entry');
    expect(addButton).toBeTruthy();

    await act(async () => {
      addButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.session.entries).toHaveLength(2);
    expect(mockState.session.entries[1]?.url).toBe('https://example.com/new-entry');

    const saveButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'box_window.save');
    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockState.saveBox).toHaveBeenCalledWith('box1234567');
  });
});

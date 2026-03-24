// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoxWindow } from '../../src/components/BoxWindow';

const mockState = vi.hoisted(() => {
  const inspect = vi.fn(async () => ({
    metadata: {
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
  }));
  const openView = vi.fn(async () => ({
    sessionId: 'session-box-1',
    box: {
      boxId: 'box1234567',
      boxFile: '/tmp/demo.box',
      name: 'Demo Box',
      activeLayoutType: 'chips.layout.grid',
      availableLayouts: ['chips.layout.grid'],
      capabilities: {
        listEntries: true,
        readEntryDetail: true,
        resolveEntryResource: true,
        readBoxAsset: true,
        prefetchEntries: true,
      },
    },
    initialView: {
      items: [
        {
          entryId: 'entry000001',
          url: 'https://example.com/demo',
          enabled: true,
          snapshot: {
            title: 'Demo Entry',
            summary: 'Demo Summary',
            cover: {
              mode: 'none',
            },
          },
        },
      ],
      total: 1,
    },
  }));
  const closeView = vi.fn(async () => undefined);

  const renderView = vi.fn(() => {
    return () => undefined;
  });

  return {
    client: {
      box: {
        inspect,
        openView,
        closeView,
      },
    },
    renderView,
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
      getInitialQuery: () => ({
        limit: 24,
      }),
      renderView,
    })),
    createBoxLayoutRuntime: vi.fn(() => ({
      listEntries: vi.fn(),
      readEntryDetail: vi.fn(),
      resolveEntryResource: vi.fn(),
      readBoxAsset: vi.fn(),
      prefetchEntries: vi.fn(),
    })),
    logger: {
      info: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock('../../src/hooks/useChipsClient', () => ({
  useChipsClient: () => mockState.client,
}));

vi.mock('../../src/box-runtime/layout-loader', () => ({
  loadLayoutDefinition: mockState.loadLayoutDefinition,
  createBoxLayoutRuntime: mockState.createBoxLayoutRuntime,
}));

vi.mock('../../config/logging', () => ({
  createScopedLogger: () => mockState.logger,
}));

describe('箱子查看器端到端基础流程', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('会通过 inspect -> 加载布局插件 -> openView -> renderView 完成箱子查看链路，并在卸载时关闭会话', async () => {
    await act(async () => {
      root.render(
        <BoxWindow
          boxFile="/tmp/demo.box"
          traceId="trace-box-view"
          locale="zh-CN"
          loadingLabel="正在加载箱子布局…"
          containerErrorLabel="容器不可用"
          renderErrorFallback="渲染失败"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.client.box.inspect).toHaveBeenCalledWith('/tmp/demo.box');
    expect(mockState.loadLayoutDefinition).toHaveBeenCalledWith(mockState.client, 'chips.layout.grid');
    expect(mockState.client.box.openView).toHaveBeenCalledWith('/tmp/demo.box', {
      layoutType: 'chips.layout.grid',
      initialQuery: {
        limit: 24,
      },
    });
    expect(mockState.createBoxLayoutRuntime).toHaveBeenCalledWith(mockState.client, 'session-box-1');
    expect(mockState.renderView).toHaveBeenCalledTimes(1);
    expect(mockState.renderView.mock.calls[0]?.[0]).toMatchObject({
      sessionId: 'session-box-1',
      locale: 'zh-CN',
    });

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });

    expect(mockState.client.box.closeView).toHaveBeenCalledWith('session-box-1');
  });
});

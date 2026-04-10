// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardWindow } from '../../src/components/CardWindow';

const mockState = vi.hoisted(() => {
  const dispose = vi.fn(async () => undefined);
  const render = vi.fn(async () => ({
    frame: document.createElement('iframe'),
    origin: 'file://',
    dispose,
    documentType: 'box' as const,
  }));

  return {
    client: {
      document: {
        detectType: vi.fn((filePath: string) => filePath.endsWith('.box') ? 'box' : 'card'),
        window: {
          render,
          onReady: vi.fn((_frame: HTMLIFrameElement, handler: () => void) => {
            handler();
            return () => undefined;
          }),
          onError: vi.fn(() => () => undefined),
          onResourceOpen: vi.fn(() => () => undefined),
        },
      },
      resource: {
        open: vi.fn(async () => undefined),
      },
      platform: {
        showMessage: vi.fn(async () => undefined),
      },
    },
    logger: {
      info: vi.fn(),
      error: vi.fn(),
    },
    dispose,
  };
});

vi.mock('../../src/hooks/useChipsClient', () => ({
  useChipsClient: () => mockState.client,
}));

vi.mock('@chips/component-library', async () => {
  const actual = await vi.importActual('@chips/component-library');
  return {
    ...actual,
    useThemeRuntime: () => ({
      cacheKey: 'theme-cache',
    }),
  };
});

vi.mock('../../config/logging', () => ({
  createScopedLogger: () => mockState.logger,
}));

describe('统一文档查看窗口基础流程', () => {
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

  it('会通过统一 document.window.render 渲染箱子文档，并在卸载时释放 iframe 会话', async () => {
    await act(async () => {
      root.render(
        <CardWindow
          filePath="/tmp/demo.box"
          traceId="trace-document-view"
          locale="zh-CN"
          loadingLabel="正在加载文档…"
          containerErrorLabel="容器不可用"
          fatalErrorFallback="严重错误"
          renderErrorFallback="渲染失败"
          resourceOpenErrorTitle="无法打开资源"
          resourceOpenErrorFallback="资源打开失败"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.client.document.window.render).toHaveBeenCalledWith({
      filePath: '/tmp/demo.box',
      locale: 'zh-CN',
      mode: 'view',
    });

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });

    expect(mockState.dispose).toHaveBeenCalled();
  });
});

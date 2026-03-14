// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PluginHost } from '../../src/components/EditPanel/PluginHost';

const editorPanelApi = {
  render: vi.fn(async () => ({
    frame: document.createElement('iframe'),
    origin: 'http://localhost',
  })),
  onReady: vi.fn((_frame: HTMLIFrameElement, handler: () => void) => {
    handler();
    return () => {};
  }),
  onChange: vi.fn(() => () => {}),
  onError: vi.fn(() => () => {}),
};

vi.mock('../../src/services/bridge-client', () => ({
  getChipsClient: () => ({
    card: {
      editorPanel: editorPanelApi,
    },
  }),
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PluginHost', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    editorPanelApi.render.mockClear();
    editorPanelApi.onReady.mockClear();
    editorPanelApi.onChange.mockClear();
    editorPanelApi.onError.mockClear();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('debounces rapid editor change events before updating card state', async () => {
    vi.useFakeTimers();

    let changeHandler:
      | ((payload: { config: Record<string, unknown> }) => void)
      | undefined;

    editorPanelApi.onChange.mockImplementation((_frame, handler) => {
      changeHandler = handler;
      return () => {};
    });

    const onConfigChange = vi.fn();

    await act(async () => {
      root.render(
        <PluginHost
          cardType="RichTextCard"
          baseCardId="base-1"
          config={{ id: 'base-1', body: '<p>init</p>' }}
          onConfigChange={onConfigChange}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      changeHandler?.({ config: { id: 'base-1', body: '<p>a</p>' } });
      changeHandler?.({ config: { id: 'base-1', body: '<p>ab</p>' } });
      vi.advanceTimersByTime(259);
      await Promise.resolve();
    });

    expect(onConfigChange).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(onConfigChange).toHaveBeenCalledTimes(1);
    expect(onConfigChange).toHaveBeenLastCalledWith({
      id: 'base-1',
      body: '<p>ab</p>',
    });
  });

  it('flushes the last pending editor change before unmount', async () => {
    vi.useFakeTimers();

    let changeHandler:
      | ((payload: { config: Record<string, unknown> }) => void)
      | undefined;

    editorPanelApi.onChange.mockImplementation((_frame, handler) => {
      changeHandler = handler;
      return () => {};
    });

    const onConfigChange = vi.fn();

    await act(async () => {
      root.render(
        <PluginHost
          cardType="RichTextCard"
          baseCardId="base-1"
          config={{ id: 'base-1', body: '<p>init</p>' }}
          onConfigChange={onConfigChange}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      changeHandler?.({ config: { id: 'base-1', body: '<p>final</p>' } });
      await Promise.resolve();
    });

    expect(onConfigChange).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });

    expect(onConfigChange).toHaveBeenCalledTimes(1);
    expect(onConfigChange).toHaveBeenCalledWith({
      id: 'base-1',
      body: '<p>final</p>',
    });
  });

  it('keeps the mounted editor iframe stable when only config props change', async () => {
    await act(async () => {
      root.render(
        <PluginHost
          cardId="card-1"
          cardType="RichTextCard"
          baseCardId="base-1"
          config={{ id: 'base-1', body: '<p>init</p>' }}
        />,
      );
      await Promise.resolve();
    });

    expect(editorPanelApi.render).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(
        <PluginHost
          cardId="card-1"
          cardType="RichTextCard"
          baseCardId="base-1"
          config={{ id: 'base-1', body: '<p>updated</p>' }}
        />,
      );
      await Promise.resolve();
    });

    expect(editorPanelApi.render).toHaveBeenCalledTimes(1);
  });
});

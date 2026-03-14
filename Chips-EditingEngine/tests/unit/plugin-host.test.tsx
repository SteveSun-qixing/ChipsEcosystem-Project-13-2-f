// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorRuntimeProvider } from '../../src/editor-runtime/context';
import { PluginHost } from '../../src/components/EditPanel/PluginHost';

const mockRenderEditor = vi.fn();
let editorChangeHandler: ((nextConfig: Record<string, unknown>) => void) | null = null;

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
    renderView: () => () => undefined,
    renderEditor: mockRenderEditor,
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

    editorChangeHandler = null;
    mockRenderEditor.mockReset();
    mockRenderEditor.mockImplementation(({ onChange }) => {
      editorChangeHandler = onChange;
      return () => undefined;
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('debounces rapid editor changes before committing card config updates', async () => {
    vi.useFakeTimers();
    const onConfigChange = vi.fn();

    await act(async () => {
      root.render(
        <EditorRuntimeProvider>
          <PluginHost
            cardId="card-1"
            cardType="RichTextCard"
            baseCardId="base-1"
            config={{ id: 'base-1', body: '<p>init</p>' }}
            onConfigChange={onConfigChange}
          />
        </EditorRuntimeProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      editorChangeHandler?.({ id: 'base-1', body: '<p>a</p>' });
      editorChangeHandler?.({ id: 'base-1', body: '<p>ab</p>' });
      await Promise.resolve();
    });

    await act(async () => {
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

  it('flushes the last pending editor draft before unmount', async () => {
    vi.useFakeTimers();
    const onConfigChange = vi.fn();

    await act(async () => {
      root.render(
        <EditorRuntimeProvider>
          <PluginHost
            cardId="card-1"
            cardType="RichTextCard"
            baseCardId="base-1"
            config={{ id: 'base-1', body: '<p>init</p>' }}
            onConfigChange={onConfigChange}
          />
        </EditorRuntimeProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      editorChangeHandler?.({ id: 'base-1', body: '<p>final</p>' });
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

  it('keeps the mounted editor stable when its own committed config is reflected back through props', async () => {
    vi.useFakeTimers();
    const onConfigChange = vi.fn();

    await act(async () => {
      root.render(
        <EditorRuntimeProvider>
          <PluginHost
            cardId="card-1"
            cardType="RichTextCard"
            baseCardId="base-1"
            config={{ id: 'base-1', body: '<p>init</p>' }}
            onConfigChange={onConfigChange}
          />
        </EditorRuntimeProvider>,
      );
      await Promise.resolve();
    });

    expect(mockRenderEditor).toHaveBeenCalledTimes(1);

    await act(async () => {
      editorChangeHandler?.({ id: 'base-1', body: '<p>updated</p>' });
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(260);
      await Promise.resolve();
    });

    expect(onConfigChange).toHaveBeenCalledWith({
      id: 'base-1',
      body: '<p>updated</p>',
    });

    await act(async () => {
      root.render(
        <EditorRuntimeProvider>
          <PluginHost
            cardId="card-1"
            cardType="RichTextCard"
            baseCardId="base-1"
            config={{ id: 'base-1', body: '<p>updated</p>' }}
            onConfigChange={onConfigChange}
          />
        </EditorRuntimeProvider>,
      );
      await Promise.resolve();
    });

    expect(mockRenderEditor).toHaveBeenCalledTimes(1);
  });
});

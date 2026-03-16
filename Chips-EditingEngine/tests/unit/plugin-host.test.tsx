// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorRuntimeProvider } from '../../src/editor-runtime/context';
import { PluginHost } from '../../src/components/EditPanel/PluginHost';

const mockRenderEditor = vi.fn();
let editorChangeHandler: ((nextConfig: Record<string, unknown>) => void) | null = null;
let editorImportResource:
  | ((input: { file: File; preferredPath?: string }) => Promise<{ path: string }>)
  | null = null;

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

vi.mock('../../src/services/file-service', () => ({
  fileService: {
    readBinary: vi.fn(async () => new Uint8Array([1, 2, 3])),
    exists: vi.fn(async () => false),
  },
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
    editorImportResource = null;
    mockRenderEditor.mockReset();
    mockRenderEditor.mockImplementation(({ onChange, importResource }) => {
      editorChangeHandler = onChange;
      editorImportResource = importResource;
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
            cardPath="/workspace/card-1.card"
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
    expect(onConfigChange).toHaveBeenLastCalledWith(
      {
        id: 'base-1',
        body: '<p>ab</p>',
      },
      undefined,
    );
  });

  it('flushes the last pending editor draft before unmount', async () => {
    vi.useFakeTimers();
    const onConfigChange = vi.fn();

    await act(async () => {
      root.render(
        <EditorRuntimeProvider>
          <PluginHost
            cardId="card-1"
            cardPath="/workspace/card-1.card"
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
    expect(onConfigChange).toHaveBeenCalledWith(
      {
        id: 'base-1',
        body: '<p>final</p>',
      },
      undefined,
    );
  });

  it('commits immediately after a draft starts referencing newly imported resources', async () => {
    vi.useFakeTimers();
    const onConfigChange = vi.fn();

    await act(async () => {
      root.render(
        <EditorRuntimeProvider>
          <PluginHost
            cardId="card-1"
            cardPath="/workspace/card-1.card"
            cardType="ImageCard"
            baseCardId="base-1"
            config={{ id: 'base-1', images: [] }}
            onConfigChange={onConfigChange}
          />
        </EditorRuntimeProvider>,
      );
      await Promise.resolve();
    });

    const file = new File(['image'], 'photo.png', { type: 'image/png' });

    await act(async () => {
      const imported = await editorImportResource?.({
        file,
        preferredPath: 'photo.png',
      });
      editorChangeHandler?.({
        id: 'base-1',
        images: [
          {
            id: 'image-1',
            source: 'file',
            file_path: imported?.path ?? 'photo.png',
          },
        ],
      });
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(onConfigChange).toHaveBeenCalledTimes(1);
    expect(onConfigChange).toHaveBeenCalledWith(
      {
        id: 'base-1',
        images: [
          {
            id: 'image-1',
            source: 'file',
            file_path: 'photo.png',
          },
        ],
      },
      {
        imports: [
          expect.objectContaining({
            path: 'photo.png',
            mimeType: 'image/png',
          }),
        ],
        deletions: [],
      },
    );
  });

  it('keeps the mounted editor stable when its own committed config is reflected back through props', async () => {
    vi.useFakeTimers();
    const onConfigChange = vi.fn();

    await act(async () => {
      root.render(
        <EditorRuntimeProvider>
          <PluginHost
            cardId="card-1"
            cardPath="/workspace/card-1.card"
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

    expect(onConfigChange).toHaveBeenCalledWith(
      {
        id: 'base-1',
        body: '<p>updated</p>',
      },
      undefined,
    );

    await act(async () => {
      root.render(
        <EditorRuntimeProvider>
          <PluginHost
            cardId="card-1"
            cardPath="/workspace/card-1.card"
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

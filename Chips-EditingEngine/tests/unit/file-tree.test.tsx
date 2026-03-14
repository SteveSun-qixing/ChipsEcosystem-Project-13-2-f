// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileTree } from '../../src/components/FileManager/FileTree';
import type { WorkspaceFile } from '../../src/types/workspace';

vi.mock('@chips/component-library', () => ({
  ChipsInput: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function MockChipsInput(props, ref) {
      return <input ref={ref} {...props} />;
    },
  ),
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('FileTree', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('uses workspace root depth instead of absolute path depth for indentation', async () => {
    const files: WorkspaceFile[] = [
      {
        id: 'folder-1',
        name: 'folder',
        path: '/Users/sevenstars/Documents/Workspace/folder',
        type: 'folder',
        createdAt: '2026-03-14T00:00:00.000Z',
        modifiedAt: '2026-03-14T00:00:00.000Z',
        expanded: true,
        children: [
          {
            id: 'card-1',
            name: 'demo.card',
            path: '/Users/sevenstars/Documents/Workspace/folder/demo.card',
            type: 'card',
            createdAt: '2026-03-14T00:00:00.000Z',
            modifiedAt: '2026-03-14T00:00:00.000Z',
          },
        ],
      },
    ];

    await act(async () => {
      root.render(
        <FileTree
          files={files}
          rootPath="/Users/sevenstars/Documents/Workspace"
          selectedPaths={[]}
          renamingPath={null}
          searchQuery=""
          onSelect={() => undefined}
          onOpen={() => undefined}
          onContextMenu={() => undefined}
          onToggle={() => undefined}
          onRename={() => undefined}
          onRenameCancel={() => undefined}
          onDragStart={() => undefined}
        />,
      );
    });

    const items = Array.from(container.querySelectorAll('.file-item')) as HTMLDivElement[];
    expect(items).toHaveLength(2);
    expect(items[0]?.style.paddingLeft).toBe('8px');
    expect(items[1]?.style.paddingLeft).toBe('24px');
  });
});

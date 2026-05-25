// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileManager from '../../src/components/FileManager/FileManager';
import { CHIPS_DRAG_DATA_TYPE } from '../../src/components/CardBoxLibrary/types';
import type { WorkspaceFile } from '../../src/types/workspace';

const { commandContextMock, workspaceServiceMock } = vi.hoisted(() => {
  const commandViews = [
    {
      commandId: 'chips-official.editing-engine.file.new-card',
      titleKey: 'commands.file.new_card.title',
      handlerId: 'editing-engine:file.new-card',
      toolbarPlacement: [{ toolbarId: 'file-manager', groupId: 'create', order: 10 }],
      menuPlacement: [{ menuId: 'workspace-file', groupId: 'create', order: 10 }],
      state: { enabled: true, visible: true },
      diagnostic: { visible: true, enabled: true, checked: false },
    },
    {
      commandId: 'chips-official.editing-engine.file.open',
      titleKey: 'commands.file.open.title',
      handlerId: 'editing-engine:file.open',
      menuPlacement: [{ menuId: 'workspace-file', groupId: 'open', order: 10 }],
      state: { enabled: true, visible: true },
      diagnostic: { visible: true, enabled: true, checked: false },
    },
    {
      commandId: 'chips-official.editing-engine.search.workspace',
      titleKey: 'commands.search.workspace.title',
      handlerId: 'editing-engine:search.workspace',
      toolbarPlacement: [{ toolbarId: 'file-manager', groupId: 'view', order: 20 }],
      state: { enabled: true, visible: true },
      diagnostic: { visible: true, enabled: true, checked: false },
    },
  ];

  const files: WorkspaceFile[] = [
    {
      id: 'card-1',
      name: 'demo.card',
      path: '/workspace/demo.card',
      type: 'card',
      createdAt: '2026-03-14T00:00:00.000Z',
      modifiedAt: '2026-03-14T00:00:00.000Z',
    },
  ];

  return {
    workspaceServiceMock: {
      isInitialized: vi.fn(() => true),
      initialize: vi.fn(async () => undefined),
      getFiles: vi.fn(() => files),
      getState: vi.fn(() => ({ rootPath: '/workspace' })),
      on: vi.fn(),
      off: vi.fn(),
      openFile: vi.fn(),
      renameFile: vi.fn(),
      createCard: vi.fn(),
      createBox: vi.fn(),
      deleteFile: vi.fn(),
      refresh: vi.fn(),
    },
    commandContextMock: {
      adapter: {
        listCommands: vi.fn(async () => commandViews),
        invokeCommand: vi.fn(async () => undefined),
      },
      commandViews,
      phase: 'ready',
      errorCode: null,
      invocationContext: {
        pluginId: 'chips-official.editing-engine',
        sceneId: 'scene-workspace',
        surfaceId: 'surface-workspace',
      },
      invokeCommand: vi.fn(async () => undefined),
      registerHandler: vi.fn(() => () => undefined),
      setCommandState: vi.fn(),
      i18n: (key: string) => key,
    },
  };
});

vi.mock('@chips/component-library', () => ({
  ChipsIcon: ({ descriptor }: { descriptor: { name: string } }) => <span data-icon-name={descriptor.name} />,
  ChipsInput: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function MockChipsInput(props, ref) {
      return <input ref={ref} {...props} />;
    },
  ),
  ChipsToolbar: ({
    adapter,
    commands = [],
    toolbarId,
    payload,
    invocationContext,
  }: {
    adapter?: { invokeCommand?: (commandId: string, payload?: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown> };
    commands?: Array<{
      commandId: string;
      titleKey: string;
      toolbarPlacement?: Array<{ toolbarId?: string; order?: number }>;
      state?: { enabled?: boolean };
      diagnostic?: { enabled?: boolean };
    }>;
    toolbarId?: string;
    payload?: Record<string, unknown>;
    invocationContext?: Record<string, unknown>;
  }) => (
    <div role="toolbar" aria-label={toolbarId}>
      {commands
        .filter((command) => command.toolbarPlacement?.some((placement) => placement.toolbarId === toolbarId))
        .map((command) => (
          <button
            key={command.commandId}
            type="button"
            data-command-id={command.commandId}
            disabled={command.state?.enabled === false || command.diagnostic?.enabled === false}
            onClick={() => void adapter?.invokeCommand?.(command.commandId, payload, {
              source: 'toolbar',
              context: invocationContext,
            })}
          >
            {command.titleKey}
          </button>
        ))}
    </div>
  ),
  resolveCommandMenuGroups: (
    commands: Array<{
      commandId: string;
      titleKey: string;
      menuPlacement?: Array<{ menuId?: string; groupId?: string; order?: number }>;
      state?: { enabled?: boolean };
      diagnostic?: { enabled?: boolean };
    }>,
    options: { menuId?: string; i18n?: (key: string) => string } = {},
  ) => {
    const groups = new Map<string, Array<Record<string, unknown>>>();
    commands.forEach((command) => {
      command.menuPlacement
        ?.filter((placement) => placement.menuId === options.menuId)
        .forEach((placement) => {
          const groupId = placement.groupId ?? 'default';
          const items = groups.get(groupId) ?? [];
          items.push({
            ...command,
            label: options.i18n?.(command.titleKey) ?? command.titleKey,
            disabled: command.state?.enabled === false || command.diagnostic?.enabled === false,
            hidden: false,
            checked: false,
            shortcutLabel: '',
            placement,
          });
          groups.set(groupId, items);
        });
    });

    return Array.from(groups.entries()).map(([groupId, items]) => ({ groupId, items }));
  },
}));

vi.mock('../../src/commands/EditingEngineCommandProvider', () => ({
  useEditingEngineCommands: () => commandContextMock,
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../src/services/workspace-service', () => ({
  workspaceService: workspaceServiceMock,
}));

describe('FileManager', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    workspaceServiceMock.isInitialized.mockClear();
    workspaceServiceMock.initialize.mockClear();
    workspaceServiceMock.getFiles.mockClear();
    workspaceServiceMock.getState.mockClear();
    workspaceServiceMock.on.mockClear();
    workspaceServiceMock.off.mockClear();
    workspaceServiceMock.openFile.mockClear();
    commandContextMock.adapter.listCommands.mockClear();
    commandContextMock.adapter.invokeCommand.mockClear();
    commandContextMock.invokeCommand.mockClear();
    commandContextMock.registerHandler.mockClear();
    commandContextMock.setCommandState.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('serializes workspace card drags with the shared Chips drag payload', async () => {
    await act(async () => {
      root.render(<FileManager />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const cardItem = container.querySelector('.file-item') as HTMLDivElement | null;
    expect(cardItem).not.toBeNull();

    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: 'none',
    };
    const dragStartEvent = new Event('dragstart', { bubbles: true, cancelable: true });
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: dataTransfer,
    });

    await act(async () => {
      cardItem?.dispatchEvent(dragStartEvent);
    });

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      CHIPS_DRAG_DATA_TYPE,
      JSON.stringify({
        type: 'workspace-file',
        fileId: 'card-1',
        fileType: 'card',
        filePath: '/workspace/demo.card',
        name: 'demo.card',
      }),
    );
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '/workspace/demo.card');
    expect(dataTransfer.effectAllowed).toBe('copy');
  });
});

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ChipsCommandProvider,
  createCommandAdapter,
  type ChipsCommandAdapter,
  type ChipsCommandProviderProps,
  type ChipsCommandView,
} from '@chips/component-library';
import type { CommandInvocationContext, CommandSource, CommandState } from 'chips-sdk';
import { appConfig } from '../../config/app-config';
import { getCommandManager, type CommandManagerState } from '../core/command-manager';
import { useEditor } from '../context/EditorContext';
import { useUI } from '../context/UIContext';
import { useAppRuntime } from '../runtime/AppRuntimeProvider';
import { DEFAULT_BOX_LAYOUT_TYPE } from '../services/box-document-service';
import { workspaceService } from '../services/workspace-service';
import type { AnyWindowConfig } from '../types/window';
import {
  createCommandInvocationContext,
  createCommandSetStateOptions,
  createEditingEngineCommandStatus,
  createEditingEngineCommandViews,
  EDITING_ENGINE_COMMAND_HANDLER_IDS,
  EDITING_ENGINE_COMMAND_IDS,
  editingEngineCommandDefinitions,
  isEditingEngineCommandHandlerId,
  isEditingEngineCommandId,
  resolveEditingEngineCommandState,
  toErrorCode,
  type EditingEngineCommandHandlerId,
  type EditingEngineCommandId,
  type EditingEngineCommandPhase,
  type EditingEngineCommandRuntimeState,
  type EditingEngineCommandStatus,
} from './editing-engine-commands';

type CommandHandler = (status: EditingEngineCommandStatus) => void | Promise<void>;
type CommandHandlerStack = Map<EditingEngineCommandHandlerId, CommandHandler[]>;

export interface EditingEngineCommandContextValue {
  adapter: ChipsCommandAdapter;
  commandViews: ChipsCommandView[];
  phase: EditingEngineCommandPhase;
  errorCode: string | null;
  invocationContext: CommandInvocationContext;
  invokeCommand(
    commandId: EditingEngineCommandId,
    source: CommandSource,
    payload?: Record<string, unknown>,
    contextPatch?: CommandInvocationContext,
  ): Promise<void>;
  registerHandler(handlerId: EditingEngineCommandHandlerId, handler: CommandHandler): () => void;
  setCommandState(commandId: EditingEngineCommandId, state: CommandState): void;
  i18n: ChipsCommandProviderProps['i18n'];
}

const EditingEngineCommandContext = createContext<EditingEngineCommandContextValue | null>(null);

const DEFAULT_THEME_ID = 'chips-official.default-theme';
const DARK_THEME_ID = 'chips-official.default-dark-theme';

function toCommandManagerState(): CommandManagerState {
  return getCommandManager().getState();
}

function useCommandManagerSnapshot(): CommandManagerState {
  const [state, setState] = useState<CommandManagerState>(() => toCommandManagerState());

  useEffect(() => {
    const manager = getCommandManager();
    setState(manager.getState());
    return manager.subscribe((nextState) => setState(nextState));
  }, []);

  return state;
}

function mergeInvocationContext(
  base: CommandInvocationContext,
  patch?: CommandInvocationContext,
): CommandInvocationContext {
  return {
    ...base,
    ...patch,
  };
}

function createRegistrationDefinitions(runtimeState: EditingEngineCommandRuntimeState) {
  return editingEngineCommandDefinitions.map((definition) => ({
    ...definition,
    state: resolveEditingEngineCommandState(definition, runtimeState),
  }));
}

function resolveNextThemeId(themeId: string): string {
  return themeId.includes('dark') ? DEFAULT_THEME_ID : DARK_THEME_ID;
}

export function useEditingEngineCommands(): EditingEngineCommandContextValue {
  const context = useContext(EditingEngineCommandContext);
  if (!context) {
    throw new Error('useEditingEngineCommands must be used within EditingEngineCommandProvider');
  }

  return context;
}

export interface EditingEngineCommandProviderProps {
  children: ReactNode;
  openSettings: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function EditingEngineCommandProvider({
  children,
  openSettings,
  t,
}: EditingEngineCommandProviderProps): React.ReactElement {
  const runtime = useAppRuntime();
  const editor = useEditor();
  const {
    focusWindow,
    setTheme,
    theme,
    updateWindow,
    windows,
  } = useUI();
  const commandManagerState = useCommandManagerSnapshot();
  const client = runtime.client;
  const adapter = useMemo(() => createCommandAdapter(client), [client]);
  const [phase, setPhase] = useState<EditingEngineCommandPhase>('idle');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const handlersRef = useRef<CommandHandlerStack>(new Map());
  const handledInvocationRef = useRef<string | null>(null);

  const runtimeState = useMemo<EditingEngineCommandRuntimeState>(() => ({
    appReady: editor.state === 'ready',
    canUndo: commandManagerState.canUndo,
    canRedo: commandManagerState.canRedo,
    undoBusy: false,
    redoBusy: false,
    currentLayout: editor.currentLayout,
    themeId: theme,
  }), [
    commandManagerState.canRedo,
    commandManagerState.canUndo,
    editor.currentLayout,
    editor.state,
    theme,
  ]);

  const commandViews = useMemo(() => createEditingEngineCommandViews(runtimeState), [runtimeState]);

  const invocationContext = useMemo(() => createCommandInvocationContext({
    pluginId: appConfig.appId,
    sceneId: runtime.launch.sceneId,
    surfaceId: runtime.launch.surfaceId,
  }), [runtime.launch.sceneId, runtime.launch.surfaceId]);

  const commandSetStateOptions = useMemo(
    () => createCommandSetStateOptions(invocationContext),
    [invocationContext],
  );

  const setCommandState = useCallback((commandId: EditingEngineCommandId, state: CommandState) => {
    void client.command.setState(commandId, state, commandSetStateOptions).catch((error) => {
      setErrorCode(toErrorCode(error));
      setPhase('error');
    });
  }, [client, commandSetStateOptions]);

  const invokeCommand = useCallback(async (
    commandId: EditingEngineCommandId,
    source: CommandSource,
    payload: Record<string, unknown> = {},
    contextPatch?: CommandInvocationContext,
  ) => {
    setErrorCode(null);
    try {
      await client.command.invoke(commandId, payload, {
        source,
        context: mergeInvocationContext(invocationContext, contextPatch),
      });
    } catch (error) {
      setErrorCode(toErrorCode(error));
      setPhase('error');
    }
  }, [client, invocationContext]);

  const registerHandler = useCallback((handlerId: EditingEngineCommandHandlerId, handler: CommandHandler) => {
    const stack = handlersRef.current.get(handlerId) ?? [];
    stack.push(handler);
    handlersRef.current.set(handlerId, stack);

    return () => {
      const current = handlersRef.current.get(handlerId);
      if (!current) {
        return;
      }

      const nextStack = current.filter((item) => item !== handler);
      if (nextStack.length === 0) {
        handlersRef.current.delete(handlerId);
        return;
      }

      handlersRef.current.set(handlerId, nextStack);
    };
  }, []);

  useEffect(() => {
    const unregisterNewCardHandler = registerHandler(
      EDITING_ENGINE_COMMAND_HANDLER_IDS.fileNewCard,
      async () => {
        await workspaceService.createCard(t('file.untitled_card') || '无标题卡片');
      },
    );
    const unregisterNewBoxHandler = registerHandler(
      EDITING_ENGINE_COMMAND_HANDLER_IDS.fileNewBox,
      async () => {
        await workspaceService.createBox(
          t('file.untitled_box') || '无标题盒子',
          DEFAULT_BOX_LAYOUT_TYPE,
        );
      },
    );
    const unregisterRefreshHandler = registerHandler(
      EDITING_ENGINE_COMMAND_HANDLER_IDS.fileRefresh,
      async () => {
        await workspaceService.refresh();
      },
    );
    const unregisterSearchHandler = registerHandler(
      EDITING_ENGINE_COMMAND_HANDLER_IDS.searchWorkspace,
      () => {
        focusToolWindow('FileManager', { windows, updateWindow, focusWindow });
      },
    );
    const unregisterSettingsHandler = registerHandler(
      EDITING_ENGINE_COMMAND_HANDLER_IDS.settingsOpen,
      () => openSettings(),
    );
    const unregisterUndoHandler = registerHandler(
      EDITING_ENGINE_COMMAND_HANDLER_IDS.editUndo,
      async () => {
        await getCommandManager().undo();
      },
    );
    const unregisterRedoHandler = registerHandler(
      EDITING_ENGINE_COMMAND_HANDLER_IDS.editRedo,
      async () => {
        await getCommandManager().redo();
      },
    );
    const unregisterLayoutHandler = registerHandler(
      EDITING_ENGINE_COMMAND_HANDLER_IDS.viewToggleLayout,
      () => {
        editor.setLayout(editor.currentLayout === 'infinite-canvas' ? 'workbench' : 'infinite-canvas');
      },
    );
    const unregisterThemeHandler = registerHandler(
      EDITING_ENGINE_COMMAND_HANDLER_IDS.viewToggleTheme,
      async () => {
        const nextThemeId = resolveNextThemeId(theme);
        await client.theme.apply(nextThemeId);
        setTheme(nextThemeId);
      },
    );

    return () => {
      unregisterNewCardHandler();
      unregisterNewBoxHandler();
      unregisterRefreshHandler();
      unregisterSearchHandler();
      unregisterSettingsHandler();
      unregisterUndoHandler();
      unregisterRedoHandler();
      unregisterLayoutHandler();
      unregisterThemeHandler();
    };
  }, [
    client,
    editor.currentLayout,
    editor.setLayout,
    focusWindow,
    openSettings,
    registerHandler,
    setTheme,
    t,
    theme,
    updateWindow,
    windows,
  ]);

  useEffect(() => {
    const unsubscribeThemeChanged = client.theme.onChanged((payload) => {
      if (payload?.themeId) {
        setTheme(payload.themeId);
      }
    });

    return unsubscribeThemeChanged;
  }, [client, setTheme]);

  useEffect(() => {
    let cancelled = false;
    setPhase('registering');
    setErrorCode(null);

    Promise.all(createRegistrationDefinitions(runtimeState).map((definition) => client.command.register(definition)))
      .then(() => {
        if (!cancelled) {
          setPhase('ready');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPhase('error');
          setErrorCode(toErrorCode(error));
        }
      });

    let offInvoked: () => void = () => undefined;
    try {
      offInvoked = client.command.onInvoked((event) => {
        const status = createEditingEngineCommandStatus(event);
        if (!status) {
          return;
        }

        const invocationKey = status.invocationId ?? `${status.commandId}:${status.source}:${JSON.stringify(status.payload ?? {})}`;
        if (handledInvocationRef.current === invocationKey) {
          return;
        }
        handledInvocationRef.current = invocationKey;

        const handlerStack = handlersRef.current.get(status.handlerId);
        const handler = handlerStack?.[handlerStack.length - 1];
        if (!handler) {
          return;
        }

        void Promise.resolve(handler(status)).catch((error) => {
          setErrorCode(toErrorCode(error));
          setPhase('error');
        });
      });
    } catch (error) {
      if (!cancelled) {
        setPhase('error');
        setErrorCode(toErrorCode(error));
      }
    }

    return () => {
      cancelled = true;
      offInvoked();
      void Promise.all(
        editingEngineCommandDefinitions.map((definition) => client.command.unregister(definition.commandId)),
      ).catch(() => undefined);
    };
  }, [client]);

  useEffect(() => {
    if (phase !== 'ready') {
      return;
    }

    commandViews.forEach((view) => {
      if (!isEditingEngineCommandId(view.commandId)) {
        return;
      }
      void client.command.setState(view.commandId, view.state ?? {}, commandSetStateOptions).catch((error) => {
        setErrorCode(toErrorCode(error));
        setPhase('error');
      });
    });
  }, [client, commandSetStateOptions, commandViews, phase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const commandId = resolveShortcutCommandId(event);
      if (!commandId) {
        return;
      }

      const command = commandViews.find((view) => view.commandId === commandId);
      if (command?.state?.enabled === false || command?.diagnostic?.enabled === false) {
        return;
      }

      event.preventDefault();
      void invokeCommand(commandId, 'shortcut');
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commandViews, invokeCommand]);

  const contextValue = useMemo<EditingEngineCommandContextValue>(() => ({
    adapter,
    commandViews,
    phase,
    errorCode,
    invocationContext,
    invokeCommand,
    registerHandler,
    setCommandState,
    i18n: t,
  }), [
    adapter,
    commandViews,
    errorCode,
    invocationContext,
    invokeCommand,
    phase,
    registerHandler,
    setCommandState,
    t,
  ]);

  return (
    <EditingEngineCommandContext.Provider value={contextValue}>
      <ChipsCommandProvider
        adapter={adapter}
        commands={commandViews}
        i18n={t}
        query={{ includeDisabled: true }}
      >
        {children}
      </ChipsCommandProvider>
    </EditingEngineCommandContext.Provider>
  );
}

function resolveShortcutCommandId(event: KeyboardEvent): EditingEngineCommandId | null {
  const key = event.key.toLowerCase();
  const mod = event.metaKey || event.ctrlKey;

  if (mod && !event.shiftKey && key === 'n') {
    return EDITING_ENGINE_COMMAND_IDS.fileNewCard;
  }
  if (mod && event.shiftKey && key === 'n') {
    return EDITING_ENGINE_COMMAND_IDS.fileNewBox;
  }
  if (mod && !event.shiftKey && key === 'f') {
    return EDITING_ENGINE_COMMAND_IDS.searchWorkspace;
  }
  if (mod && !event.shiftKey && key === 'z') {
    return EDITING_ENGINE_COMMAND_IDS.editUndo;
  }
  if (mod && event.shiftKey && key === 'z') {
    return EDITING_ENGINE_COMMAND_IDS.editRedo;
  }
  if (mod && key === ',') {
    return EDITING_ENGINE_COMMAND_IDS.settingsOpen;
  }

  return null;
}

export function getCommandHandlerIdFromView(command: ChipsCommandView): EditingEngineCommandHandlerId | null {
  const handlerId = command.handlerId;
  return isEditingEngineCommandHandlerId(handlerId) ? handlerId : null;
}

function focusToolWindow(
  component: string,
  runtime: {
    windows: Array<{ id: string; type?: string; component?: string; state?: string }>;
    updateWindow(windowId: string, updates: Partial<AnyWindowConfig>): void;
    focusWindow(windowId: string): void;
  },
): void {
  const toolWindow = runtime.windows.find((window) => window.type === 'tool' && window.component === component);
  if (!toolWindow) {
    return;
  }

  if (toolWindow.state === 'minimized') {
    runtime.updateWindow(toolWindow.id, { state: 'normal' });
  }
  runtime.focusWindow(toolWindow.id);
}

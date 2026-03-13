import React, { useEffect, useState, useCallback, lazy, Suspense, useMemo, useRef } from 'react';
import { ChipsThemeProvider } from '@chips/component-library';
import { AppProviders } from './context';
import { useEditor } from './context/EditorContext';
import { getChipsClient } from './services/bridge-client';
import { i18nService } from './services/i18n-service';
import { InfiniteCanvas } from './layouts/InfiniteCanvas';
import { Workbench } from './layouts/Workbench';
import { Dock } from './components/Dock/Dock';
import { useUI } from './context/UIContext';
import { useCard } from './context/CardContext';
import { useTranslation } from './hooks/useTranslation';
import { workspaceService, type WorkspaceOpenOptions } from './services/workspace-service';
import type { BasicCardConfig } from './core/card-initializer';
import type { DragData } from './components/CardBoxLibrary/types';
import { generateId62 } from './utils/id';
import { setLocale } from './i18n';

const EngineSettingsDialog = lazy(() => import('./components/EngineSettings/EngineSettingsDialog').then(m => ({ default: m.EngineSettingsDialog })));

interface ThemeRuntimeState {
  themeId: string;
  version: string;
}

function createInitialBasicCard(typeId: string): BasicCardConfig {
  const baseCardId = generateId62();

  if (typeId === 'RichTextCard' || typeId === 'base.richtext') {
    return {
      id: baseCardId,
      type: typeId,
      config: {
        id: baseCardId,
        title: '',
        body: '<p></p>',
        locale: 'zh-CN',
      },
    };
  }

  return {
    id: baseCardId,
    type: typeId,
    config: {
      id: baseCardId,
      card_type: typeId,
    },
  };
}

function MainWorkspace() {
  const { currentLayout, setState } = useEditor();
  const { createToolWindow, createCardWindow, updateWindow, windows } = useUI();
  const { openCard } = useCard();
  const { t } = useTranslation();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const hasInitializedRef = useRef(false);

  const openSettings = useCallback(() => {
    setSettingsVisible(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsVisible(false);
  }, []);

  const initDefaultTools = () => {
    if (windows.length > 0) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    createToolWindow('FileManager', {
      component: 'FileManager',
      title: t('app.tool_file_manager'),
      icon: '📁',
      position: { x: 20, y: 20 },
      size: { width: 280, height: 500 },
      closable: false,
    } as any);

    createToolWindow('EditPanel', {
      component: 'EditPanel',
      title: t('app.tool_edit_panel'),
      icon: '✏️',
      position: { x: w - 340, y: 20 },
      size: { width: 320, height: 500 },
      closable: false,
    } as any);

    createToolWindow('CardBoxLibrary', {
      component: 'CardBoxLibrary',
      title: t('app.tool_card_box_library'),
      icon: '📦',
      position: { x: 20, y: h - 350 },
      size: { width: 400, height: 300 },
      closable: false,
    } as any);
  };

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    async function init() {
      try {
        setState('loading');

        getChipsClient();
        await i18nService.initLocale();
        await workspaceService.initialize();
        initDefaultTools();

        setState('ready');
      } catch (e) {
        console.error('[App] Unexpected init error:', e);
        setState('ready');
      }
    }

    init();
  }, [setState, windows.length, t, createToolWindow]);

  useEffect(() => {
    const localizedToolTitles: Record<string, string> = {
      FileManager: t('app.tool_file_manager'),
      EditPanel: t('app.tool_edit_panel'),
      CardBoxLibrary: t('app.tool_card_box_library'),
    };

    windows.forEach((window) => {
      if (window.type !== 'tool') {
        return;
      }
      const nextTitle = localizedToolTitles[window.component];
      if (!nextTitle || window.title === nextTitle) {
        return;
      }
      updateWindow(window.id, { title: nextTitle });
    });
  }, [t, updateWindow, windows]);

  useEffect(() => {
    const handleOpenWorkspaceFile = async (payload: {
      file?: { id?: string; path?: string; type?: string; name?: string };
      openOptions?: WorkspaceOpenOptions;
    }) => {
      const file = payload.file;
      if (!file || file.type !== 'card' || typeof file.id !== 'string' || typeof file.path !== 'string') {
        return;
      }

      await openCard(file.id, file.path);
      const existingWindow = windows.find((window) => window.type === 'card' && window.cardId === file.id);
      if (!existingWindow) {
        createCardWindow(file.id, {
          title: file.name ?? file.path.split('/').pop() ?? file.id,
          isEditing: payload.openOptions?.isEditing ?? true,
          position: payload.openOptions?.windowPosition,
        });
      }
    };

    const handleOpenWorkspaceFileSafe = (payload: {
      file?: { id?: string; path?: string; type?: string; name?: string };
      openOptions?: WorkspaceOpenOptions;
    }) => {
      void handleOpenWorkspaceFile(payload).catch((error) => {
        console.error('[App] Failed to open created/opened workspace card.', {
          file: payload.file,
          error,
        });
      });
    };

    workspaceService.on('workspace:file-opened', handleOpenWorkspaceFileSafe);
    workspaceService.on('workspace:file-created', handleOpenWorkspaceFileSafe);

    return () => {
      workspaceService.off('workspace:file-opened', handleOpenWorkspaceFileSafe);
      workspaceService.off('workspace:file-created', handleOpenWorkspaceFileSafe);
    };
  }, [createCardWindow, openCard, windows]);

  const handleCanvasDropCreate = useCallback(async (
    data: DragData,
    worldPosition: { x: number; y: number },
  ) => {
    if (!workspaceService.getState().rootPath) {
      await workspaceService.initialize();
      if (!workspaceService.getState().rootPath) {
        console.warn('[App] Cannot create card from library drag because Host has not bound a workspace path.');
        return;
      }
    }

    if (data.type === 'card') {
      const cardName = data.name.trim() || (t('common.untitled_card') || '未命名卡片');
      await workspaceService.createCard(
        cardName,
        createInitialBasicCard(data.typeId),
        undefined,
        undefined,
        {
          windowPosition: worldPosition,
          isEditing: true,
        },
      );
      return;
    }

    if (data.type === 'layout') {
      await workspaceService.createBox(data.name.trim() || '未命名盒子', data.typeId);
    }
  }, [t]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {currentLayout === 'infinite-canvas' ? (
          <InfiniteCanvas onDropCreate={handleCanvasDropCreate} />
        ) : (
          <Workbench />
        )}
        <Dock onOpenSettings={openSettings} />
      </div>
      
      {settingsVisible && (
        <Suspense fallback={null}>
          <EngineSettingsDialog
            visible={settingsVisible}
            onClose={closeSettings}
          />
        </Suspense>
      )}
    </div>
  );
}

export function App() {
  const client = useMemo(() => getChipsClient(), []);
  const themeEventSource = useMemo(() => ({
    subscribe(eventName: string, handler: (payload: unknown) => void) {
      return client.events.on(eventName, handler);
    },
  }), [client]);
  const [themeState, setThemeState] = useState<ThemeRuntimeState>({
    themeId: 'chips-official.default-theme',
    version: '0',
  });

  useEffect(() => {
    let active = true;

    const syncInitialRuntimeState = async () => {
      const [themeResult, localeResult] = await Promise.allSettled([
        client.theme.getCurrent(),
        i18nService.initLocale(),
      ]);

      if (!active) {
        return;
      }

      if (themeResult.status === 'fulfilled') {
        setThemeState({
          themeId: themeResult.value.themeId,
          version: themeResult.value.version,
        });
      } else {
        console.warn('[App] Failed to get initial theme:', themeResult.reason);
      }

      if (localeResult.status === 'rejected') {
        console.warn('[App] Failed to initialize locale:', localeResult.reason);
      }
    };
    void syncInitialRuntimeState();

    const unsubscribeTheme = client.events.on<{ themeId?: string }>('theme.changed', async () => {
      try {
        const themeInfo = await client.theme.getCurrent();
        if (!active) {
          return;
        }
        setThemeState({
          themeId: themeInfo.themeId,
          version: themeInfo.version,
        });
      } catch (error) {
        console.warn('[App] Failed to refresh theme runtime state:', error);
      }
    });

    const unsubscribeLanguage = client.events.on<{ locale?: string }>('language.changed', async (payload) => {
      if (typeof payload?.locale === 'string') {
        setLocale(payload.locale);
        return;
      }

      try {
        await i18nService.initLocale();
      } catch (error) {
        console.warn('[App] Failed to refresh locale runtime state:', error);
      }
    });

    return () => {
      active = false;
      unsubscribeTheme();
      unsubscribeLanguage();
    };
  }, [client]);

  return (
    <ChipsThemeProvider
      themeId={themeState.themeId}
      version={themeState.version}
      eventSource={themeEventSource}
      eventName="theme.changed"
    >
      <AppProviders>
        <MainWorkspace />
      </AppProviders>
    </ChipsThemeProvider>
  );
}

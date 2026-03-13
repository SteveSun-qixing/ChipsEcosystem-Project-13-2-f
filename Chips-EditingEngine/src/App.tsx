import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { ChipsThemeProvider } from '@chips/component-library';
import { AppProviders } from './context';
import { useEditor } from './context/EditorContext';
import { getChipsClient } from './services/bridge-client';
import { i18nService } from './services/i18n-service';
import { workspaceService } from './services/workspace-service';
import { InfiniteCanvas } from './layouts/InfiniteCanvas';
import { Workbench } from './layouts/Workbench';
import { Dock } from './components/Dock/Dock';
import { useUI } from './context/UIContext';
import { generateScopedId } from './utils/id';
import { useTranslation } from './hooks/useTranslation';

const EngineSettingsDialog = lazy(() => import('./components/EngineSettings/EngineSettingsDialog').then(m => ({ default: m.EngineSettingsDialog })));

function MainWorkspace() {
  const { currentLayout, setState } = useEditor();
  const { addWindow, windows } = useUI();
  const { t } = useTranslation();
  const [settingsVisible, setSettingsVisible] = useState(false);

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

    addWindow({
      id: generateScopedId('tool'),
      type: 'tool',
      component: 'FileManager',
      title: t('app.tool_file_manager'),
      icon: '📁',
      position: { x: 20, y: 20 },
      size: { width: 280, height: 500 },
      state: 'normal',
      zIndex: 100,
      resizable: true,
      draggable: true,
      closable: false,
      minimizable: true,
    } as any);

    addWindow({
      id: generateScopedId('tool'),
      type: 'tool',
      component: 'EditPanel',
      title: t('app.tool_edit_panel'),
      icon: '✏️',
      position: { x: w - 340, y: 20 },
      size: { width: 320, height: 500 },
      state: 'normal',
      zIndex: 100,
      resizable: true,
      draggable: true,
      closable: false,
      minimizable: true,
    } as any);

    addWindow({
      id: generateScopedId('tool'),
      type: 'tool',
      component: 'CardBoxLibrary',
      title: t('app.tool_card_box_library'),
      icon: '📦',
      position: { x: 20, y: h - 350 },
      size: { width: 400, height: 300 },
      state: 'normal',
      zIndex: 100,
      resizable: true,
      draggable: true,
      closable: false,
      minimizable: true,
    } as any);
  };

  useEffect(() => {
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
  }, [setState, windows.length, t]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {currentLayout === 'infinite-canvas' ? (
          <InfiniteCanvas />
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
  const [themeId, setThemeId] = useState('chips-official.default-theme');

  useEffect(() => {
    const client = getChipsClient();

    client.theme?.getCurrent?.().then(themeInfo => {
      if (themeInfo?.themeId) setThemeId(themeInfo.themeId);
    }).catch(e => console.warn('[App] Failed to get initial theme:', e));

    const handleThemeChange = (payload: any) => {
      if (payload?.themeId) {
        setThemeId(payload.themeId);
      }
    };
    void handleThemeChange;
  }, []);

  return (
    <ChipsThemeProvider themeId={themeId}>
      <AppProviders>
        <MainWorkspace />
      </AppProviders>
    </ChipsThemeProvider>
  );
}

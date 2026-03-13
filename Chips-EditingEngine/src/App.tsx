import React, { useEffect, useState } from 'react';
import { ChipsThemeProvider } from '@chips/component-library';
import { AppProviders } from './context';
import { useEditor } from './context/EditorContext';
import { getChipsClient } from './services/bridge-client';
import { i18nService } from './services/i18n-service';
import { workspaceService } from './services/workspace-service';
import { InfiniteCanvas } from './layouts/InfiniteCanvas';
import { Workbench } from './layouts/Workbench';
import { HeaderBar } from './components/HeaderBar/HeaderBar';
import { Dock } from './components/Dock/Dock';
import { useUI } from './context/UIContext';
import { generateScopedId } from './utils/id';
import { useTranslation } from './hooks/useTranslation';

function MainWorkspace() {
  const { currentLayout, setState } = useEditor();
  const { addWindow, windows } = useUI();
  const { t } = useTranslation();

  const initDefaultTools = () => {
    // Only init if no windows exist
    if (windows.length > 0) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // File Manager
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
    });

    // Edit Panel
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
    });

    // Card Box Library
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
    });
  };

  useEffect(() => {
    async function init() {
      try {
        setState('loading');

        // 1. 初始化 SDK
        getChipsClient();

        // 2. 从 Host 读取系统 locale，初始化本地 i18n
        await i18nService.initLocale();

        // 3. 初始化工作区（不会抛出，失败时进入无工作区状态）
        await workspaceService.initialize();

        // 4. 初始化默认工具窗口
        initDefaultTools();

        setState('ready');
      } catch (e) {
        // 此处不再会被 workspaceService 触发，只有更深层的意外错误才会到达这里
        console.error('[App] Unexpected init error:', e);
        setState('ready'); // 仍然进入 ready 状态，让用户能看到界面
      }
    }

    init();
  }, [setState]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <HeaderBar />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {currentLayout === 'infinite-canvas' ? (
          <InfiniteCanvas />
        ) : (
          <Workbench />
        )}
        <Dock onOpenSettings={() => console.log('Open Settings')} />
      </div>
    </div>
  );
}

export function App() {
  const [themeId, setThemeId] = useState('chips-official.default-theme');

  useEffect(() => {
    const client = getChipsClient();

    // 初始同步主题
    client.theme?.getCurrent?.().then(themeInfo => {
      if (themeInfo?.themeId) setThemeId(themeInfo.themeId);
    }).catch(e => console.warn('[App] Failed to get initial theme:', e));

    // 订阅主题变更（如果 SDK 支持事件）
    const handleThemeChange = (payload: any) => {
      if (payload?.themeId) {
        setThemeId(payload.themeId);
      }
    };
    void handleThemeChange; // 当 SDK 事件 API 就绪时接入
  }, []);

  return (
    <ChipsThemeProvider themeId={themeId}>
      <AppProviders>
        <MainWorkspace />
      </AppProviders>
    </ChipsThemeProvider>
  );
}

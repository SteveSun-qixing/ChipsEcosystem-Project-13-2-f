import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChipsButton } from '@chips/component-library';
import { useTranslation } from '../../hooks/useTranslation';
import { DefaultEditor } from './DefaultEditor';
import './PluginHost.css';

// --- Stubs for internal context managers (Pinia/Stores and Plugin System) ---
// import { useCardStore, useEditorStore } from '@/core/state';
// import { getEditorComponent } from '@/services/plugin-service';
// import { getEditorConnector } from '@/services/sdk-service';

export interface PluginHostProps {
  cardType: string;
  baseCardId: string;
  config: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  onPluginLoaded?: (pluginInfo: any) => void;
  onPluginError?: (error: Error) => void;
}

export function PluginHost({
  cardType,
  baseCardId,
  config,
  onConfigChange,
  onPluginLoaded,
  onPluginError,
}: PluginHostProps) {
  const { t } = useTranslation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  
  // Stubs for Vue state mapping
  const currentPlugin = useRef<any>(null);
  const currentEditorComponent = useRef<React.ComponentType<any> | null>(null);
  const [useDefaultEditor, setUseDefaultEditor] = useState(false);
  
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(config);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  // Mocking the card object logic that would come from a Redux or Context store
  const mockBaseCard = useMemo(() => ({
    id: baseCardId,
    type: cardType,
    config: localConfig,
  }), [baseCardId, cardType, localConfig]);

  const loadPlugin = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Simulate plugin fetching
      // const component = await getEditorComponent(cardType);
      const component = null;

      if (component) {
        currentEditorComponent.current = component;
        setUseDefaultEditor(false);
        onPluginLoaded?.(component);
      } else {
        currentEditorComponent.current = null;
        setUseDefaultEditor(true);
        onPluginLoaded?.(null);
      }
      setLocalConfig({ ...config });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setLoadError(err);
      onPluginError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [cardType, config, onPluginError, onPluginLoaded]);

  useEffect(() => {
    loadPlugin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, baseCardId]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setLocalConfig({ ...config });
    }
  }, [config, hasUnsavedChanges]);

  // Debounced Config Commit
  const debouncedEmitChange = useCallback(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      onConfigChange?.({ ...localConfig });
      setHasUnsavedChanges(false);
    }, 300);
  }, [localConfig, onConfigChange]);

  const handleDefaultConfigChange = (newConfig: Record<string, unknown>) => {
    setLocalConfig(newConfig);
    setHasUnsavedChanges(true);
    debouncedEmitChange();
  };

  const handleReload = () => {
    loadPlugin();
  };

  const showLoading = isLoading;
  const loadingText = t('plugin_host.loading') || '加载中...';
  const errorText = loadError?.message || t('plugin_host.error') || '加载失败';

  return (
    <div className="plugin-host">
      {showLoading && (
        <div className="plugin-host__loading">
          <div className="plugin-host__spinner"></div>
          <span className="plugin-host__loading-text">{loadingText}</span>
        </div>
      )}

      {!showLoading && loadError && (
        <div className="plugin-host__error">
          <div className="plugin-host__error-icon">⚠️</div>
          <p className="plugin-host__error-text">{errorText}</p>
          <ChipsButton
            variant="ghost"
            className="plugin-host__retry-btn"
            onPress={handleReload}
          >
            {t('plugin_host.retry') || '重试'}
          </ChipsButton>
        </div>
      )}

      {/* Renders registered editor component if present */}
      {!isLoading && !loadError && !useDefaultEditor && currentEditorComponent.current && (
        <div className="plugin-host__editor-component">
          <p>Mock Plugin Editor Instance</p>
        </div>
      )}

      {/* Fallback internal editor */}
      {!isLoading && !loadError && useDefaultEditor && (
        <div className="plugin-host__default-editor">
          <DefaultEditor
            baseCard={mockBaseCard}
            mode="form"
            onConfigChange={handleDefaultConfigChange}
          />
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="plugin-host__unsaved-indicator" title={t('plugin_host.unsaved') || '有未保存更改'}>
          <span className="plugin-host__unsaved-dot"></span>
        </div>
      )}
    </div>
  );
}

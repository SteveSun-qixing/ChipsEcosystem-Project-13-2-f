import React, { startTransition, useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { getChipsClient } from '../../services/bridge-client';
import './PluginHost.css';

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
  const clientRef = useRef(getChipsClient());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const latestConfigRef = useRef<Record<string, unknown>>(config);
  const onConfigChangeRef = useRef(onConfigChange);
  const onPluginLoadedRef = useRef(onPluginLoaded);
  const onPluginErrorRef = useRef(onPluginError);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [renderRevision, setRenderRevision] = useState(0);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    onConfigChangeRef.current = onConfigChange;
  }, [onConfigChange]);

  useEffect(() => {
    onPluginLoadedRef.current = onPluginLoaded;
  }, [onPluginLoaded]);

  useEffect(() => {
    onPluginErrorRef.current = onPluginError;
  }, [onPluginError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      const error = new Error('Editor panel container is unavailable.');
      setLoadError(error);
      onPluginErrorRef.current?.(error);
      return;
    }

    let disposed = false;
    const cleanupTasks: Array<() => void> = [];

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    setIsLoading(true);
    setLoadError(null);

    clientRef.current.card.editorPanel.render({
      cardType,
      baseCardId,
      initialConfig: latestConfigRef.current,
    }).then((result) => {
      if (disposed) {
        return;
      }

      const frame = result.frame;
      frameRef.current = frame;
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.border = 'none';
      frame.style.display = 'block';
      frame.style.background = 'transparent';
      container.appendChild(frame);

      const handleNativeLoad = () => {
        if (!disposed) {
          setIsLoading(false);
        }
      };

      frame.addEventListener('load', handleNativeLoad);
      cleanupTasks.push(() => {
        frame.removeEventListener('load', handleNativeLoad);
      });

      cleanupTasks.push(
        clientRef.current.card.editorPanel.onReady(frame, () => {
          if (disposed) {
            return;
          }
          setIsLoading(false);
          setLoadError(null);
          onPluginLoadedRef.current?.({
            cardType,
            baseCardId,
          });
        }),
      );

      cleanupTasks.push(
        clientRef.current.card.editorPanel.onChange(frame, (payload) => {
          if (disposed) {
            return;
          }
          startTransition(() => {
            onConfigChangeRef.current?.(payload.config);
          });
        }),
      );

      cleanupTasks.push(
        clientRef.current.card.editorPanel.onError(frame, (payload) => {
          if (disposed) {
            return;
          }
          const error = new Error(payload.message);
          setIsLoading(false);
          setLoadError(error);
          onPluginErrorRef.current?.(error);
        }),
      );
    }).catch((error: unknown) => {
      if (disposed) {
        return;
      }
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      setIsLoading(false);
      setLoadError(normalizedError);
      onPluginErrorRef.current?.(normalizedError);
    });

    return () => {
      disposed = true;
      cleanupTasks.forEach((cleanup) => cleanup());
      const frame = frameRef.current;
      if (frame && frame.parentElement) {
        frame.parentElement.removeChild(frame);
      }
      frameRef.current = null;
    };
  }, [baseCardId, cardType, renderRevision]);

  const showLoading = isLoading;
  const loadingText = t('plugin_host.loading') || '加载中...';
  const errorText = loadError?.message || t('plugin_host.error') || '加载失败';

  return (
    <div className="plugin-host">
      <div ref={containerRef} className="plugin-host__container" />

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
          <button
            type="button"
            className="plugin-host__retry-btn"
            onClick={() => setRenderRevision((current) => current + 1)}
          >
            {t('plugin_host.retry') || '重试'}
          </button>
        </div>
      )}
    </div>
  );
}

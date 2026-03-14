import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBasecardDescriptor } from '../basecard-runtime/registry';
import { globalEventEmitter } from '../core/event-emitter';
import { useTranslation } from '../hooks/useTranslation';
import type { EditorSessionSnapshot } from './contracts';
import { useEditorRuntime } from './context';

export interface EditorHostProps {
  cardId: string;
  cardType: string;
  baseCardId: string;
  sourceConfig: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  onPluginLoaded?: (pluginInfo: { cardType: string; baseCardId: string }) => void;
  onPluginError?: (error: Error) => void;
}

export function EditorHost({
  cardId,
  cardType,
  baseCardId,
  sourceConfig,
  onConfigChange,
  onPluginLoaded,
  onPluginError,
}: EditorHostProps) {
  const { t } = useTranslation();
  const store = useEditorRuntime();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const descriptor = useMemo(() => getBasecardDescriptor(cardType), [cardType]);
  const sourceSignature = useMemo(() => JSON.stringify(sourceConfig), [sourceConfig]);
  const sessionKey = useMemo(() => store.createKey(cardId, baseCardId), [baseCardId, cardId, store]);

  const [snapshot, setSnapshot] = useState<EditorSessionSnapshot | null>(() => {
    if (!descriptor) {
      return null;
    }

    return store.ensureSession({
      cardId,
      baseCardId,
      cardType: descriptor.cardType,
      sourceConfig,
      descriptor,
    });
  });
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderRevision, setRenderRevision] = useState(0);
  const mountRevision = snapshot?.mountRevision ?? 0;

  const syncSnapshot = useCallback(() => {
    setSnapshot(store.getSnapshot(sessionKey));
  }, [sessionKey, store]);

  useEffect(() => {
    if (!descriptor) {
      setSnapshot(null);
      return;
    }

    const nextSnapshot = store.ensureSession({
      cardId,
      baseCardId,
      cardType: descriptor.cardType,
      sourceConfig,
      descriptor,
    });
    setSnapshot(nextSnapshot);

    return store.subscribe(sessionKey, () => {
      syncSnapshot();
    });
  }, [baseCardId, cardId, cardType, descriptor, sessionKey, sourceConfig, sourceSignature, store, syncSnapshot]);

  const reportEditorActivity = useCallback(() => {
    globalEventEmitter.emit('card:editor-activity', {
      cardId,
      baseCardId,
      cardType,
      at: Date.now(),
    });
  }, [baseCardId, cardId, cardType]);

  const commitSession = useCallback(async () => {
    if (!descriptor || !onConfigChange || !snapshot?.dirty || !snapshot.validation.valid) {
      return;
    }

    await store.commit(sessionKey, descriptor, async (nextConfig) => {
      reportEditorActivity();
      onConfigChange(nextConfig);
    });
  }, [descriptor, onConfigChange, reportEditorActivity, sessionKey, snapshot?.dirty, snapshot?.validation.valid, store]);

  useEffect(() => {
    if (!descriptor || !snapshot?.dirty || !snapshot.validation.valid) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void commitSession().catch((error) => {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        setLoadError(normalizedError);
        onPluginError?.(normalizedError);
      });
    }, snapshot.commitDebounceMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [commitSession, descriptor, onPluginError, snapshot?.commitDebounceMs, snapshot?.dirty, snapshot?.revision, snapshot?.validation.valid]);

  useEffect(() => {
    return () => {
      void commitSession().catch(() => undefined);
    };
  }, [commitSession]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      const error = new Error('Editor panel container is unavailable.');
      setLoadError(error);
      onPluginError?.(error);
      return;
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (!descriptor) {
      const error = new Error(`未注册基础卡片编辑器: ${cardType}`);
      setLoadError(error);
      setIsLoading(false);
      onPluginError?.(error);
      return;
    }

    const activeSnapshot = store.getSnapshot(sessionKey);
    if (!descriptor.renderEditor || !activeSnapshot) {
      const error = new Error(`基础卡片未提供编辑器实现: ${descriptor.cardType}`);
      setLoadError(error);
      setIsLoading(false);
      onPluginError?.(error);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    let disposed = false;
    let cleanup: (() => void) | void;

    try {
      cleanup = descriptor.renderEditor({
        container,
        initialConfig: activeSnapshot.draftConfig,
        onChange(nextConfig) {
          if (disposed) {
            return;
          }

          reportEditorActivity();
          store.updateDraft(sessionKey, descriptor, nextConfig);
        },
      });

      setIsLoading(false);
      onPluginLoaded?.({
        cardType: descriptor.cardType,
        baseCardId,
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      setLoadError(normalizedError);
      setIsLoading(false);
      onPluginError?.(normalizedError);
    }

    return () => {
      disposed = true;
      if (typeof cleanup === 'function') {
        cleanup();
      }

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [
    baseCardId,
    cardType,
    descriptor,
    onPluginError,
    onPluginLoaded,
    renderRevision,
    reportEditorActivity,
    sessionKey,
    mountRevision,
    store,
  ]);

  const errorText = loadError?.message || snapshot?.errorMessage || t('plugin_host.error') || '加载失败';

  return (
    <div className="plugin-host">
      <div ref={containerRef} className="plugin-host__container" />

      {isLoading && (
        <div className="plugin-host__loading">
          <div className="plugin-host__spinner"></div>
          <span className="plugin-host__loading-text">{t('plugin_host.loading') || '加载中...'}</span>
        </div>
      )}

      {!isLoading && (loadError || snapshot?.errorMessage) && (
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getBasecardDescriptor,
  getBasecardRegistryVersion,
  subscribeBasecardRegistry,
} from '../basecard-runtime/registry';
import { globalEventEmitter } from '../core/event-emitter';
import { useTranslation } from '../hooks/useTranslation';
import { fileService } from '../services/file-service';
import { platformService } from '../services/platform-service';
import { zipService } from '../services/zip-service';
import type { BasecardPendingResourceImport, BasecardResourceOperations } from '../basecard-runtime/contracts';
import { importArchiveBundleIntoCardRoot } from './archive-import';
import type { EditorSessionSnapshot } from './contracts';
import { useEditorRuntime } from './context';
import { ENGINE_ICONS } from '../icons/descriptors';
import { RuntimeIcon } from '../icons/RuntimeIcon';

function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
}

function createFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`);
  }

  const absolutePath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return encodeURI(`file://${absolutePath}`);
}

function normalizeResourcePath(resourcePath: string): string | null {
  const normalized = resourcePath.replace(/\\/g, '/').trim();
  if (!normalized) {
    return null;
  }

  const segments = normalized
    .replace(/^\.?\//, '')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.');
  if (segments.length === 0 || segments.some((segment) => segment === '..')) {
    return null;
  }

  return segments.join('/');
}

function sanitizeImportedFileName(fileName: string): string {
  const normalizedPath = normalizeResourcePath(fileName);
  const candidate = normalizedPath?.split('/').pop() ?? fileName.trim();
  const sanitized = candidate
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '')
    .trim();

  return sanitized.length > 0 ? sanitized : 'resource';
}

function createObjectUrl(resource: BasecardPendingResourceImport): string {
  const type = resource.mimeType?.trim() || 'application/octet-stream';
  const buffer = new ArrayBuffer(resource.data.byteLength);
  new Uint8Array(buffer).set(resource.data);
  return URL.createObjectURL(new Blob([buffer], { type }));
}

export interface EditorHostProps {
  cardId: string;
  cardPath: string;
  cardType: string;
  baseCardId: string;
  sourceConfig: Record<string, unknown>;
  pendingResourceImports?: Map<string, BasecardPendingResourceImport>;
  onConfigChange?: (
    config: Record<string, unknown>,
    resourceOperations?: BasecardResourceOperations,
  ) => Promise<void> | void;
  onPluginLoaded?: (pluginInfo: { cardType: string; baseCardId: string }) => void;
  onPluginError?: (error: Error) => void;
}

export function EditorHost({
  cardId,
  cardPath,
  cardType,
  baseCardId,
  sourceConfig,
  pendingResourceImports,
  onConfigChange,
  onPluginLoaded,
  onPluginError,
}: EditorHostProps) {
  const { t } = useTranslation();
  const store = useEditorRuntime();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [registryVersion, setRegistryVersion] = useState(() => getBasecardRegistryVersion());
  const descriptor = useMemo(() => getBasecardDescriptor(cardType), [cardType, registryVersion]);
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
  const latestDraftConfigRef = useRef<Record<string, unknown>>(sourceConfig);
  const resolvedResourceUrlsRef = useRef(new Map<string, string>());
  const pendingResourceResolvesRef = useRef(new Map<string, Promise<string>>());

  const syncSnapshot = useCallback(() => {
    setSnapshot(store.getSnapshot(sessionKey));
  }, [sessionKey, store]);

  const releaseResolvedResourceUrl = useCallback((resourcePath: string) => {
    const url = resolvedResourceUrlsRef.current.get(resourcePath);
    if (!url) {
      return;
    }

    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    resolvedResourceUrlsRef.current.delete(resourcePath);
  }, []);

  const releaseAllResolvedResourceUrls = useCallback(() => {
    resolvedResourceUrlsRef.current.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    resolvedResourceUrlsRef.current.clear();
    pendingResourceResolvesRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      releaseAllResolvedResourceUrls();
    };
  }, [releaseAllResolvedResourceUrls, sessionKey, cardPath]);

  useEffect(() => {
    return subscribeBasecardRegistry(() => {
      setRegistryVersion(getBasecardRegistryVersion());
    });
  }, []);

  useEffect(() => {
    latestDraftConfigRef.current = snapshot?.draftConfig ?? sourceConfig;
  }, [snapshot?.draftConfig, sourceConfig]);

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
    if (
      !descriptor
      || !onConfigChange
      || !snapshot?.dirty
      || !snapshot.validation.valid
    ) {
      return;
    }

    await store.commit(sessionKey, descriptor, async ({ config, resourceOperations }) => {
      reportEditorActivity();
      const hasResourceOperations =
        resourceOperations.imports.length > 0 || resourceOperations.deletions.length > 0;
      await onConfigChange(config, hasResourceOperations ? resourceOperations : undefined);
    });
  }, [
    descriptor,
    onConfigChange,
    reportEditorActivity,
    sessionKey,
    snapshot,
    snapshot?.dirty,
    snapshot?.hasPendingResourceChanges,
    snapshot?.sourceConfig,
    snapshot?.draftConfig,
    snapshot?.validation.valid,
    store,
  ]);

  const resolveResourceUrl = useCallback(async (resourcePath: string) => {
    const normalizedResourcePath = normalizeResourcePath(resourcePath);
    if (!normalizedResourcePath) {
      throw new Error(`资源路径无效: ${resourcePath}`);
    }

    const cached = resolvedResourceUrlsRef.current.get(normalizedResourcePath);
    if (cached) {
      return cached;
    }

    const pendingResolve = pendingResourceResolvesRef.current.get(normalizedResourcePath);
    if (pendingResolve) {
      return pendingResolve;
    }

    const resolver = (async () => {
      const pendingImport =
        store.getPendingResourceImport(sessionKey, normalizedResourcePath)
        ?? pendingResourceImports?.get(normalizedResourcePath)
        ?? null;
      const nextUrl = pendingImport
        ? createObjectUrl(pendingImport)
        : createFileUrl(joinPath(cardPath, normalizedResourcePath));

      releaseResolvedResourceUrl(normalizedResourcePath);
      resolvedResourceUrlsRef.current.set(normalizedResourcePath, nextUrl);
      return nextUrl;
    })().finally(() => {
      pendingResourceResolvesRef.current.delete(normalizedResourcePath);
    });

    pendingResourceResolvesRef.current.set(normalizedResourcePath, resolver);
    return resolver;
  }, [cardPath, pendingResourceImports, releaseResolvedResourceUrl, sessionKey, store]);

  const pickAvailableResourcePath = useCallback(async (fileName: string) => {
    const sanitizedName = sanitizeImportedFileName(fileName);
    const activeConfig = latestDraftConfigRef.current;
    const referencedPaths = new Set(
      descriptor?.collectResourcePaths?.(activeConfig) ?? [],
    );
    if (referencedPaths.has(sanitizedName)) {
      return sanitizedName;
    }

    const dotIndex = sanitizedName.lastIndexOf('.');
    const basename = dotIndex > 0 ? sanitizedName.slice(0, dotIndex) : sanitizedName;
    const extension = dotIndex > 0 ? sanitizedName.slice(dotIndex) : '';

    let counter = 1;
    let candidate = sanitizedName;

    while (true) {
      const pendingImport = store.getPendingResourceImport(sessionKey, candidate);
      const pendingDelete = store.hasPendingResourceDeletion(sessionKey, candidate);
      const existsOnDisk = pendingDelete ? false : await fileService.exists(joinPath(cardPath, candidate));
      if (!pendingImport && !existsOnDisk) {
        return candidate;
      }

      counter += 1;
      candidate = `${basename}-${counter}${extension}`;
    }
  }, [cardPath, descriptor, sessionKey, store]);

  const importResource = useCallback(async (input: { file: File; preferredPath?: string }) => {
    const nextPath = await pickAvailableResourcePath(input.preferredPath ?? input.file.name);
    const arrayBuffer = await input.file.arrayBuffer();
    releaseResolvedResourceUrl(nextPath);
    store.queueResourceImport(sessionKey, {
      path: nextPath,
      data: new Uint8Array(arrayBuffer),
      mimeType: input.file.type || undefined,
    });

    return {
      path: nextPath,
    };
  }, [pickAvailableResourcePath, releaseResolvedResourceUrl, sessionKey, store]);

  const deleteResource = useCallback(async (resourcePath: string) => {
    const normalizedResourcePath = normalizeResourcePath(resourcePath);
    if (!normalizedResourcePath) {
      throw new Error(`资源路径无效: ${resourcePath}`);
    }

    releaseResolvedResourceUrl(normalizedResourcePath);
    store.queueResourceDeletion(sessionKey, normalizedResourcePath);
  }, [releaseResolvedResourceUrl, sessionKey, store]);

  const importArchiveBundle = useCallback(async (input: {
    file: File;
    preferredRootDir?: string;
    entryFile?: string;
  }) => {
    const result = await importArchiveBundleIntoCardRoot({
      cardRootDir: cardPath,
      request: input,
      services: {
        getPathForFile(file) {
          return platformService.getPathForFile(file);
        },
        async listZipEntries(zipPath) {
          return zipService.list(zipPath);
        },
        async extractZip(zipPath, outputDir) {
          return zipService.extract(zipPath, outputDir);
        },
        async listFiles(dir, options) {
          return fileService.list(dir, options);
        },
        async writeBinary(path, content) {
          await fileService.writeBinary(path, content);
        },
        async move(sourcePath, destPath) {
          await fileService.move(sourcePath, destPath);
        },
        async delete(path, options) {
          await fileService.delete(path, options);
        },
        async exists(path) {
          return fileService.exists(path);
        },
      },
    });

    result.resourcePaths.forEach((resourcePath) => {
      releaseResolvedResourceUrl(resourcePath);
    });
    return result;
  }, [cardPath, releaseResolvedResourceUrl]);

  useEffect(() => {
    if (!descriptor || !snapshot?.dirty || !snapshot.validation.valid) {
      return;
    }

    const hasConfigDelta =
      JSON.stringify(snapshot.draftConfig) !== JSON.stringify(snapshot.sourceConfig);
    const commitDelayMs = snapshot.hasPendingResourceChanges && hasConfigDelta
      ? 0
      : snapshot.commitDebounceMs;
    const timerId = window.setTimeout(() => {
      void commitSession().catch((error) => {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        setLoadError(normalizedError);
        onPluginError?.(normalizedError);
      });
    }, commitDelayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    commitSession,
    descriptor,
    onPluginError,
    snapshot?.commitDebounceMs,
    snapshot?.draftConfig,
    snapshot?.dirty,
    snapshot?.hasPendingResourceChanges,
    snapshot?.revision,
    snapshot?.sourceConfig,
    snapshot?.validation.valid,
  ]);

  useEffect(() => {
    return () => {
      void commitSession().catch(() => undefined);
    };
  }, [commitSession]);

  useEffect(() => {
    const flushPendingSession = () => {
      void commitSession().catch(() => undefined);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSession();
      }
    };

    window.addEventListener('pagehide', flushPendingSession);
    window.addEventListener('beforeunload', flushPendingSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushPendingSession);
      window.removeEventListener('beforeunload', flushPendingSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        resolveResourceUrl,
        releaseResourceUrl(resourcePath) {
          const normalizedResourcePath = normalizeResourcePath(resourcePath);
          if (!normalizedResourcePath) {
            return;
          }

          releaseResolvedResourceUrl(normalizedResourcePath);
        },
        importResource,
        importArchiveBundle,
        deleteResource,
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
    resolveResourceUrl,
    importResource,
    importArchiveBundle,
    deleteResource,
    releaseResolvedResourceUrl,
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
          <div className="plugin-host__error-icon">
            <RuntimeIcon icon={ENGINE_ICONS.warning} />
          </div>
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

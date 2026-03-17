import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CompositeInteractionPayload } from 'chips-sdk';
import type { BasecardPendingResourceImport } from './contracts';
import { getBasecardDescriptor, normalizeBasecardConfig } from './registry';
import { createBasecardFrameThemeCss } from './theme-css';

export interface BasecardFrameStatus {
  state: 'loading' | 'ready' | 'error';
  height: number;
  errorMessage: string | null;
}

export interface BasecardFrameHostProps {
  baseCardId: string;
  cardType: string;
  config: Record<string, unknown>;
  resourceBaseUrl?: string;
  pendingResourceImports?: Map<string, BasecardPendingResourceImport>;
  selectable?: boolean;
  themeCacheKey?: string;
  interactionPolicy: 'delegate' | 'native';
  onSelect?: () => void;
  onStatusChange?: (status: BasecardFrameStatus) => void;
  onInteraction?: (payload: CompositeInteractionPayload, frame: HTMLIFrameElement) => void;
}

const DEFAULT_STATUS: BasecardFrameStatus = {
  state: 'loading',
  height: 96,
  errorMessage: null,
};

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

function createObjectUrl(resource: BasecardPendingResourceImport): string {
  const type = resource.mimeType?.trim() || 'application/octet-stream';
  const buffer = new ArrayBuffer(resource.data.byteLength);
  new Uint8Array(buffer).set(resource.data);
  return URL.createObjectURL(new Blob([buffer], { type }));
}

function createFrameDocumentHtml(resourceBaseUrl?: string): string {
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    ...(resourceBaseUrl ? [`<base href="${resourceBaseUrl}" />`] : []),
    '</head>',
    '<body></body>',
    '</html>',
  ].join('');
}

function measureFrameHeight(frame: HTMLIFrameElement): number {
  const doc = frame.contentDocument;
  if (!doc) {
    return DEFAULT_STATUS.height;
  }

  const contentRoot = doc.querySelector('[data-chips-basecard-frame-root="true"]') as HTMLElement | null;
  if (contentRoot) {
    return Math.max(
      1,
      Math.ceil(
        Math.max(
          contentRoot.scrollHeight ?? 0,
          contentRoot.offsetHeight ?? 0,
          contentRoot.getBoundingClientRect?.().height ?? 0,
        ),
      ),
    );
  }

  const body = doc.body;
  const root = doc.documentElement;
  return Math.max(
    1,
    Math.ceil(
      Math.max(
        body?.scrollHeight ?? 0,
        root?.scrollHeight ?? 0,
      ),
    ),
  );
}

export function BasecardFrameHost({
  baseCardId,
  cardType,
  config,
  resourceBaseUrl,
  pendingResourceImports,
  selectable = false,
  themeCacheKey,
  interactionPolicy,
  onSelect,
  onStatusChange,
  onInteraction,
}: BasecardFrameHostProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const selectableRef = useRef(selectable);
  const onSelectRef = useRef(onSelect);
  const onInteractionRef = useRef(onInteraction);
  const interactionPolicyRef = useRef(interactionPolicy);
  const resolvedResourceUrlsRef = useRef(new Map<string, string>());
  const [status, setStatus] = useState<BasecardFrameStatus>(DEFAULT_STATUS);

  const descriptor = useMemo(() => getBasecardDescriptor(cardType), [cardType]);
  const normalizedConfig = useMemo(
    () => normalizeBasecardConfig(cardType, baseCardId, config),
    [baseCardId, cardType, config],
  );
  const configSignature = useMemo(() => JSON.stringify(normalizedConfig), [normalizedConfig]);
  const readyMinHeightStyle = useMemo(
    () => ({ minHeight: status.state === 'ready' ? '0px' : `${DEFAULT_STATUS.height}px` }),
    [status.state],
  );

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    selectableRef.current = selectable;
  }, [selectable]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onInteractionRef.current = onInteraction;
  }, [onInteraction]);

  useEffect(() => {
    interactionPolicyRef.current = interactionPolicy;
  }, [interactionPolicy]);

  useEffect(() => {
    return () => {
      resolvedResourceUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      resolvedResourceUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    const wrapper = wrapperRef.current;
    if (!frame || !wrapper) {
      return;
    }

    if (!descriptor) {
      setStatus({
        state: 'error',
        height: DEFAULT_STATUS.height,
        errorMessage: `未注册基础卡片类型: ${cardType}`,
      });
      return;
    }

    let disposed = false;
    let renderCleanup: (() => void) | void;
    const cleanupTasks: Array<() => void> = [];
    const resolveResourceUrl = async (resourcePath: string): Promise<string> => {
      const normalizedResourcePath = normalizeResourcePath(resourcePath);
      if (!normalizedResourcePath) {
        throw new Error(`资源路径无效: ${resourcePath}`);
      }

      const pendingImport = pendingResourceImports?.get(normalizedResourcePath);
      if (pendingImport) {
        const cachedUrl = resolvedResourceUrlsRef.current.get(normalizedResourcePath);
        if (cachedUrl) {
          return cachedUrl;
        }

        const nextUrl = createObjectUrl(pendingImport);
        resolvedResourceUrlsRef.current.set(normalizedResourcePath, nextUrl);
        return nextUrl;
      }

      if (resourceBaseUrl) {
        return new URL(normalizedResourcePath, resourceBaseUrl).toString();
      }

      return normalizedResourcePath;
    };
    const releaseResourceUrl = (resourcePath: string): void => {
      const normalizedResourcePath = normalizeResourcePath(resourcePath);
      if (!normalizedResourcePath) {
        return;
      }

      const currentUrl = resolvedResourceUrlsRef.current.get(normalizedResourcePath);
      if (!currentUrl) {
        return;
      }

      URL.revokeObjectURL(currentUrl);
      resolvedResourceUrlsRef.current.delete(normalizedResourcePath);
    };

    setStatus((current) => {
      if (current.state === 'ready') {
        return {
          state: 'ready',
          height: current.height,
          errorMessage: null,
        };
      }

      return {
        state: 'loading',
        height: current.height > 0 ? current.height : DEFAULT_STATUS.height,
        errorMessage: null,
      };
    });

    const mountFrame = () => {
      const doc = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      if (!doc || !frameWindow) {
        throw new Error('基础卡片渲染窗口未就绪。');
      }

      const container = doc.createElement('div');
      container.setAttribute('data-chips-basecard-frame-root', 'true');

      while (doc.body.firstChild) {
        doc.body.removeChild(doc.body.firstChild);
      }

      doc.body.appendChild(container);
      renderCleanup = descriptor.renderView({
        container,
        config: normalizedConfig,
        themeCssText: createBasecardFrameThemeCss(wrapper),
        resolveResourceUrl,
        releaseResourceUrl,
      });

      const applyMeasuredHeight = () => {
        if (disposed) {
          return;
        }

        const nextHeight = measureFrameHeight(frame);
        frame.style.height = `${nextHeight}px`;
        setStatus((current) => {
          if (
            current.state === 'ready' &&
            current.height === nextHeight &&
            current.errorMessage === null
          ) {
            return current;
          }

          return {
            state: 'ready',
            height: nextHeight,
            errorMessage: null,
          };
        });
      };

      const ResizeObserverCtor = (
        frameWindow as Window & { ResizeObserver?: typeof ResizeObserver }
      ).ResizeObserver ?? window.ResizeObserver;
      if (ResizeObserverCtor) {
        const resizeObserver = new ResizeObserverCtor(() => {
          applyMeasuredHeight();
        });
        resizeObserver.observe(doc.body);
        resizeObserver.observe(doc.documentElement);
        cleanupTasks.push(() => {
          resizeObserver.disconnect();
        });
      }

      const selectBasecard = () => {
        if (!selectableRef.current) {
          return;
        }
        onSelectRef.current?.();
      };

      doc.addEventListener('pointerdown', selectBasecard);
      cleanupTasks.push(() => {
        doc.removeEventListener('pointerdown', selectBasecard);
      });

      const handleWheel = (event: WheelEvent) => {
        if (interactionPolicyRef.current !== 'delegate' || !onInteractionRef.current) {
          return;
        }

        event.preventDefault();
        onInteractionRef.current(
          {
            cardId: baseCardId,
            source: 'basecard-frame',
            device: 'wheel',
            intent: event.ctrlKey || event.metaKey ? 'zoom' : 'scroll',
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            zoomDelta: event.ctrlKey || event.metaKey ? Number(event.deltaY) * -0.0025 : 0,
            clientX: event.clientX,
            clientY: event.clientY,
            pointerCount: event.ctrlKey || event.metaKey ? 2 : 1,
          },
          frame,
        );
      };

      doc.addEventListener('wheel', handleWheel, { passive: false });
      cleanupTasks.push(() => {
        doc.removeEventListener('wheel', handleWheel);
      });

      frameWindow.requestAnimationFrame(() => {
        applyMeasuredHeight();
      });
    };

    const handleFrameLoad = () => {
      if (disposed) {
        return;
      }

      try {
        mountFrame();
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        setStatus({
          state: 'error',
          height: DEFAULT_STATUS.height,
          errorMessage: normalizedError.message,
        });
      }
    };

    frame.addEventListener('load', handleFrameLoad);
    cleanupTasks.push(() => {
      frame.removeEventListener('load', handleFrameLoad);
    });

    frame.srcdoc = createFrameDocumentHtml(resourceBaseUrl);

    return () => {
      disposed = true;
      cleanupTasks.forEach((cleanup) => cleanup());
      resolvedResourceUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      resolvedResourceUrlsRef.current.clear();
      if (typeof renderCleanup === 'function') {
        renderCleanup();
      }
    };
  }, [
    baseCardId,
    cardType,
    configSignature,
    descriptor,
    normalizedConfig,
    pendingResourceImports,
    resourceBaseUrl,
    themeCacheKey,
  ]);

  return (
    <div
      ref={wrapperRef}
      className="basecard-frame-host"
      style={readyMinHeightStyle}
    >
      <iframe
        ref={iframeRef}
        className="basecard-frame-host__frame"
        title={`basecard-${baseCardId}`}
        scrolling="no"
        style={readyMinHeightStyle}
      />

      {status.state === 'loading' && (
        <div className="basecard-frame-host__overlay" data-state="loading">
          <span className="basecard-frame-host__overlay-text">加载基础卡片中…</span>
        </div>
      )}

      {status.state === 'error' && status.errorMessage && (
        <div className="basecard-frame-host__overlay" data-state="error">
          <span className="basecard-frame-host__overlay-text">{status.errorMessage}</span>
        </div>
      )}
    </div>
  );
}

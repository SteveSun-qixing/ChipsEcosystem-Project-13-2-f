import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildHostedPluginEntryUrl,
  buildHostedPluginRoute,
  closeWebPluginSession,
  createWebPluginSession,
  getWebPluginSession,
  resolveWebResourceOpenPlan,
  type HostResourceOpenRequest,
  type HostSurfaceOpenRequest,
  type WebPluginSessionView,
} from '../lib/host-runtime';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import './HostedPluginSurface.css';

interface HostedPluginSurfaceProps {
  sessionId: string;
  initialSession?: WebPluginSessionView | null;
  autoDispose?: boolean;
  surfaceMode?: 'immersive' | 'document';
}

interface HostBridgeRequestMessage {
  type: 'chips.web-shell:invoke';
  sessionId: string;
  requestId: string;
  action: string;
  payload: unknown;
}

interface HostBridgeEmitMessage {
  type: 'chips.web-shell:emit';
  sessionId: string;
  event: string;
  payload: unknown;
}

type WebSurfaceNavigationKind = NonNullable<HostSurfaceOpenRequest['kind']>;
type PendingTabHandle = Window | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeResourceOpenRequest(payload: unknown): HostResourceOpenRequest | null {
  if (!isRecord(payload) || !isRecord(payload.resource)) {
    return null;
  }

  const resourceId = typeof payload.resource.resourceId === 'string' ? payload.resource.resourceId.trim() : '';
  if (!resourceId) {
    return null;
  }

  return {
    ...(typeof payload.intent === 'string' && payload.intent.trim() ? { intent: payload.intent.trim() } : undefined),
    resource: {
      resourceId,
      ...(typeof payload.resource.mimeType === 'string' && payload.resource.mimeType.trim()
        ? { mimeType: payload.resource.mimeType.trim() }
        : undefined),
      ...(typeof payload.resource.title === 'string' && payload.resource.title.trim()
        ? { title: payload.resource.title.trim() }
        : undefined),
      ...(typeof payload.resource.fileName === 'string' && payload.resource.fileName.trim()
        ? { fileName: payload.resource.fileName.trim() }
        : undefined),
    },
  };
}

function normalizeSurfaceOpenRequest(payload: unknown): HostSurfaceOpenRequest | null {
  if (!isRecord(payload) || !isRecord(payload.request) || !isRecord(payload.request.target)) {
    return null;
  }

  const request = payload.request;
  const target = request.target as Record<string, unknown>;
  if (target.type === 'plugin' && typeof target.pluginId === 'string' && target.pluginId.trim()) {
    return {
      ...(typeof request.kind === 'string' ? { kind: request.kind as HostSurfaceOpenRequest['kind'] } : undefined),
      target: {
        type: 'plugin',
        pluginId: target.pluginId.trim(),
        ...(isRecord(target.launchParams) ? { launchParams: target.launchParams } : undefined),
      },
      ...(isRecord(request.presentation) ? { presentation: request.presentation } : undefined),
    };
  }

  if (target.type === 'url' && typeof target.url === 'string' && target.url.trim()) {
    return {
      ...(typeof request.kind === 'string' ? { kind: request.kind as HostSurfaceOpenRequest['kind'] } : undefined),
      target: {
        type: 'url',
        url: target.url.trim(),
      },
      ...(isRecord(request.presentation) ? { presentation: request.presentation } : undefined),
    };
  }

  return null;
}

function supportsNewTab(kind: WebSurfaceNavigationKind): boolean {
  return kind === 'route' || kind === 'tab' || kind === 'window';
}

function createPendingTab(kind: WebSurfaceNavigationKind): PendingTabHandle {
  if (!supportsNewTab(kind)) {
    return null;
  }

  const pending = window.open('about:blank', '_blank');
  if (!pending) {
    return null;
  }

  try {
    pending.document.title = 'Chips';
    pending.document.body.style.margin = '0';
    pending.document.body.style.background = '#ffffff';
  } catch {
    // 浏览器可能对预打开标签页的文档访问做限制，此时只保留窗口句柄即可。
  }

  return pending;
}

function navigatePendingTab(pending: PendingTabHandle, url: string): boolean {
  if (!pending || pending.closed) {
    return false;
  }

  try {
    pending.location.replace(url);
    return true;
  } catch {
    return false;
  }
}

function closePendingTab(pending: PendingTabHandle): void {
  if (!pending || pending.closed) {
    return;
  }

  try {
    pending.close();
  } catch {
    // 某些浏览器环境可能拒绝脚本关闭预打开标签页，此时忽略即可。
  }
}

function openHostedRoute(
  url: string,
  kind: WebSurfaceNavigationKind = 'route',
  options?: {
    pendingTab?: PendingTabHandle;
    fallbackToCurrentPage?: boolean;
  },
): void {
  if (navigatePendingTab(options?.pendingTab ?? null, url)) {
    return;
  }

  if (supportsNewTab(kind)) {
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (popup) {
      return;
    }
  }

  if (options?.fallbackToCurrentPage !== false) {
    window.location.assign(url);
  }
}

function openExternalUrl(
  url: string,
  kind: WebSurfaceNavigationKind = 'tab',
  options?: {
    pendingTab?: PendingTabHandle;
    fallbackToCurrentPage?: boolean;
  },
): void {
  if (navigatePendingTab(options?.pendingTab ?? null, url)) {
    return;
  }

  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (popup) {
    return;
  }

  if (options?.fallbackToCurrentPage !== false) {
    window.location.assign(url);
  }
}

function normalizeEmbeddedHeight(payload: unknown): number | null {
  if (!isRecord(payload)) {
    return null;
  }

  const height = Number(payload.height);
  if (!Number.isFinite(height)) {
    return null;
  }

  return Math.max(320, Math.ceil(height));
}

export function HostedPluginSurface({
  sessionId,
  initialSession = null,
  autoDispose = true,
  surfaceMode = 'immersive',
}: HostedPluginSurfaceProps) {
  const { t } = useAppPreferences();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [session, setSession] = useState<WebPluginSessionView | null>(initialSession);
  const [loading, setLoading] = useState(initialSession === null);
  const [error, setError] = useState('');
  const [embeddedHeight, setEmbeddedHeight] = useState<number | null>(surfaceMode === 'document' ? 960 : null);

  const frameUrl = useMemo(() => buildHostedPluginEntryUrl(sessionId), [sessionId]);

  useEffect(() => {
    setEmbeddedHeight(surfaceMode === 'document' ? 960 : null);
  }, [sessionId, surfaceMode]);

  useEffect(() => {
    let cancelled = false;

    if (initialSession && initialSession.sessionId === sessionId) {
      setSession(initialSession);
      setLoading(false);
      setError('');
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError('');
    void getWebPluginSession(sessionId)
      .then((nextSession) => {
        if (!cancelled) {
          setSession(nextSession);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : t('common.error'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialSession, sessionId, t]);

  useEffect(() => {
    if (!autoDispose || import.meta.env.DEV) {
      return;
    }

    return () => {
      void closeWebPluginSession(sessionId).catch(() => undefined);
    };
  }, [autoDispose, sessionId]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow || event.source !== frameWindow || event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (!isRecord(data) || data.sessionId !== sessionId || typeof data.type !== 'string') {
        return;
      }

      const respond = (response: { requestId?: string; result?: unknown; error?: { message: string; code?: string } }) => {
        frameWindow.postMessage(
          {
            type: 'chips.web-shell:result',
            sessionId,
            ...response,
          },
          window.location.origin,
        );
      };

      if (data.type === 'chips.web-shell:emit') {
        const emitMessage = data as unknown as HostBridgeEmitMessage;
        if (surfaceMode === 'document' && emitMessage.event === 'plugin.surface.resize') {
          const nextHeight = normalizeEmbeddedHeight(emitMessage.payload);
          if (nextHeight) {
            setEmbeddedHeight(nextHeight);
          }
        }
        return;
      }

      if (data.type !== 'chips.web-shell:invoke' || typeof data.requestId !== 'string' || typeof data.action !== 'string') {
        return;
      }

      const request = data as unknown as HostBridgeRequestMessage;
      let pendingTab: PendingTabHandle = null;

      try {
        if (request.action === 'resource.open') {
          const normalizedRequest = normalizeResourceOpenRequest(request.payload);
          if (!normalizedRequest) {
            throw new Error('Invalid resource.open payload');
          }

          pendingTab = createPendingTab('tab');
          const plan = await resolveWebResourceOpenPlan(normalizedRequest);
          if (plan.mode === 'plugin' && plan.pluginId) {
            const nextSession = await createWebPluginSession({
              pluginId: plan.pluginId,
              launchParams: {
                trigger: 'resource-open-service',
                resourceOpen: {
                  intent: normalizedRequest.intent ?? 'view',
                  resourceId: plan.resolved.resourceId,
                  mimeType: plan.resolved.mimeType,
                  extension: plan.resolved.extension,
                  fileName: plan.resolved.fileName,
                  title: normalizedRequest.resource.title,
                  matchedCapability: plan.matchedCapability,
                },
              },
            });
            const route = buildHostedPluginRoute(nextSession.sessionId);
            openHostedRoute(route, 'tab', {
              pendingTab,
              fallbackToCurrentPage: false,
            });
            respond({
              requestId: request.requestId,
              result: {
                result: {
                  mode: 'plugin',
                  pluginId: plan.pluginId,
                  windowId: nextSession.sessionId,
                  matchedCapability: plan.matchedCapability,
                  resolved: plan.resolved,
                },
              },
            });
            return;
          }

          openExternalUrl(plan.resolved.resourceId, 'tab', {
            pendingTab,
            fallbackToCurrentPage: false,
          });
          respond({
            requestId: request.requestId,
            result: {
              result: {
                mode: 'external',
                resolved: plan.resolved,
              },
            },
          });
          return;
        }

        if (request.action === 'surface.open') {
          const normalizedRequest = normalizeSurfaceOpenRequest(request.payload);
          if (!normalizedRequest) {
            throw new Error('Invalid surface.open payload');
          }

          const requestedKind = normalizedRequest.kind ?? 'route';
          pendingTab = createPendingTab(requestedKind);

          if (normalizedRequest.target.type === 'url') {
            openExternalUrl(normalizedRequest.target.url, requestedKind, {
              pendingTab,
            });
            respond({
              requestId: request.requestId,
              result: {
                surface: {
                  id: `web-url:${Date.now()}`,
                  kind: requestedKind,
                  title: normalizedRequest.presentation?.title,
                  focused: false,
                  state: 'normal',
                  url: normalizedRequest.target.url,
                  metadata: {
                    requestedKind: requestedKind,
                  },
                },
              },
            });
            return;
          }

          const nextSession = await createWebPluginSession({
            pluginId: normalizedRequest.target.pluginId,
            launchParams: normalizedRequest.target.launchParams,
          });
          const route = buildHostedPluginRoute(nextSession.sessionId);
          openHostedRoute(route, requestedKind, {
            pendingTab,
          });
          respond({
            requestId: request.requestId,
            result: {
              surface: {
                id: nextSession.sessionId,
                kind: requestedKind,
                title: normalizedRequest.presentation?.title ?? nextSession.title,
                focused: false,
                state: 'normal',
                url: route,
                pluginId: nextSession.pluginId,
                sessionId: nextSession.sessionId,
                metadata: {
                  requestedKind: requestedKind,
                },
              },
            },
          });
          return;
        }

        if (request.action === 'plugin.launch') {
          const payload = isRecord(request.payload) ? request.payload : {};
          const pluginId = typeof payload.pluginId === 'string' ? payload.pluginId.trim() : '';
          if (!pluginId) {
            throw new Error('pluginId is required');
          }

          pendingTab = createPendingTab('tab');
          const nextSession = await createWebPluginSession({
            pluginId,
            launchParams: isRecord(payload.launchParams) ? payload.launchParams : {},
          });
          const route = buildHostedPluginRoute(nextSession.sessionId);
          openHostedRoute(route, 'tab', {
            pendingTab,
          });
          respond({
            requestId: request.requestId,
            result: {
              window: {
                id: nextSession.sessionId,
              },
              session: {
                sessionId: nextSession.sessionId,
                sessionNonce: 'web-shell',
                permissions: nextSession.permissions,
              },
            },
          });
          return;
        }

        if (
          request.action === 'transfer.openExternal'
          || request.action === 'platform.openExternal'
          || request.action === 'platform.shellOpenExternal'
        ) {
          const payload = isRecord(request.payload) ? request.payload : {};
          const url = typeof payload.url === 'string' ? payload.url.trim() : '';
          if (!url) {
            throw new Error('url is required');
          }

          pendingTab = createPendingTab('tab');
          openExternalUrl(url, 'tab', {
            pendingTab,
          });
          respond({
            requestId: request.requestId,
            result: {
              ack: true,
            },
          });
          return;
        }

        throw new Error(`Unsupported web-shell action: ${request.action}`);
      } catch (dispatchError) {
        closePendingTab(pendingTab);
        respond({
          requestId: request.requestId,
          error: {
            message: dispatchError instanceof Error ? dispatchError.message : t('common.error'),
          },
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [sessionId, t]);

  if (loading) {
    return (
      <div className="hosted-plugin-surface hosted-plugin-surface--state">
        <div className="hosted-plugin-surface__state">
          <span className="detail-transition-spinner" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="hosted-plugin-surface hosted-plugin-surface--state">
        <section className="panel error-panel hosted-plugin-surface__state">
          <h1>{error || t('detail.notFound')}</h1>
        </section>
      </div>
    );
  }

  return (
    <div
      className={`hosted-plugin-surface${surfaceMode === 'document' ? ' hosted-plugin-surface--document' : ''}`}
      data-plugin-id={session.pluginId}
    >
      <iframe
        ref={iframeRef}
        className={`hosted-plugin-surface__frame${surfaceMode === 'document' ? ' hosted-plugin-surface__frame--document' : ''}`}
        src={frameUrl}
        title={session.title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups"
        style={
          surfaceMode === 'document'
            ? {
                height: `${embeddedHeight ?? 960}px`,
              }
            : undefined
        }
      />
    </div>
  );
}

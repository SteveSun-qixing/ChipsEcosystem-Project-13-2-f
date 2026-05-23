import React, { useEffect, useRef, useState } from 'react';
import { HostedPluginSurface } from '../components/HostedPluginSurface';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { closeWebPluginSession, createWebPluginSession, type WebPluginSessionView } from '../lib/host-runtime';
import { getErrorMessage } from '../lib/ui';
import './DocumentPluginRoutePage.css';

const CARD_VIEWER_PLUGIN_ID = 'com.chips.card-viewer';

type DocumentRouteCoverFields = {
  coverUrl?: string;
  coverFragmentUrl?: string;
  coverRenderMode?: 'fragment-shadow' | 'iframe';
  coverRatio?: string;
};

export type DocumentRouteSource =
  | ({
      kind: 'community-card';
      cardId: string;
      title: string;
      createdAt?: string;
      documentUrl: string;
      canonicalUrl?: string;
    } & DocumentRouteCoverFields)
  | ({
      kind: 'community-box';
      boxId: string;
      title: string;
      createdAt?: string;
      documentUrl: string;
      canonicalUrl?: string;
    } & DocumentRouteCoverFields);

interface DocumentPluginRoutePageProps {
  source: DocumentRouteSource | null;
  loading: boolean;
  error: string;
  pendingLabel: string;
  trigger: string;
}

function normalizeDocumentUrl(value: string): string {
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

export function DocumentPluginRoutePage({
  source,
  loading,
  error,
  pendingLabel,
  trigger,
}: DocumentPluginRoutePageProps) {
  const { t } = useAppPreferences();
  const [session, setSession] = useState<WebPluginSessionView | null>(null);
  const [sessionError, setSessionError] = useState('');
  const launchSequenceRef = useRef(0);

  useEffect(() => {
    setSession(null);
    setSessionError('');
  }, [source?.kind, source && 'cardId' in source ? source.cardId : source && 'boxId' in source ? source.boxId : null]);

  useEffect(() => {
    if (!source || !source.documentUrl || session) {
      return;
    }

    let disposed = false;
    launchSequenceRef.current += 1;
    const launchSequence = launchSequenceRef.current;

    void createWebPluginSession({
      pluginId: CARD_VIEWER_PLUGIN_ID,
      launchParams: {
        trigger,
        cardSource: {
          ...source,
          documentUrl: normalizeDocumentUrl(source.documentUrl),
        },
      },
    })
      .then((nextSession) => {
        if (disposed || launchSequenceRef.current !== launchSequence) {
          void closeWebPluginSession(nextSession.sessionId).catch(() => undefined);
          return;
        }

        setSession(nextSession);
      })
      .catch((nextError) => {
        if (!disposed && launchSequenceRef.current === launchSequence) {
          setSessionError(getErrorMessage(nextError, t('common.error')));
        }
      });

    return () => {
      disposed = true;
    };
  }, [session, source, t, trigger]);

  if (loading) {
    return (
      <section className="document-plugin-route document-plugin-route--state" aria-live="polite">
        <div className="document-plugin-route__state-panel">
          <span className="detail-transition-spinner" />
          <h1>{t('common.loading')}</h1>
        </div>
      </section>
    );
  }

  if (error || sessionError || !source) {
    return (
      <section className="document-plugin-route document-plugin-route--state" aria-live="polite">
        <div className="document-plugin-route__state-panel">
          <h1>{error || sessionError || t('detail.notFound')}</h1>
        </div>
      </section>
    );
  }

  if (!source.documentUrl || !session) {
    return (
      <section className="document-plugin-route document-plugin-route--state" aria-live="polite">
        <div className="document-plugin-route__state-panel">
          <span className="detail-transition-spinner" />
          <h1>{pendingLabel}</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="document-plugin-route">
      <HostedPluginSurface sessionId={session.sessionId} initialSession={session} surfaceMode="document" />
    </section>
  );
}

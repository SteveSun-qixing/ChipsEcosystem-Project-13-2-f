import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cardsApi, type CardDetail } from '../api/content';
import { HostedPluginSurface } from '../components/HostedPluginSurface';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { closeWebPluginSession, createWebPluginSession, type WebPluginSessionView } from '../lib/host-runtime';
import { getErrorMessage } from '../lib/ui';
import './DetailPage.css';
import './CardDetailPage.css';

const CARD_VIEWER_PLUGIN_ID = 'com.chips.card-viewer';
const CARD_STATUS_POLL_MS = 2000;

function normalizeCardDocumentUrl(value: string): string {
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

export default function CardDetailPage() {
  const { t } = useAppPreferences();
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<WebPluginSessionView | null>(null);
  const launchSequenceRef = useRef(0);

  useEffect(() => {
    if (!cardId) {
      return;
    }

    let active = true;

    cardsApi
      .getCard(cardId)
      .then((response) => {
        if (active) {
          setCard(response);
          setSession(null);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(getErrorMessage(nextError, t('detail.notFound')));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [cardId, t]);

  useEffect(() => {
    if (!cardId || !card || card.status === 'ready' || card.status === 'error') {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const status = await cardsApi.getCardStatus(cardId);
        if (cancelled) {
          return;
        }

        setCard((current) =>
          current
            ? {
                ...current,
                status: status.status,
                htmlUrl: status.htmlUrl,
                updatedAt: status.updatedAt,
              }
            : current,
        );
      } catch (nextError) {
        if (!cancelled) {
          setError(getErrorMessage(nextError, t('common.error')));
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, CARD_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [card, cardId, t]);

  useEffect(() => {
    if (!cardId || !card?.htmlUrl || card.status !== 'ready' || session) {
      return;
    }

    let disposed = false;
    launchSequenceRef.current += 1;
    const launchSequence = launchSequenceRef.current;

    void createWebPluginSession({
      pluginId: CARD_VIEWER_PLUGIN_ID,
      launchParams: {
        trigger: 'community-card-route',
        fileOpenMode: 'card',
        cardId,
        title: card.title,
        webDocumentUrl: normalizeCardDocumentUrl(card.htmlUrl),
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
          setError(getErrorMessage(nextError, t('common.error')));
        }
      });

    return () => {
      disposed = true;
    };
  }, [card, cardId, session, t]);

  if (loading) {
    return (
      <div className="card-detail-page card-detail-page--state">
        <div className="card-detail-page__state-shell">
          <span className="detail-transition-spinner" />
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="card-detail-page card-detail-page--state">
        <section className="panel error-panel card-detail-page__error-panel">
          <h1>{error || t('detail.notFound')}</h1>
        </section>
      </div>
    );
  }

  if (card.status === 'error') {
    return (
      <div className="card-detail-page card-detail-page--state">
        <section className="panel error-panel card-detail-page__error-panel">
          <h1>{t('card.errorState')}</h1>
        </section>
      </div>
    );
  }

  if (card.status !== 'ready' || !card.htmlUrl || !session) {
    return (
      <div className="card-detail-page card-detail-page--state">
        <section className="panel card-detail-page__pending-panel">
          <div className="card-detail-page__state-shell">
            <div className="card-detail-page__state-copy">
              <span className="detail-transition-spinner" />
              <p>{t('card.notReady')}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="card-detail-page">
      <HostedPluginSurface sessionId={session.sessionId} initialSession={session} surfaceMode="document" />
    </div>
  );
}

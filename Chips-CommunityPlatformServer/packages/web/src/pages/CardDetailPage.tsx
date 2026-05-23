import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cardsApi, type CardDetail } from '../api/content';
import {
  CardViewerPageShell,
  CardViewerPageStage,
  CardViewerPageState,
} from '../components/CardViewerPageShell';
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
  const { t, formatDate } = useAppPreferences();
  const navigate = useNavigate();
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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (card?.user?.username) {
      navigate(`/@${card.user.username}`);
      return;
    }

    navigate('/');
  };

  const title = card?.title;
  const meta = card ? (
    <time dateTime={card.createdAt}>{formatDate(card.createdAt)}</time>
  ) : null;
  let body: React.ReactNode;

  if (loading) {
    body = (
      <CardViewerPageState>
        <div className="card-viewer-page__state-panel">
          <span className="detail-transition-spinner" />
          <div className="card-viewer-page__state-copy">
            <h2>{t('card.viewerLoading')}</h2>
          </div>
        </div>
      </CardViewerPageState>
    );
  } else if (error || !card) {
    body = (
      <CardViewerPageState>
        <div className="card-viewer-page__state-panel">
          <div className="card-viewer-page__state-copy">
            <h2>{error || t('detail.notFound')}</h2>
          </div>
        </div>
      </CardViewerPageState>
    );
  } else if (card.status === 'error') {
    body = (
      <CardViewerPageState>
        <div className="card-viewer-page__state-panel">
          <div className="card-viewer-page__state-copy">
            <h2>{t('card.errorState')}</h2>
          </div>
        </div>
      </CardViewerPageState>
    );
  } else if (card.status !== 'ready' || !card.htmlUrl || !session) {
    body = (
      <CardViewerPageState>
        <div className="card-viewer-page__state-panel">
          <span className="detail-transition-spinner" />
          <div className="card-viewer-page__state-copy">
            <h2>{t('card.notReady')}</h2>
          </div>
        </div>
      </CardViewerPageState>
    );
  } else {
    body = (
      <CardViewerPageStage>
        <HostedPluginSurface sessionId={session.sessionId} initialSession={session} surfaceMode="document" />
      </CardViewerPageStage>
    );
  }

  return (
    <CardViewerPageShell
      title={title}
      backLabel={t('card.backToPrevious')}
      onBack={handleBack}
      meta={meta}
    >
      {body}
    </CardViewerPageShell>
  );
}

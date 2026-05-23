import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cardsApi, type CardDetail } from '../api/content';
import { DocumentPluginRoutePage, type DocumentRouteSource } from './DocumentPluginRoutePage';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage } from '../lib/ui';

const CARD_STATUS_POLL_MS = 2000;

export default function CardDetailPage() {
  const { t } = useAppPreferences();
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cardId) {
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    cardsApi
      .getCard(cardId)
      .then((response) => {
        if (active) {
          setCard(response);
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

  const source: DocumentRouteSource | null =
    cardId && card?.status === 'ready' && card.htmlUrl
      ? {
          kind: 'community-card',
          cardId,
          title: card.title,
          createdAt: card.createdAt,
          documentUrl: card.htmlUrl,
          canonicalUrl: `/cards/${cardId}`,
        }
      : null;

  return (
    <DocumentPluginRoutePage
      source={source}
      loading={loading}
      error={error || (card?.status === 'error' ? t('card.errorState') : '')}
      pendingLabel={t('card.notReady')}
      trigger="community-card-route"
    />
  );
}

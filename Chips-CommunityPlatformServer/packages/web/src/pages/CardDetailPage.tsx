import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cardsApi, type CardOpenView } from '../api/content';
import { DocumentPluginRoutePage, type DocumentRouteSource } from './DocumentPluginRoutePage';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { prefetchCardOpenView, readPrefetchedCardOpenView } from '../lib/card-open-view-prefetch';
import { getErrorMessage } from '../lib/ui';

const CARD_STATUS_POLL_MS = 2000;

function resolveCardDocumentUrl(card: CardOpenView): string | null {
  return card.viewState === 'cache_ready' ? card.viewUrl ?? null : null;
}

function isCardViewReady(card: CardOpenView): boolean {
  return card.viewState === 'cache_ready' && Boolean(resolveCardDocumentUrl(card));
}

export default function CardDetailPage() {
  const { t } = useAppPreferences();
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<CardOpenView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cardId) {
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    (readPrefetchedCardOpenView(cardId) ?? prefetchCardOpenView(cardId))
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
    if (!cardId || !card || isCardViewReady(card) || card.status === 'error') {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const status = await cardsApi.getCardRenderStatus(cardId);
        if (cancelled) {
          return;
        }

        setCard((current) =>
          current
            ? {
                ...current,
                viewState: status.viewState,
                viewUrl: status.viewUrl,
                renderStatusUrl: `/api/v1/cards/${cardId}/render-status`,
                renderCache: {
                  status: status.status,
                  generatedAt: null,
                  lastAccessedAt: null,
                  expiresAt: null,
                  errorMessage: status.error?.message ?? null,
                },
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

  const documentUrl = card ? resolveCardDocumentUrl(card) : null;
  const source: DocumentRouteSource | null =
    cardId && card && isCardViewReady(card) && documentUrl
      ? {
          kind: 'community-card',
          cardId,
          title: card.title,
          createdAt: card.createdAt,
          documentUrl,
          viewUrl: documentUrl,
          canonicalUrl: `/cards/${cardId}`,
          ...(card.coverUrl ? { coverUrl: card.coverUrl } : undefined),
          ...(card.coverFragmentUrl ? { coverFragmentUrl: card.coverFragmentUrl } : undefined),
          ...(card.coverRenderMode ? { coverRenderMode: card.coverRenderMode } : undefined),
          ...(card.coverRatio ? { coverRatio: card.coverRatio } : undefined),
        }
      : null;

  return (
    <DocumentPluginRoutePage
      source={source}
      loading={loading}
      error={
        error ||
        (card?.status === 'error' || card?.viewState === 'render_error'
          ? card.renderCache?.errorMessage || t('card.errorState')
          : '')
      }
      pendingLabel={t('card.notReady')}
      trigger="community-card-route"
    />
  );
}

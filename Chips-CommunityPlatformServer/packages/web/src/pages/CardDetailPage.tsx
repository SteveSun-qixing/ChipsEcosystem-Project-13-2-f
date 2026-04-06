import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cardsApi, type CardDetail } from '../api/content';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage } from '../lib/ui';
import './DetailPage.css';

const CARD_REDIRECT_LOADER_DELAY_MS = 180;

export default function CardDetailPage() {
  const { t } = useAppPreferences();
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRedirectLoader, setShowRedirectLoader] = useState(false);

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
    if (card?.status === 'ready' && card.htmlUrl) {
      window.location.replace(card.htmlUrl);
    }
  }, [card]);

  const waitingState = loading || (!!card && card.status !== 'error' && !error);

  useEffect(() => {
    if (!waitingState) {
      setShowRedirectLoader(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowRedirectLoader(true);
    }, CARD_REDIRECT_LOADER_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [waitingState]);

  if (waitingState) {
    return showRedirectLoader ? (
      <div className="detail-transition-shell">
        <span className="detail-transition-spinner" />
      </div>
    ) : null;
  }

  if (error || !card) {
    return (
      <div className="page-container detail-page">
        <section className="panel error-panel">
          <h1>{error || t('detail.notFound')}</h1>
        </section>
      </div>
    );
  }

  return null;
}

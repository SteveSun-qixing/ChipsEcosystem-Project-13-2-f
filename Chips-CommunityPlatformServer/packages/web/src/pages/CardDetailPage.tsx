import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cardsApi, type CardDetail } from '../api/content';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage } from '../lib/ui';

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

  if (loading) {
    return <div className="container loading-screen">{t('common.loading')}</div>;
  }

  if (error || !card) {
    return <div className="container empty-state">{error || t('detail.notFound')}</div>;
  }

  if (card.status === 'error') {
    return <div className="container empty-state">{t('card.errorState')}</div>;
  }

  return <div className="container loading-screen">{t('common.loading')}</div>;
}

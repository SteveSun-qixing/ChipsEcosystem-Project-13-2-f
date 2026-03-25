import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { boxesApi, type BoxDetail } from '../api/content';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { formatBytes, getErrorMessage } from '../lib/ui';
import './DetailPage.css';

export default function BoxDetailPage() {
  const { t, formatDate } = useAppPreferences();
  const { boxId } = useParams<{ boxId: string }>();
  const [box, setBox] = useState<BoxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!boxId) {
      return;
    }

    let active = true;

    boxesApi
      .getBox(boxId)
      .then((response) => {
        if (active) {
          setBox(response);
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
  }, [boxId, t]);

  if (loading) {
    return <div className="container loading-screen">{t('common.loading')}</div>;
  }

  if (error || !box) {
    return <div className="container empty-state">{error || t('detail.notFound')}</div>;
  }

  const entries = box.cards ?? [];

  return (
    <div className="container detail-page stack-xl">
      <header className="surface-panel detail-hero">
        <div className="stack-md">
          <span className="eyebrow">{t('box.summaryTitle')}</span>
          <h1>{box.title}</h1>
          <div className="cluster">
            <span>{box.visibility === 'public' ? t('common.public') : t('common.private')}</span>
            <span>{formatDate(box.createdAt)}</span>
            <span>{formatBytes(box.fileSizeBytes)}</span>
          </div>
          <div className="cluster">
            {box.user ? (
              <Link to={`/@${box.user.username}`} className="button button-secondary">
                {t('detail.ownerSpace')}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="detail-grid">
        <aside className="surface-card stack-lg detail-sidebar">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('box.summaryTitle')}</span>
              <h2>{t('box.summaryTitle')}</h2>
            </div>
          </div>

          <dl className="meta-list">
            <div>
              <dt>{t('common.owner')}</dt>
              <dd>{box.user?.displayName || box.user?.username || '—'}</dd>
            </div>
            <div>
              <dt>{t('common.layout')}</dt>
              <dd>{box.layoutPlugin || '—'}</dd>
            </div>
            <div>
              <dt>{t('box.identifierLabel')}</dt>
              <dd>{box.boxFileId || '—'}</dd>
            </div>
            <div>
              <dt>{t('common.updatedAt')}</dt>
              <dd>{formatDate(box.updatedAt)}</dd>
            </div>
          </dl>
        </aside>

        <section className="surface-card stack-lg">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('box.referenceTitle')}</span>
              <h2>{t('box.referenceTitle')}</h2>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="empty-state">{t('box.empty')}</div>
          ) : (
            <div className="reference-list">
              {entries.map((entry) => (
                <article key={`${entry.url}-${entry.card_id ?? ''}`} className="reference-card">
                  <div className="stack-sm">
                    <strong>{entry.title || entry.card_id || entry.url}</strong>
                    <span>{entry.cover_url || entry.url}</span>
                  </div>
                  <div className="cluster">
                    {entry.communityCardId ? (
                      <Link to={`/cards/${entry.communityCardId}`} className="button button-secondary">
                        {t('box.communityCard')}
                      </Link>
                    ) : null}
                    <a href={entry.communityHtmlUrl || entry.url} target="_blank" rel="noreferrer" className="button button-ghost">
                      {t('box.sourceLink')}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

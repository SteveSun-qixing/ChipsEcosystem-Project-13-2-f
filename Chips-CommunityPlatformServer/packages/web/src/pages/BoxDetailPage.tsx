import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { boxesApi, type BoxDetail } from '../api/content';
import { DocumentPluginRoutePage, type DocumentRouteSource } from './DocumentPluginRoutePage';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage } from '../lib/ui';

export default function BoxDetailPage() {
  const { t } = useAppPreferences();
  const { boxId } = useParams<{ boxId: string }>();
  const [box, setBox] = useState<BoxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!boxId) {
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

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

  const source: DocumentRouteSource | null =
    boxId && box?.documentUrl
      ? {
          kind: 'community-box',
          boxId,
          title: box.title,
          createdAt: box.createdAt,
          documentUrl: box.documentUrl,
          canonicalUrl: `/boxes/${boxId}`,
          ...(box.coverUrl ? { coverUrl: box.coverUrl } : undefined),
          ...(box.coverFragmentUrl ? { coverFragmentUrl: box.coverFragmentUrl } : undefined),
          ...(box.coverRenderMode ? { coverRenderMode: box.coverRenderMode } : undefined),
          ...(box.coverRatio ? { coverRatio: box.coverRatio } : undefined),
        }
      : null;

  return (
    <div className="page-container detail-page">
      <header className="panel detail-hero">
        <div className="detail-hero__content">
          <span className="eyebrow">{t('box.summaryTitle')}</span>
          <h1>{box.title}</h1>
          <div className="detail-meta">
            <span>{box.visibility === 'public' ? t('common.public') : t('common.private')}</span>
            <span>{formatDate(box.createdAt)}</span>
            <span>{formatBytes(box.fileSizeBytes)}</span>
          </div>

          <div className="detail-actions">
            {box.user ? (
              <Link to={`/@${box.user.username}`} className="button button--secondary">
                {t('detail.ownerSpace')}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="detail-grid">
        <aside className="panel detail-sidebar">
          <div className="detail-section-heading">
            <div>
              <span className="eyebrow">{t('box.summaryTitle')}</span>
              <h2>{t('box.summaryTitle')}</h2>
            </div>
          </div>

          <dl className="detail-list">
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

        <section className="panel detail-content">
          <div className="detail-section-heading">
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
                  <div className="reference-card__copy">
                    <strong>{entry.title || entry.card_id || entry.url}</strong>
                    <span>{entry.cover_url || entry.url}</span>
                  </div>

                  <div className="reference-card__actions">
                    {entry.communityCardId ? (
                      <Link to={`/cards/${entry.communityCardId}`} className="button button--secondary">
                        {t('box.communityCard')}
                      </Link>
                    ) : null}
                    <a href={entry.communityViewUrl || entry.url} target="_blank" rel="noreferrer" className="button button--ghost">
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

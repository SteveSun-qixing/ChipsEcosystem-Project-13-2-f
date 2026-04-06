import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { spaceApi } from '../api/rooms';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage, getInitial } from '../lib/ui';
import './SpacePage.css';

export default function SpacePage() {
  const { t, formatDate } = useAppPreferences();
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof spaceApi.getUserSpace>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username) return;

    let active = true;

    setLoading(true);
    setError('');

    spaceApi
      .getUserSpace(username)
      .then((response) => {
        if (active) {
          setData(response);
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
  }, [t, username]);

  if (loading) return <div className="container loading-screen">{t('common.loading')}</div>;
  if (error) return <div className="container empty-state">{error}</div>;
  if (!data) return null;

  const { user, rooms, rootCards, rootBoxes } = data;

  return (
    <div className="space-page container stack-xl">
      <header className="space-hero surface-panel">
        <div className="space-hero__identity">
          <div className="space-hero__avatar">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName || user.username} />
            ) : (
              <div className="space-avatar-placeholder">{getInitial(user.displayName || user.username)}</div>
            )}
          </div>
          <div className="stack-sm">
            <span className="eyebrow">{t('space.title', { name: user.displayName || user.username })}</span>
            <h1>{user.displayName || user.username}</h1>
            <p className="supporting-text">@{user.username}</p>
            <p>{user.bio || t('common.noDescription')}</p>
            <div className="space-hero__meta">
              <span>{formatDate(user.createdAt)}</span>
              {data.isOwner ? <span className="status-pill status-pill--success">{t('common.manage')}</span> : null}
            </div>
            {data.isOwner ? (
              <div className="cluster">
                <Link to="/dashboard" className="button button-secondary">
                  {t('space.ownerCta')}
                </Link>
                <Link to="/upload" className="button button-primary">
                  {t('space.publishCta')}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="stack-xl">
        {rooms.length > 0 && (
          <section className="stack-lg">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t('common.rooms')}</span>
                <h2>{t('common.rooms')}</h2>
              </div>
            </div>
            <div className="tile-grid">
              {rooms.map((room) => (
                <Link key={room.id} to={`/@${user.username}/rooms/${room.slug}`} className="content-tile">
                  {room.coverUrl ? (
                    <div className="content-tile__cover">
                      <img src={room.coverUrl} alt={room.name} loading="lazy" />
                    </div>
                  ) : (
                    <div className="content-tile__cover content-tile__cover--room">
                      <span>{getInitial(room.name)}</span>
                    </div>
                  )}
                  <div className="content-tile__body">
                    <strong>{room.name}</strong>
                    <span>{`${room.cardCount} / ${room.boxCount}`}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {rootBoxes.length > 0 && (
          <section className="stack-lg">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t('space.rootBoxes')}</span>
                <h2>{t('space.rootBoxes')}</h2>
              </div>
            </div>
            <div className="tile-grid">
              {rootBoxes.map((box) => (
                <Link key={box.id} to={`/boxes/${box.id}`} className="content-tile">
                  <div className="content-tile__cover content-tile__cover--box">
                    <span>{getInitial(box.title)}</span>
                  </div>
                  <div className="content-tile__body">
                    <strong>{box.title}</strong>
                    <span>{box.layoutPlugin || t('common.noDescription')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {rootCards.length > 0 && (
          <section className="stack-lg">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t('space.rootCards')}</span>
                <h2>{t('space.rootCards')}</h2>
              </div>
            </div>
            <div className="tile-grid">
              {rootCards.map((card) => (
                <Link key={card.id} to={`/cards/${card.id}`} className="content-tile">
                  <div className="content-tile__cover">
                    {card.coverUrl ? (
                      <img src={card.coverUrl} alt={card.title} loading="lazy" />
                    ) : (
                      <span>{getInitial(card.title)}</span>
                    )}
                  </div>
                  <div className="content-tile__body">
                    <strong>{card.title}</strong>
                    <span>{formatDate(card.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {rooms.length === 0 && rootBoxes.length === 0 && rootCards.length === 0 && (
          <div className="empty-state surface-panel">{t('space.empty')}</div>
        )}
      </main>
    </div>
  );
}

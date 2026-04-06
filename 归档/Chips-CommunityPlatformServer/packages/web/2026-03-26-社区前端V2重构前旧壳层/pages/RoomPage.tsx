import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { roomsApi, type Room, type RoomContents } from '../api/rooms';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage, getInitial } from '../lib/ui';
import './DetailPage.css';

interface RoomPageState {
  user: Awaited<ReturnType<typeof authApi.getUserProfile>>;
  room: Room;
  contents: RoomContents;
}

export default function RoomPage() {
  const { t, formatDate } = useAppPreferences();
  const { username, roomSlug } = useParams<{ username: string; roomSlug: string }>();
  const [state, setState] = useState<RoomPageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username || !roomSlug) {
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const [profile, roomList] = await Promise.all([
          authApi.getUserProfile(username),
          roomsApi.getUserRooms(username),
        ]);

        const room = roomList.find((item) => item.slug === roomSlug || item.id === roomSlug);
        if (!room) {
          throw new Error(t('room.notFound'));
        }

        const contents = await roomsApi.getRoomContents(room.id);
        if (active) {
          setState({ user: profile, room, contents });
        }
      } catch (nextError) {
        if (active) {
          setError(getErrorMessage(nextError, t('room.notFound')));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [roomSlug, t, username]);

  if (loading) {
    return <div className="container loading-screen">{t('common.loading')}</div>;
  }

  if (error || !state) {
    return <div className="container empty-state">{error || t('room.notFound')}</div>;
  }

  return (
    <div className="container detail-page stack-xl">
      <header className="surface-panel detail-hero">
        <div className="detail-hero__identity">
          {state.user.avatarUrl ? (
            <img src={state.user.avatarUrl} alt={state.user.displayName} className="detail-hero__avatar" />
          ) : (
            <div className="detail-hero__avatar detail-hero__avatar--fallback">
              {getInitial(state.user.displayName || state.user.username)}
            </div>
          )}

          <div className="stack-sm">
            <span className="eyebrow">{state.room.name}</span>
            <h1>{state.room.name}</h1>
            <p>{state.room.description || t('common.noDescription')}</p>
            <div className="cluster">
              <span>{formatDate(state.room.createdAt)}</span>
              <span>{t('room.cardCount', { count: state.room.cardCount })}</span>
              <span>{t('room.boxCount', { count: state.room.boxCount })}</span>
            </div>
            <Link to={`/@${state.user.username}`} className="button button-secondary">
              {t('detail.ownerSpace')}
            </Link>
          </div>
        </div>
      </header>

      <section className="stack-lg">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('room.contentsTitle')}</span>
            <h2>{t('common.cards')}</h2>
          </div>
        </div>
        {(state.contents.cards?.length ?? 0) > 0 ? (
          <div className="tile-grid">
            {state.contents.cards.map((card) => (
              <Link key={card.id} to={`/cards/${card.id}`} className="content-tile">
                <div className="content-tile__cover">
                  {card.coverUrl ? <img src={card.coverUrl} alt={card.title} loading="lazy" /> : <span>{getInitial(card.title)}</span>}
                </div>
                <div className="content-tile__body">
                  <strong>{card.title}</strong>
                  <span>{formatDate(card.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state surface-card">{t('dashboard.noCards')}</div>
        )}
      </section>

      <section className="stack-lg">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('room.contentsTitle')}</span>
            <h2>{t('common.boxes')}</h2>
          </div>
        </div>
        {(state.contents.boxes?.length ?? 0) > 0 ? (
          <div className="tile-grid">
            {state.contents.boxes.map((box) => (
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
        ) : (
          <div className="empty-state surface-card">{t('dashboard.noBoxes')}</div>
        )}
      </section>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { boxesApi, cardsApi, type BoxDetail, type CardDetail } from '../api/content';
import { roomsApi, type Room } from '../api/rooms';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { formatBytes, getErrorMessage, getInitial } from '../lib/ui';
import './DashboardPage.css';

export default function DashboardPage() {
  const { t, formatDate, formatNumber } = useAppPreferences();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cards, setCards] = useState<CardDetail[]>([]);
  const [boxes, setBoxes] = useState<BoxDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ type: 'room' | 'card' | 'box'; id: string } | null>(null);
  const [profileForm, setProfileForm] = useState({ displayName: '', bio: '' });
  const [roomForm, setRoomForm] = useState<{ name: string; description: string; visibility: 'public' | 'private' }>({
    name: '',
    description: '',
    visibility: 'public',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [nextRooms, nextCards, nextBoxes] = await Promise.all([
        roomsApi.getUserRooms(user.username),
        cardsApi.getMyCards({ pageSize: 50 }),
        boxesApi.getMyBoxes({ pageSize: 50 }),
      ]);

      setRooms(nextRooms);
      setCards(nextCards.data);
      setBoxes(nextBoxes.data);
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('common.error')));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      displayName: user.displayName || '',
      bio: user.bio || '',
    });
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(
    () => ({
      roomCount: rooms.length,
      cardCount: cards.length,
      boxCount: boxes.length,
      totalBytes:
        cards.reduce((sum, card) => sum + (card.fileSizeBytes ?? 0), 0) +
        boxes.reduce((sum, box) => sum + (box.fileSizeBytes ?? 0), 0),
    }),
    [boxes, cards, rooms],
  );

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setNotice('');

    try {
      await authApi.updateMe({
        displayName: profileForm.displayName.trim() || undefined,
        bio: profileForm.bio.trim() || undefined,
      });
      setNotice(t('dashboard.profileSaved'));
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('common.error')));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await authApi.uploadAvatar(file);
      setNotice(t('dashboard.profileSaved'));
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('common.error')));
    } finally {
      event.target.value = '';
    }
  };

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingRoom(true);
    setError('');

    try {
      await roomsApi.create({
        name: roomForm.name,
        description: roomForm.description || undefined,
        visibility: roomForm.visibility,
      });

      setRoomForm({ name: '', description: '', visibility: 'public' });
      await loadDashboard();
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('common.error')));
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDelete = async (type: 'room' | 'card' | 'box', id: string) => {
    if (!pendingDelete || pendingDelete.type !== type || pendingDelete.id !== id) {
      setPendingDelete({ type, id });
      return;
    }

    try {
      if (type === 'room') {
        await roomsApi.deleteRoom(id);
      } else if (type === 'card') {
        await cardsApi.deleteCard(id);
      } else {
        await boxesApi.deleteBox(id);
      }

      setPendingDelete(null);
      await loadDashboard();
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('common.error')));
    }
  };

  return (
    <div className="container dashboard-page stack-xl">
      <header className="surface-panel dashboard-hero">
        <div>
          <span className="eyebrow">{t('dashboard.title')}</span>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>
        <div className="dashboard-hero__actions">
          <button type="button" className="button button-secondary" onClick={() => void loadDashboard()}>
            {t('dashboard.refresh')}
          </button>
          <Link to="/upload" className="button button-primary">
            {t('nav.upload')}
          </Link>
        </div>
      </header>

      {error ? <div className="inline-notice inline-notice--danger">{error}</div> : null}
      {notice ? <div className="inline-notice inline-notice--success">{notice}</div> : null}

      <section className="stat-grid">
        <article className="surface-card stat-card">
          <span>{t('common.rooms')}</span>
          <strong>{formatNumber(stats.roomCount)}</strong>
        </article>
        <article className="surface-card stat-card">
          <span>{t('common.cards')}</span>
          <strong>{formatNumber(stats.cardCount)}</strong>
        </article>
        <article className="surface-card stat-card">
          <span>{t('common.boxes')}</span>
          <strong>{formatNumber(stats.boxCount)}</strong>
        </article>
        <article className="surface-card stat-card">
          <span>{t('common.fileSize')}</span>
          <strong>{formatBytes(stats.totalBytes)}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <form className="surface-card stack-lg" onSubmit={handleProfileSubmit}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('common.profile')}</span>
              <h2>{t('common.profile')}</h2>
            </div>
          </div>

          <div className="profile-card">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName ?? user.username} className="profile-card__avatar" />
            ) : (
              <div className="profile-card__avatar profile-card__avatar--fallback">
                {getInitial(user?.displayName || user?.username)}
              </div>
            )}

            <label className="button button-secondary">
              {t('dashboard.avatarUpload')}
              <input type="file" accept="image/*" className="hidden-input" onChange={handleAvatarChange} />
            </label>
          </div>

          <div className="field">
            <label>{t('auth.displayName')}</label>
            <input
              className="input"
              value={profileForm.displayName}
              onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
            />
          </div>

          <div className="field">
            <label>{t('auth.bio')}</label>
            <textarea
              className="textarea"
              value={profileForm.bio}
              onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
            />
          </div>

          <button type="submit" className="button button-primary" disabled={savingProfile}>
            {savingProfile ? t('common.loading') : t('common.save')}
          </button>
        </form>

        <form className="surface-card stack-lg" onSubmit={handleCreateRoom}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('dashboard.createRoomTitle')}</span>
              <h2>{t('dashboard.createRoomTitle')}</h2>
            </div>
          </div>

          <div className="field">
            <label>{t('dashboard.roomName')}</label>
            <input
              className="input"
              value={roomForm.name}
              onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label>{t('dashboard.roomDescription')}</label>
            <textarea
              className="textarea"
              value={roomForm.description}
              onChange={(event) => setRoomForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <div className="field">
            <label>{t('common.visibility')}</label>
            <select
              className="select"
              value={roomForm.visibility}
              onChange={(event) =>
                setRoomForm((current) => ({
                  ...current,
                  visibility: event.target.value as 'public' | 'private',
                }))
              }
            >
              <option value="public">{t('common.public')}</option>
              <option value="private">{t('common.private')}</option>
            </select>
          </div>

          <button type="submit" className="button button-primary" disabled={savingRoom}>
            {savingRoom ? t('common.loading') : t('common.create')}
          </button>
        </form>
      </section>

      <section className="surface-card stack-lg content-visibility-auto">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('dashboard.roomsTitle')}</span>
            <h2>{t('dashboard.roomsTitle')}</h2>
          </div>
          <Link to={`/@${user?.username ?? ''}`} className="button button-ghost">
            {t('nav.mySpace')}
          </Link>
        </div>

        {loading ? (
          <div className="loading-state">{t('common.loading')}</div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">{t('dashboard.noRooms')}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('dashboard.roomName')}</th>
                <th>{t('common.slug')}</th>
                <th>{t('common.visibility')}</th>
                <th>{t('common.cards')}</th>
                <th>{t('common.boxes')}</th>
                <th>{t('common.manage')}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>
                    <Link to={`/@${user?.username}/rooms/${room.slug}`}>{room.name}</Link>
                  </td>
                  <td>{room.slug}</td>
                  <td>
                    <span className={`status-pill ${room.visibility === 'public' ? 'status-pill--success' : 'status-pill--neutral'}`}>
                      {room.visibility === 'public' ? t('common.public') : t('common.private')}
                    </span>
                  </td>
                  <td>{room.cardCount}</td>
                  <td>{room.boxCount}</td>
                  <td>
                    <button type="button" className="button button-danger" onClick={() => void handleDelete('room', room.id)}>
                      {pendingDelete?.type === 'room' && pendingDelete.id === room.id ? t('common.confirm') : t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="surface-card stack-lg content-visibility-auto">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('dashboard.cardsTitle')}</span>
            <h2>{t('dashboard.cardsTitle')}</h2>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">{t('common.loading')}</div>
        ) : cards.length === 0 ? (
          <div className="empty-state">{t('dashboard.noCards')}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.cards')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.visibility')}</th>
                <th>{t('common.fileSize')}</th>
                <th>{t('common.createdAt')}</th>
                <th>{t('common.manage')}</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id}>
                  <td><Link to={`/cards/${card.id}`}>{card.title}</Link></td>
                  <td><span className={`status-pill status-pill--${card.status}`}>{t(`common.${card.status}`)}</span></td>
                  <td>{card.visibility === 'public' ? t('common.public') : t('common.private')}</td>
                  <td>{formatBytes(card.fileSizeBytes)}</td>
                  <td>{formatDate(card.createdAt)}</td>
                  <td>
                    <button type="button" className="button button-danger" onClick={() => void handleDelete('card', card.id)}>
                      {pendingDelete?.type === 'card' && pendingDelete.id === card.id ? t('common.confirm') : t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="surface-card stack-lg content-visibility-auto">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('dashboard.boxesTitle')}</span>
            <h2>{t('dashboard.boxesTitle')}</h2>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">{t('common.loading')}</div>
        ) : boxes.length === 0 ? (
          <div className="empty-state">{t('dashboard.noBoxes')}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.boxes')}</th>
                <th>{t('common.layout')}</th>
                <th>{t('common.visibility')}</th>
                <th>{t('common.fileSize')}</th>
                <th>{t('common.createdAt')}</th>
                <th>{t('common.manage')}</th>
              </tr>
            </thead>
            <tbody>
              {boxes.map((box) => (
                <tr key={box.id}>
                  <td><Link to={`/boxes/${box.id}`}>{box.title}</Link></td>
                  <td>{box.layoutPlugin || t('common.noDescription')}</td>
                  <td>{box.visibility === 'public' ? t('common.public') : t('common.private')}</td>
                  <td>{formatBytes(box.fileSizeBytes)}</td>
                  <td>{formatDate(box.createdAt)}</td>
                  <td>
                    <button type="button" className="button button-danger" onClick={() => void handleDelete('box', box.id)}>
                      {pendingDelete?.type === 'box' && pendingDelete.id === box.id ? t('common.confirm') : t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {pendingDelete ? <p className="supporting-text">{t('dashboard.deleteWarn')}</p> : null}
    </div>
  );
}

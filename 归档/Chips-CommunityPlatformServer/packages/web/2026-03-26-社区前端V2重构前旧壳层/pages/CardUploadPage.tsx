import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { boxesApi, cardsApi, type CardStatus } from '../api/content';
import { roomsApi, type Room } from '../api/rooms';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { formatBytes, getErrorMessage } from '../lib/ui';
import './CardUploadPage.css';

export default function CardUploadPage() {
  const { t } = useAppPreferences();
  const { user } = useAuth();
  const [mode, setMode] = useState<'card' | 'box'>('card');
  const [file, setFile] = useState<File | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [progress, setProgress] = useState(-1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cardStatus, setCardStatus] = useState<CardStatus | null>(null);
  const [resultHref, setResultHref] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    roomsApi
      .getUserRooms(user.username)
      .then((response) => setRooms(response))
      .catch(() => setRooms([]));
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(t('upload.fileRequired'));
      return;
    }

    const expectedExtension = mode === 'card' ? '.card' : '.box';
    if (!file.name.endsWith(expectedExtension)) {
      setError(t('upload.invalidExtension', { extension: expectedExtension }));
      return;
    }

    setError('');
    setProgress(0);
    setSubmitting(true);
    setCardStatus(null);
    setResultHref('');

    try {
      if (mode === 'card') {
        const response = await cardsApi.uploadCard(
          file,
          { roomId: roomId || undefined, visibility },
          (pct) => setProgress(pct),
        );

        setCardStatus({
          cardId: response.cardId,
          status: 'pending',
          errorMessage: null,
          htmlUrl: null,
          updatedAt: new Date().toISOString(),
        });

        for (let attempt = 0; attempt < 120; attempt += 1) {
          const nextStatus = await cardsApi.getCardStatus(response.cardId);
          setCardStatus(nextStatus);

          if (nextStatus.status === 'ready' || nextStatus.status === 'error') {
            setResultHref(`/cards/${response.cardId}`);
            break;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }
      } else {
        const response = await boxesApi.uploadBox(file, {
          roomId: roomId || undefined,
          visibility,
        });
        setResultHref(`/boxes/${response.boxId}`);
        setProgress(100);
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('common.error')));
      setProgress(-1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container upload-page stack-xl">
      <section className="surface-panel stack-lg">
        <span className="eyebrow">{t('upload.title')}</span>
        <h1>{t('upload.title')}</h1>
        <p>{t('upload.subtitle')}</p>

        <div className="segmented-control">
          <button
            type="button"
            className={mode === 'card' ? 'segmented-control__item is-active' : 'segmented-control__item'}
            onClick={() => setMode('card')}
          >
            {t('upload.modeCard')}
          </button>
          <button
            type="button"
            className={mode === 'box' ? 'segmented-control__item is-active' : 'segmented-control__item'}
            onClick={() => setMode('box')}
          >
            {t('upload.modeBox')}
          </button>
        </div>
      </section>

      {error ? <div className="inline-notice inline-notice--danger">{error}</div> : null}

      <form onSubmit={handleUpload} className="upload-layout">
        <section className="surface-card stack-lg">
          <div className="field">
            <label>{t('upload.file')}</label>
            <label className="upload-drop">
              <input
                type="file"
                accept={mode === 'card' ? '.card' : '.box'}
                className="hidden-input"
                onChange={handleFileChange}
                disabled={submitting}
              />
              <span className="upload-drop__title">{file ? file.name : t('upload.file')}</span>
              <span className="supporting-text">
                {file ? formatBytes(file.size) : mode === 'card' ? t('upload.cardHint') : t('upload.boxHint')}
              </span>
            </label>
          </div>

          <div className="field">
            <label>{t('upload.room')}</label>
            <select className="select" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
              <option value="">{t('common.rootDirectory')}</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>{t('upload.visibility')}</label>
            <div className="segmented-control">
              <button
                type="button"
                className={visibility === 'public' ? 'segmented-control__item is-active' : 'segmented-control__item'}
                onClick={() => setVisibility('public')}
              >
                {t('common.public')}
              </button>
              <button
                type="button"
                className={visibility === 'private' ? 'segmented-control__item is-active' : 'segmented-control__item'}
                onClick={() => setVisibility('private')}
              >
                {t('common.private')}
              </button>
            </div>
          </div>

          <button type="submit" className="button button-primary" disabled={!file || submitting}>
            {submitting
              ? t('common.loading')
              : mode === 'card'
                ? t('upload.submitCard')
                : t('upload.submitBox')}
          </button>

          {progress >= 0 ? (
            <div className="progress">
              <div className="progress__bar" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </section>

        <section className="surface-card stack-lg">
          <span className="eyebrow">{t('upload.resultTitle')}</span>
          <h2>{t('upload.resultTitle')}</h2>
          {cardStatus ? (
            <div className="stack-md">
              <span className={`status-pill status-pill--${cardStatus.status}`}>{t(`common.${cardStatus.status}`)}</span>
              <p>
                {cardStatus.status === 'pending' || cardStatus.status === 'processing'
                  ? t('upload.polling')
                  : cardStatus.errorMessage || ''}
              </p>
            </div>
          ) : (
            <p className="supporting-text">{mode === 'card' ? t('upload.cardHint') : t('upload.boxHint')}</p>
          )}

          {resultHref ? (
            <Link to={resultHref} className="button button-secondary">
              {mode === 'card' ? t('upload.toCard') : t('common.view')}
            </Link>
          ) : null}
        </section>
      </form>
    </div>
  );
}

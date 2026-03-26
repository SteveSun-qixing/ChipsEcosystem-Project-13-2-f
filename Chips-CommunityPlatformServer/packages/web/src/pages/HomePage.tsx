import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { discoverApi } from '../api/content';
import type { BoxSummary, CardSummary } from '../api/rooms';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage, getInitial } from '../lib/ui';
import './HomePage.css';

export default function HomePage() {
  const { t, formatDate } = useAppPreferences();
  const { user } = useAuth();
  const [cards, setCards] = useState<CardSummary[]>([]);
  const [boxes, setBoxes] = useState<BoxSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Awaited<ReturnType<typeof discoverApi.search>>['data'] | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    Promise.all([
      discoverApi.getLatestCards({ pageSize: 6 }),
      discoverApi.getLatestBoxes({ pageSize: 6 }),
    ])
      .then(([cardRes, boxRes]) => {
        if (!active) {
          return;
        }

        setCards(cardRes.data);
        setBoxes(boxRes.data);
      })
      .catch((nextError) => {
        if (active) {
          setError(getErrorMessage(nextError, t('common.error')));
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
  }, [t]);

  const searchResultCount = useMemo(() => {
    if (!results) {
      return 0;
    }

    return (
      (results.cards?.length ?? 0) +
      (results.boxes?.length ?? 0) +
      (results.users?.length ?? 0)
    );
  }, [results]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = query.trim();

    if (!keyword) {
      setResults(null);
      return;
    }

    setError('');
    startTransition(() => {
      discoverApi
        .search({ q: keyword, pageSize: 6 })
        .then((response) => setResults(response.data))
        .catch((nextError) => setError(getErrorMessage(nextError, t('common.error'))));
    });
  };

  const primaryHref = user ? '/upload' : '/register';
  const secondaryHref = user ? `/@${user.username}` : '/login';

  return (
    <div className="home-page">
      <section className="hero-panel surface-panel">
        <div className="container hero-panel__grid">
          <div className="hero-panel__copy">
            <span className="eyebrow">{t('brand.name')}</span>
            <h1>{t('home.heroTitle')}</h1>
            <p>{t('home.heroSubtitle')}</p>
            <div className="hero-panel__actions">
              <Link to={primaryHref} className="button button-primary">
                {t('home.heroPrimary')}
              </Link>
              <Link to={secondaryHref} className="button button-secondary">
                {t('home.heroSecondary')}
              </Link>
            </div>
          </div>

          <div className="hero-panel__card surface-card">
            <h2>{t('home.stepsTitle')}</h2>
            <ol className="hero-panel__steps">
              <li>{t('home.stepUpload')}</li>
              <li>{t('home.stepPipeline')}</li>
              <li>{t('home.stepPublish')}</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="container stack-xl">
        <div className="surface-panel search-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('nav.discover')}</span>
              <h2>{t('home.searchTitle')}</h2>
            </div>
          </div>

          <form className="search-panel__form" onSubmit={handleSearch}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="input"
            />
            <button className="button button-primary" type="submit">
              {isPending ? t('common.loading') : t('common.search')}
            </button>
          </form>
          <p className="supporting-text">{t('home.searchHint')}</p>
        </div>

        {error ? <div className="inline-notice inline-notice--danger">{error}</div> : null}

        {results ? (
          <section className="stack-lg">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t('home.resultsTitle')}</span>
                <h2>{`${t('home.resultsTitle')} · ${searchResultCount}`}</h2>
              </div>
            </div>

            {searchResultCount === 0 ? (
              <div className="empty-state surface-panel">{t('home.noSearchResults')}</div>
            ) : (
              <div className="search-results">
                {(results.users?.length ?? 0) > 0 ? (
                  <div className="surface-card stack-md">
                    <h3>{t('common.users')}</h3>
                    <div className="tile-grid tile-grid--compact">
                      {results.users?.map((resultUser) => (
                        <Link key={resultUser.username} to={`/@${resultUser.username}`} className="content-tile">
                          <div className="content-tile__cover content-tile__cover--avatar">
                            {resultUser.avatarUrl ? (
                              <img src={resultUser.avatarUrl} alt={resultUser.displayName} />
                            ) : (
                              <span>{getInitial(resultUser.displayName || resultUser.username)}</span>
                            )}
                          </div>
                          <div className="content-tile__body">
                            <strong>{resultUser.displayName || resultUser.username}</strong>
                            <span>@{resultUser.username}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(results.cards?.length ?? 0) > 0 ? (
                  <div className="surface-card stack-md">
                    <h3>{t('common.cards')}</h3>
                    <div className="tile-grid">
                      {results.cards?.map((card) => (
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
                  </div>
                ) : null}

                {(results.boxes?.length ?? 0) > 0 ? (
                  <div className="surface-card stack-md">
                    <h3>{t('common.boxes')}</h3>
                    <div className="tile-grid">
                      {results.boxes?.map((box) => (
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
                  </div>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        <section className="stack-lg">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('home.latestCards')}</span>
              <h2>{t('home.latestCards')}</h2>
            </div>
          </div>

          {loading ? (
            <div className="loading-state surface-panel">{t('common.loading')}</div>
          ) : (
            <div className="tile-grid">
              {cards.map((card) => (
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
          )}
        </section>

        <section className="stack-lg">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('home.latestBoxes')}</span>
              <h2>{t('home.latestBoxes')}</h2>
            </div>
          </div>

          {loading ? (
            <div className="loading-state surface-panel">{t('common.loading')}</div>
          ) : (
            <div className="tile-grid">
              {boxes.map((box) => (
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
          )}
        </section>
      </section>
    </div>
  );
}

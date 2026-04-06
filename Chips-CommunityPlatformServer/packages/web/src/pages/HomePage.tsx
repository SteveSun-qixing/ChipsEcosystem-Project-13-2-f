import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { discoverApi } from '../api/content';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage, getInitial } from '../lib/ui';
import './HomePage.css';

export default function HomePage() {
  const { t, formatDate } = useAppPreferences();
  const { user } = useAuth();
  const [cards, setCards] = useState<Awaited<ReturnType<typeof discoverApi.getLatestCards>>['data']>([]);
  const [boxes, setBoxes] = useState<Awaited<ReturnType<typeof discoverApi.getLatestBoxes>>['data']>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Awaited<ReturnType<typeof discoverApi.search>>['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    void Promise.all([
      discoverApi.getLatestCards({ pageSize: 4 }),
      discoverApi.getLatestBoxes({ pageSize: 4 }),
    ])
      .then(([cardResponse, boxResponse]) => {
        if (!active) {
          return;
        }

        setCards(cardResponse.data);
        setBoxes(boxResponse.data);
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

  const searchCount = useMemo(() => {
    if (!results) {
      return 0;
    }

    return (results.users?.length ?? 0) + (results.cards?.length ?? 0) + (results.boxes?.length ?? 0);
  }, [results]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();

    const keyword = query.trim();
    if (!keyword) {
      setResults(null);
      return;
    }

    setSearching(true);
    setError('');

    try {
      const response = await discoverApi.search({ q: keyword, pageSize: 5 });
      setResults(response.data);
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('common.error')));
    } finally {
      setSearching(false);
    }
  };

  const primaryHref = user ? `/@${user.username}` : '/register';
  const secondaryHref = '/about';
  const loginHref = '/login';

  return (
    <div className="page-container home-page">
      <section className="panel home-hero">
        <div className="home-hero__copy">
          <span className="eyebrow">{t('brand.name')}</span>
          <h1>{t('home.heroTitle')}</h1>
          <p className="muted">{t('home.heroSubtitle')}</p>

          <div className="home-hero__actions">
            <Link to={primaryHref} className="button button--primary">{t('home.heroPrimary')}</Link>
            <Link to={secondaryHref} className="button button--secondary">{t('home.heroSecondary')}</Link>
            {!user ? (
              <Link to={loginHref} className="button button--ghost">{t('home.heroLogin')}</Link>
            ) : null}
          </div>

          <p className="home-hero__hint">{t('home.loginHint')}</p>
        </div>

        <div className="home-hero__panel">
          <article className="home-orbit-card">
            <span className="eyebrow">{t('home.featureProfileTitle')}</span>
            <strong>{t('home.featureProfileBody')}</strong>
          </article>
          <article className="home-orbit-card">
            <span className="eyebrow">{t('home.featureWorkspaceTitle')}</span>
            <strong>{t('home.featureWorkspaceBody')}</strong>
          </article>
          <article className="home-orbit-card">
            <span className="eyebrow">{t('home.featureAdminTitle')}</span>
            <strong>{t('home.featureAdminBody')}</strong>
          </article>
        </div>
      </section>

      <section className="home-feature-grid">
        {[
          ['home.featureWelcomeTitle', 'home.featureWelcomeBody'],
          ['home.featureProfileTitle', 'home.featureProfileBody'],
          ['home.featureWorkspaceTitle', 'home.featureWorkspaceBody'],
          ['home.featureAdminTitle', 'home.featureAdminBody'],
        ].map(([titleKey, bodyKey]) => (
          <article key={titleKey} className="panel home-feature-card">
            <span className="eyebrow">{t(titleKey)}</span>
            <h2>{t(titleKey)}</h2>
            <p className="muted">{t(bodyKey)}</p>
          </article>
        ))}
      </section>

      <section className="home-discover">
        <div className="home-section-head">
          <div>
            <span className="eyebrow">{t('home.discoverTitle')}</span>
            <h2>{t('home.discoverTitle')}</h2>
            <p className="muted">{t('home.discoverSubtitle')}</p>
          </div>
        </div>

        {loading ? (
          <div className="home-discover__grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="panel skeleton-tile" />
            ))}
          </div>
        ) : (
          <div className="home-discover__grid">
            {cards.map((card) => (
              <Link key={card.id} to={`/cards/${card.id}`} className="home-discover__tile">
                <div className="home-discover__cover">
                  {card.coverUrl ? (
                    <iframe
                      src={card.coverUrl}
                      title={card.title}
                      loading="lazy"
                      sandbox="allow-same-origin"
                      scrolling="no"
                    />
                  ) : (
                    <span>{getInitial(card.title)}</span>
                  )}
                </div>
                <div className="home-discover__body">
                  <strong>{card.title}</strong>
                  <span>{formatDate(card.createdAt)}</span>
                </div>
              </Link>
            ))}

            {boxes.map((box) => (
              <Link key={box.id} to={`/boxes/${box.id}`} className="home-discover__tile">
                <div className="home-discover__cover home-discover__cover--box">
                  {box.coverUrl ? <img src={box.coverUrl} alt={box.title} loading="lazy" /> : <span>{getInitial(box.title)}</span>}
                </div>
                <div className="home-discover__body">
                  <strong>{box.title}</strong>
                  <span>{formatDate(box.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="panel home-search">
        <div className="home-section-head">
          <div>
            <span className="eyebrow">{t('home.searchTitle')}</span>
            <h2>{t('home.searchTitle')}</h2>
          </div>
          {user ? (
            <Link to="/workspace" className="button button--secondary">{t('home.openWorkspace')}</Link>
          ) : null}
        </div>

        <form className="home-search__form" onSubmit={(event) => void handleSearch(event)}>
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('home.searchPlaceholder')}
          />
          <button type="submit" className="button button--primary" disabled={searching}>
            {searching ? t('common.loading') : t('common.open')}
          </button>
        </form>

        {error ? <div className="inline-notice inline-notice--danger">{error}</div> : null}

        {results ? (
          searchCount > 0 ? (
            <div className="home-search__results">
              {results.users?.map((resultUser) => (
                <Link key={resultUser.username} to={`/@${resultUser.username}`} className="panel search-result-card">
                  <strong>{resultUser.displayName || resultUser.username}</strong>
                  <span>@{resultUser.username}</span>
                </Link>
              ))}
              {results.cards?.map((card) => (
                <Link key={card.id} to={`/cards/${card.id}`} className="panel search-result-card">
                  <strong>{card.title}</strong>
                  <span>{t('common.card')}</span>
                </Link>
              ))}
              {results.boxes?.map((box) => (
                <Link key={box.id} to={`/boxes/${box.id}`} className="panel search-result-card">
                  <strong>{box.title}</strong>
                  <span>{t('common.box')}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="panel empty-panel">{t('home.searchEmpty')}</div>
          )
        ) : null}
      </section>

      <section className="panel home-about-callout">
        <span className="eyebrow">{t('home.aboutBlockTitle')}</span>
        <h2>{t('home.aboutBlockTitle')}</h2>
        <p className="muted">{t('home.aboutBlockBody')}</p>
      </section>
    </div>
  );
}

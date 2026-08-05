import { Link } from 'react-router-dom';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import './HomePage.css';

const ideaCards = [
  { titleKey: 'home.ideaSlowTitle', bodyKey: 'home.ideaSlowBody', tone: 'mint' },
  { titleKey: 'home.ideaModularTitle', bodyKey: 'home.ideaModularBody', tone: 'peach' },
  { titleKey: 'home.ideaCreatorTitle', bodyKey: 'home.ideaCreatorBody', tone: 'sky' },
] as const;

const floatingCards = [
  { labelKey: 'home.floatCardProfile', className: 'home-card-cloud__card--profile' },
  { labelKey: 'home.floatCardBox', className: 'home-card-cloud__card--box' },
  { labelKey: 'home.floatCardCard', className: 'home-card-cloud__card--card' },
] as const;

export default function HomePage() {
  const { t } = useAppPreferences();
  const { user } = useAuth();
  const primaryHref = user ? `/@${user.username}` : '/register';

  return (
    <div className="home-simple">
      <section className="home-simple__hero" aria-labelledby="home-title">
        <div className="home-simple__copy">
          <p className="home-simple__eyebrow">{t('brand.name')}</p>
          <h1 id="home-title">{t('home.heroTitle')}</h1>
          <p className="home-simple__lead">{t('home.heroSubtitle')}</p>
          <p className="home-simple__belief">{t('home.belief')}</p>

          <nav className="home-simple__actions" aria-label={t('home.actionLabel')}>
            <Link to={primaryHref} className="home-simple__button home-simple__button--primary">
              {user ? t('home.openProfile') : t('home.heroPrimary')}
            </Link>
            <Link to="/about" className="home-simple__button home-simple__button--soft">
              {t('home.heroSecondary')}
            </Link>
            {!user ? (
              <Link to="/login" className="home-simple__button home-simple__button--quiet">
                {t('home.heroLogin')}
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="home-card-cloud" aria-label={t('home.visualLabel')}>
          {floatingCards.map((card) => (
            <div key={card.labelKey} className={`home-card-cloud__card ${card.className}`}>
              <span>{t(card.labelKey)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-simple__ideas" aria-label={t('home.ideasLabel')}>
        {ideaCards.map((card) => (
          <article key={card.titleKey} className={`home-idea-card home-idea-card--${card.tone}`}>
            <span className="home-idea-card__spark" />
            <h2>{t(card.titleKey)}</h2>
            <p>{t(card.bodyKey)}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

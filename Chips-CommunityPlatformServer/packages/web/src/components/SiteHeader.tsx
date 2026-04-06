import { Link, NavLink } from 'react-router-dom';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';

export function SiteHeader() {
  const { t } = useAppPreferences();
  const { user, isAuthenticated, logout } = useAuth();
  const showCreatorNav = isAuthenticated && user?.role !== 'admin';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-brand">
          <span className="site-brand__mark" />
          <div>
            <strong>{t('brand.name')}</strong>
            <span>{t('brand.tagline')}</span>
          </div>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <NavLink to="/" end>{t('nav.home')}</NavLink>
          <NavLink to="/about">{t('nav.about')}</NavLink>
          {showCreatorNav && user ? <NavLink to={`/@${user.username}`}>{t('nav.profile')}</NavLink> : null}
          {showCreatorNav ? <NavLink to="/workspace">{t('nav.workspace')}</NavLink> : null}
        </nav>

        <div className="site-actions">
          {isAuthenticated && user ? (
            <>
              <Link to={`/@${user.username}`} className="button button--ghost">{user.username}</Link>
              <button type="button" className="button button--secondary" onClick={() => void logout()}>
                {t('common.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="button button--ghost">{t('nav.login')}</Link>
              <Link to="/register" className="button button--primary">{t('nav.register')}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

import { Link } from 'react-router-dom';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';

export function SiteFooter() {
  const { t } = useAppPreferences();
  const { user, isAuthenticated } = useAuth();
  const creatorUser = isAuthenticated && user?.role !== 'admin' ? user : null;

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span className="site-footer__brand">{t('footer.brand')}</span>

        <nav className="site-footer__links" aria-label={t('footer.ariaLabel')}>
          <Link to="/about">{t('footer.about')}</Link>
          {creatorUser ? (
            <>
              <Link to={`/@${creatorUser.username}`}>{t('footer.profile')}</Link>
              <Link to="/workspace">{t('footer.workspace')}</Link>
            </>
          ) : null}
          {!isAuthenticated ? (
            <>
              <Link to="/login">{t('footer.login')}</Link>
              <Link to="/register">{t('footer.register')}</Link>
            </>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}

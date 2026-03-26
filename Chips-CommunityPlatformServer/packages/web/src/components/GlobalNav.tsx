import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getInitial } from '../lib/ui';
import './GlobalNav.css';

export function GlobalNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const { locale, setLocale, themeId, setThemeId, t } = useAppPreferences();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (targetPath: string) =>
    location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: t('nav.home') },
    { to: '/upload', label: t('nav.upload'), requiresAuth: true },
    { to: '/dashboard', label: t('nav.workspace'), requiresAuth: true },
  ].filter((item) => !item.requiresAuth || isAuthenticated);

  return (
    <nav className="global-nav">
      <div className="container global-nav__inner">
        <div className="global-nav__left">
          <Link to="/" className="global-nav__brand">
            <span className="global-nav__logo">CC</span>
            <div className="global-nav__brand-copy">
              <strong>{t('brand.name')}</strong>
              <span>{t('brand.tagline')}</span>
            </div>
          </Link>

          <div className="global-nav__links">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={isActive(item.to) ? 'global-nav__link is-active' : 'global-nav__link'}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="global-nav__right">
          <label className="global-nav__control">
            <span>{t('common.language')}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as 'zh-CN' | 'en-US')}>
              <option value="zh-CN">{t('common.localeChinese')}</option>
              <option value="en-US">{t('common.localeEnglish')}</option>
            </select>
          </label>

          <label className="global-nav__control">
            <span>{t('common.theme')}</span>
            <select
              value={themeId}
              onChange={(event) =>
                setThemeId(event.target.value as 'chips-community.midnight' | 'chips-community.paper')
              }
            >
              <option value="chips-community.midnight">{t('common.darkTheme')}</option>
              <option value="chips-community.paper">{t('common.lightTheme')}</option>
            </select>
          </label>

          {isAuthenticated && user ? (
            <>
              <Link to={`/@${user.username}`} className="global-nav__identity">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName ?? user.username} className="global-nav__avatar" />
                ) : (
                  <span className="global-nav__avatar global-nav__avatar--fallback">
                    {getInitial(user.displayName ?? user.username)}
                  </span>
                )}
                <span className="global-nav__identity-copy">
                  <strong>{user.displayName || user.username}</strong>
                  <small>@{user.username}</small>
                </span>
              </Link>

              {user.role === 'admin' ? (
                <a href="/admin/" className="button button-secondary">
                  {t('nav.admin')}
                </a>
              ) : null}

              <button onClick={handleLogout} className="button button-ghost" type="button">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="button button-ghost">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="button button-primary">
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

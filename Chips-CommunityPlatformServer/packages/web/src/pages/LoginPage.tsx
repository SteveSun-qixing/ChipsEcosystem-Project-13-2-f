import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage, getPostAuthPath } from '../lib/ui';
import './AuthForm.css';

export default function LoginPage() {
  const { t } = useAppPreferences();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t('auth.validation.required'));
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const profile = await login(username, password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(getPostAuthPath(profile, from), { replace: true });
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container auth-page">
      <section className="panel auth-card">
        <div className="auth-card__top">
          <span className="eyebrow">{t('brand.name')}</span>
          <h1>{t('auth.loginTitle')}</h1>
          <p className="muted">{t('auth.loginSubtitle')}</p>
        </div>

        {error ? <div className="inline-notice inline-notice--danger">{error}</div> : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label htmlFor="username">{t('auth.username')}</label>
            <input
              id="username"
              type="text"
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="field">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="button button--primary auth-form__submit" disabled={loading}>
            {loading ? t('common.loading') : t('auth.loginAction')}
          </button>
        </form>

        <p className="auth-card__footer">
          {t('auth.noAccount')} <Link to="/register">{t('auth.toRegister')}</Link>
        </p>
      </section>
    </div>
  );
}

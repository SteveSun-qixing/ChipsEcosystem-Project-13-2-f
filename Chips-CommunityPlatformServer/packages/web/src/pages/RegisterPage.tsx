import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage, getPostAuthPath } from '../lib/ui';
import './AuthForm.css';

export default function RegisterPage() {
  const { t } = useAppPreferences();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError(t('auth.validation.required'));
      return;
    }
    
    if (username.length < 3 || username.length > 32) {
      setError(t('auth.validation.usernameLength'));
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError(t('auth.validation.usernamePattern'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.validation.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.validation.passwordMismatch'));
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const profile = await register(username, password);
      navigate(getPostAuthPath(profile), { replace: true });
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
          <h1>{t('auth.registerTitle')}</h1>
          <p className="muted">{t('auth.registerSubtitle')}</p>
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
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="button button--primary auth-form__submit" disabled={loading}>
            {loading ? t('common.loading') : t('auth.registerAction')}
          </button>
        </form>

        <p className="auth-card__footer">
          {t('auth.hasAccount')} <Link to="/login">{t('auth.toLogin')}</Link>
        </p>
      </section>
    </div>
  );
}

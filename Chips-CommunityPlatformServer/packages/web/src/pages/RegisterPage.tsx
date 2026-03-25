import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage } from '../lib/ui';
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
      await register(username, password);
      navigate('/dashboard', { replace: true });
    } catch (nextError) {
      setError(getErrorMessage(nextError, t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container">
      <div className="auth-layout">
        <section className="auth-panel surface-panel">
          <span className="eyebrow">{t('brand.name')}</span>
          <h1>{t('auth.registerTitle')}</h1>
          <p>{t('auth.registerSubtitle')}</p>
          {error ? <div className="inline-notice inline-notice--danger">{error}</div> : null}

          <form onSubmit={handleSubmit} className="stack-lg">
            <div className="field">
              <label htmlFor="username">{t('auth.username')}</label>
              <input
                id="username"
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="button button-primary button-block" disabled={loading}>
              {loading ? t('common.loading') : t('auth.registerAction')}
            </button>
          </form>

          <p className="supporting-text">
            {t('auth.hasAccount')} <Link to="/login">{t('auth.toLogin')}</Link>
          </p>
        </section>

        <aside className="auth-side surface-card">
          <h2>{t('home.stepsTitle')}</h2>
          <ol className="stack-md">
            <li>{t('home.stepUpload')}</li>
            <li>{t('home.stepPipeline')}</li>
            <li>{t('home.stepPublish')}</li>
          </ol>
        </aside>
      </div>
    </div>
  );
}

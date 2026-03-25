import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage } from '../lib/ui';
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
      await login(username, password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
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
          <h1>{t('auth.loginTitle')}</h1>
          <p>{t('auth.loginSubtitle')}</p>
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
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="button button-primary button-block" disabled={loading}>
              {loading ? t('common.loading') : t('auth.loginAction')}
            </button>
          </form>

          <p className="supporting-text">
            {t('auth.noAccount')} <Link to="/register">{t('auth.toRegister')}</Link>
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

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../runtime/icons/Icon';
import './WorkspacePage.css';

export default function WorkspacePage() {
  const { t } = useAppPreferences();
  const { user } = useAuth();
  const profileHref = useMemo(() => (user ? `/@${user.username}` : '/login'), [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="page-container workspace-page">
      <header className="workspace-page__header">
        <div>
          <span className="eyebrow">{t('workspace.title')}</span>
          <h1>{t('workspace.title')}</h1>
          <p className="muted">{t('workspace.subtitle')}</p>
        </div>

        <Link to={profileHref} className="button button--secondary">
          <Icon name="arrow-left" size={16} />
          {t('workspace.backToProfile')}
        </Link>
      </header>

      <section className="panel workspace-client-publish">
        <div className="workspace-client-publish__icon" aria-hidden="true">
          <Icon name="upload" size={28} />
        </div>
        <div className="workspace-client-publish__copy">
          <h2>{t('workspace.clientOnlyTitle')}</h2>
          <p>{t('workspace.clientOnlyBody')}</p>
        </div>
        <div className="workspace-client-publish__steps" aria-label={t('workspace.clientOnlyStepsLabel')}>
          <article>
            <strong>{t('workspace.clientOnlyStepCreate')}</strong>
            <span>{t('workspace.clientOnlyStepCreateBody')}</span>
          </article>
          <article>
            <strong>{t('workspace.clientOnlyStepPublish')}</strong>
            <span>{t('workspace.clientOnlyStepPublishBody')}</span>
          </article>
          <article>
            <strong>{t('workspace.clientOnlyStepView')}</strong>
            <span>{t('workspace.clientOnlyStepViewBody')}</span>
          </article>
        </div>
      </section>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import './AboutPage.css';

export default function AboutPage() {
  const { t } = useAppPreferences();

  const sections = [
    ['about.sectionProduct', 'about.sectionProductBody'],
    ['about.sectionArchitecture', 'about.sectionArchitectureBody'],
    ['about.sectionWorkflow', 'about.sectionWorkflowBody'],
    ['about.sectionPlugins', 'about.sectionPluginsBody'],
  ] as const;

  return (
    <div className="page-container about-page">
      <section className="panel about-hero">
        <span className="eyebrow">{t('about.title')}</span>
        <h1>{t('about.title')}</h1>
        <p className="muted">{t('about.subtitle')}</p>
        <Link to="/" className="button button--secondary">{t('about.backHome')}</Link>
      </section>

      <section className="about-grid">
        {sections.map(([titleKey, bodyKey]) => (
          <article key={titleKey} className="panel about-card">
            <span className="eyebrow">{t(titleKey)}</span>
            <h2>{t(titleKey)}</h2>
            <p className="muted">{t(bodyKey)}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

import { useEffect } from 'react';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getAdminHref } from '../lib/ui';

export default function AdminRedirectPage() {
  const { t } = useAppPreferences();
  const adminHref = getAdminHref();

  useEffect(() => {
    window.location.assign(adminHref);
  }, [adminHref]);

  return (
    <div className="page-container">
      <section className="panel error-panel">
        <h1>{t('admin.redirectTitle')}</h1>
        <p>{t('admin.redirectBody')}</p>
        <a href={adminHref} className="button button--primary">
          {t('admin.redirectAction')}
        </a>
      </section>
    </div>
  );
}

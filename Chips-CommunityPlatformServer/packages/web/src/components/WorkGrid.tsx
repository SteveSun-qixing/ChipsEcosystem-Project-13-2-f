import { Link } from 'react-router-dom';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { Icon } from '../runtime/icons/Icon';
import { getCommunityWorkSelectionKey, type CommunityWorkItem } from '../types/community';
import { WorkTile } from './WorkTile';

interface WorkGridProps {
  items: CommunityWorkItem[];
  isOwner: boolean;
  manageMode: boolean;
  selectedWorkKeys: ReadonlySet<string>;
  manageError: string;
  isDeleting: boolean;
  onToggleManageMode: () => void;
  onToggleWorkSelection: (item: CommunityWorkItem) => void;
  onDeleteSelectedWorks: () => void;
}

export function WorkGrid({
  items,
  isOwner,
  manageMode,
  selectedWorkKeys,
  manageError,
  isDeleting,
  onToggleManageMode,
  onToggleWorkSelection,
  onDeleteSelectedWorks,
}: WorkGridProps) {
  const { t } = useAppPreferences();
  const workCount = items.length;

  return (
    <section className="works-section">
      <div className="works-section__header">
        <div>
          <h2>{t('profile.collectionTitle')}</h2>
        </div>

        {isOwner ? (
          <div className="works-section__actions">
            <Link to="/workspace" className="button button--primary button--icon" aria-label={t('profile.openWorkspace')}>
              <Icon name="plus" />
            </Link>
            <button
              type="button"
              className={`button ${manageMode ? 'button--primary' : 'button--secondary'}`}
              onClick={onToggleManageMode}
              disabled={isDeleting || workCount === 0}
            >
              {manageMode ? t('profile.manageDone') : t('profile.manageAction')}
            </button>
          </div>
        ) : null}
      </div>

      {isOwner && manageMode ? (
        <div className="panel works-section__manage-bar">
          <div className="works-section__manage-copy">
            <strong>{t('profile.manageTitle')}</strong>
            <p className="muted">{t('profile.manageHint')}</p>
            {manageError ? <div className="inline-notice inline-notice--danger">{manageError}</div> : null}
          </div>

          <div className="works-section__manage-actions">
            <span className="works-section__manage-count">
              {t('profile.manageSelectedCount', { count: selectedWorkKeys.size })}
            </span>
            <button
              type="button"
              className="button button--secondary"
              onClick={onDeleteSelectedWorks}
              disabled={isDeleting || selectedWorkKeys.size === 0}
            >
              {isDeleting ? t('profile.manageDeleting') : t('profile.manageDelete')}
            </button>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="work-grid">
          {items.map((item) => (
            <WorkTile
              key={`${item.type}-${item.id}`}
              item={item}
              manageMode={manageMode}
              selected={selectedWorkKeys.has(getCommunityWorkSelectionKey(item))}
              onToggleSelection={onToggleWorkSelection}
            />
          ))}
        </div>
      ) : (
        <div className="works-section__empty">{t('profile.empty')}</div>
      )}
    </section>
  );
}

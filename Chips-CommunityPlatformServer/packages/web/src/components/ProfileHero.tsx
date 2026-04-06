import type { PublicUserProfile } from '../api/auth';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getInitial } from '../lib/ui';
import { Icon } from '../runtime/icons/Icon';

interface ProfileHeroProps {
  user: PublicUserProfile;
  isOwner: boolean;
  onOpenSettings: () => void;
}

export function ProfileHero({ user, isOwner, onOpenSettings }: ProfileHeroProps) {
  const { t } = useAppPreferences();
  const displayName = user.displayName || user.username;

  return (
    <header className="profile-hero">
      <div className="profile-hero__main">
        <div className="profile-hero__avatar-shell">
          <div className="profile-hero__avatar">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={displayName} />
            ) : (
              <span>{getInitial(displayName)}</span>
            )}
          </div>
        </div>

        <div className={`profile-hero__content${isOwner ? ' profile-hero__content--owner' : ''}`}>
          {isOwner ? (
            <div className="profile-hero__toolbar">
              <button
                type="button"
                className="button button--secondary profile-hero__settings"
                onClick={onOpenSettings}
                aria-label={t('profile.settingsOpen')}
              >
                <Icon name="settings" />
                <span>{t('profile.settingsOpen')}</span>
              </button>
            </div>
          ) : null}
          <h1>{displayName}</h1>
          <p className="profile-hero__username">@{user.username}</p>
          <p className="profile-hero__bio">{user.bio || t('common.noDescription')}</p>
        </div>
      </div>
    </header>
  );
}

import { useEffect, useId, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import type { PublicUserProfile } from '../api/auth';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getErrorMessage, getInitial } from '../lib/ui';

const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;

export interface ProfileSettingsPayload {
  displayName: string;
  bio: string;
  avatarFile: File | null;
}

interface ProfileSettingsDialogProps {
  isOpen: boolean;
  user: PublicUserProfile;
  onClose: () => void;
  onSubmit: (payload: ProfileSettingsPayload) => Promise<void>;
}

export function ProfileSettingsDialog({
  isOpen,
  user,
  onClose,
  onSubmit,
}: ProfileSettingsDialogProps) {
  const { t } = useAppPreferences();
  const titleId = useId();
  const descriptionId = useId();
  const nameInputId = useId();
  const bioInputId = useId();
  const avatarInputId = useId();
  const [displayName, setDisplayName] = useState(user.displayName || user.username);
  const [bio, setBio] = useState(user.bio ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDisplayName(user.displayName || user.username);
    setBio(user.bio ?? '');
    setAvatarFile(null);
    setError('');
  }, [isOpen, user.bio, user.displayName, user.username]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(nextPreviewUrl);
    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [avatarFile]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  const avatarAlt = displayName.trim() || user.username;
  const avatarSrc = avatarPreviewUrl || user.avatarUrl;

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      return;
    }

    if (!ACCEPTED_AVATAR_TYPES.includes(nextFile.type)) {
      setAvatarFile(null);
      setError(t('profile.settingsImageTypeInvalid'));
      event.target.value = '';
      return;
    }

    if (nextFile.size > MAX_AVATAR_FILE_SIZE) {
      setAvatarFile(null);
      setError(t('profile.settingsImageTooLarge'));
      event.target.value = '';
      return;
    }

    setAvatarFile(nextFile);
    setError('');
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedDisplayName = displayName.trim();
    const normalizedBio = bio.trim();

    if (!normalizedDisplayName) {
      setError(t('profile.settingsNameRequired'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        displayName: normalizedDisplayName,
        bio: normalizedBio,
        avatarFile,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, t('profile.settingsSubmitError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-settings-backdrop" onClick={handleBackdropClick}>
      <div
        className="panel profile-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="profile-settings-dialog__header">
          <div className="profile-settings-dialog__avatar-preview">
            {avatarSrc ? (
              <img src={avatarSrc} alt={avatarAlt} />
            ) : (
              <span>{getInitial(avatarAlt)}</span>
            )}
          </div>

          <div className="profile-settings-dialog__header-copy">
            <span className="eyebrow">{t('profile.settingsEyebrow')}</span>
            <h2 id={titleId}>{t('profile.settingsTitle')}</h2>
            <p id={descriptionId} className="muted">
              {t('profile.settingsSubtitle')}
            </p>
          </div>
        </div>

        <form className="profile-settings-dialog__form" onSubmit={handleSubmit}>
          <div className="profile-settings-dialog__avatar-row">
            <div className="profile-settings-dialog__avatar-copy">
              <label htmlFor={avatarInputId}>{t('profile.settingsAvatar')}</label>
              <p className="profile-settings-dialog__avatar-hint">
                {avatarFile
                  ? t('profile.settingsAvatarSelected', { name: avatarFile.name })
                  : t('profile.settingsAvatarHint')}
              </p>
            </div>

            <input
              id={avatarInputId}
              className="sr-only"
              type="file"
              accept={ACCEPTED_AVATAR_TYPES.join(',')}
              onChange={handleAvatarChange}
            />
            <label htmlFor={avatarInputId} className="button button--secondary profile-settings-dialog__avatar-button">
              {t('profile.settingsAvatarAction')}
            </label>
          </div>

          <div className="field">
            <label htmlFor={nameInputId}>{t('profile.settingsName')}</label>
            <input
              id={nameInputId}
              className="input"
              type="text"
              maxLength={100}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="field">
            <label htmlFor={bioInputId}>{t('profile.settingsBio')}</label>
            <textarea
              id={bioInputId}
              className="input profile-settings-dialog__textarea"
              maxLength={200}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {error ? <div className="inline-notice inline-notice--danger">{error}</div> : null}

          <div className="profile-settings-dialog__actions">
            <button type="button" className="button button--ghost" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="button button--primary" disabled={isSubmitting}>
              {isSubmitting ? t('profile.settingsSaving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

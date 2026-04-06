import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { authApi, type PublicUserProfile } from '../api/auth';
import { boxesApi, cardsApi, type BoxSummary, type CardSummary } from '../api/content';
import { ProfileHero } from '../components/ProfileHero';
import { ProfileSettingsDialog, type ProfileSettingsPayload } from '../components/ProfileSettingsDialog';
import { WorkGrid } from '../components/WorkGrid';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../lib/ui';
import type { CommunityWorkItem } from '../types/community';
import './ProfilePage.css';

interface ProfileState {
  user: PublicUserProfile | null;
  items: CommunityWorkItem[];
  loading: boolean;
  error: string;
}

type AmbientLayerStyle = CSSProperties & Record<`--${string}`, string>;

const PROFILE_BACKGROUND_STREAMS: ReadonlyArray<{ id: string; style: AmbientLayerStyle }> = [
  {
    id: 'sunrise-stream',
    style: {
      '--profile-stream-width': '72vw',
      '--profile-stream-height': '24vh',
      '--profile-stream-top': '4vh',
      '--profile-stream-left': '-8vw',
      '--profile-stream-rotate': '-14deg',
      '--profile-stream-opacity': '0.28',
      '--profile-stream-blur': '88px',
      '--profile-stream-duration': '24s',
      '--profile-stream-delay': '-5s',
      '--profile-stream-drift-x': '12vw',
      '--profile-stream-drift-y': '6vh',
      '--profile-stream-gradient':
        'linear-gradient(90deg, rgba(255, 154, 116, 0.6), rgba(255, 213, 102, 0.28), rgba(255, 255, 255, 0))',
    },
  },
  {
    id: 'lagoon-stream',
    style: {
      '--profile-stream-width': '64vw',
      '--profile-stream-height': '22vh',
      '--profile-stream-top': '34vh',
      '--profile-stream-left': '18vw',
      '--profile-stream-rotate': '10deg',
      '--profile-stream-opacity': '0.24',
      '--profile-stream-blur': '82px',
      '--profile-stream-duration': '26s',
      '--profile-stream-delay': '-16s',
      '--profile-stream-drift-x': '-10vw',
      '--profile-stream-drift-y': '8vh',
      '--profile-stream-gradient':
        'linear-gradient(90deg, rgba(104, 197, 255, 0), rgba(104, 197, 255, 0.32), rgba(127, 238, 195, 0.56), rgba(255, 255, 255, 0))',
    },
  },
  {
    id: 'violet-stream',
    style: {
      '--profile-stream-width': '58vw',
      '--profile-stream-height': '20vh',
      '--profile-stream-top': '66vh',
      '--profile-stream-left': '44vw',
      '--profile-stream-rotate': '-12deg',
      '--profile-stream-opacity': '0.2',
      '--profile-stream-blur': '76px',
      '--profile-stream-duration': '22s',
      '--profile-stream-delay': '-11s',
      '--profile-stream-drift-x': '9vw',
      '--profile-stream-drift-y': '-7vh',
      '--profile-stream-gradient':
        'linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(188, 159, 255, 0.22), rgba(255, 157, 212, 0.46), rgba(255, 255, 255, 0))',
    },
  },
];

const PROFILE_BACKGROUND_ORBS: ReadonlyArray<{ id: string; style: AmbientLayerStyle }> = [
  {
    id: 'coral-haze',
    style: {
      '--profile-orb-size': '26vw',
      '--profile-orb-top': '-8vh',
      '--profile-orb-left': '-4vw',
      '--profile-orb-color': 'rgba(255, 148, 116, 0.72)',
      '--profile-orb-opacity': '0.48',
      '--profile-orb-blur': '108px',
      '--profile-orb-duration': '36s',
      '--profile-orb-delay': '-10s',
      '--profile-orb-drift-x': '14vw',
      '--profile-orb-drift-y': '22vh',
      '--profile-orb-scale-start': '0.94',
      '--profile-orb-scale-mid': '1.12',
      '--profile-orb-scale-end': '1.02',
    },
  },
  {
    id: 'golden-mist',
    style: {
      '--profile-orb-size': '22vw',
      '--profile-orb-top': '4vh',
      '--profile-orb-left': '18vw',
      '--profile-orb-color': 'rgba(255, 213, 102, 0.66)',
      '--profile-orb-opacity': '0.36',
      '--profile-orb-blur': '96px',
      '--profile-orb-duration': '40s',
      '--profile-orb-delay': '-26s',
      '--profile-orb-drift-x': '10vw',
      '--profile-orb-drift-y': '20vh',
      '--profile-orb-scale-start': '0.96',
      '--profile-orb-scale-mid': '1.1',
      '--profile-orb-scale-end': '1',
    },
  },
  {
    id: 'mint-bloom',
    style: {
      '--profile-orb-size': '24vw',
      '--profile-orb-top': '0vh',
      '--profile-orb-left': '74vw',
      '--profile-orb-color': 'rgba(145, 235, 174, 0.68)',
      '--profile-orb-opacity': '0.34',
      '--profile-orb-blur': '102px',
      '--profile-orb-duration': '38s',
      '--profile-orb-delay': '-8s',
      '--profile-orb-drift-x': '-12vw',
      '--profile-orb-drift-y': '20vh',
      '--profile-orb-scale-start': '0.92',
      '--profile-orb-scale-mid': '1.1',
      '--profile-orb-scale-end': '1.02',
    },
  },
  {
    id: 'seafoam',
    style: {
      '--profile-orb-size': '20vw',
      '--profile-orb-top': '24vh',
      '--profile-orb-left': '4vw',
      '--profile-orb-color': 'rgba(109, 232, 204, 0.64)',
      '--profile-orb-opacity': '0.28',
      '--profile-orb-blur': '92px',
      '--profile-orb-duration': '34s',
      '--profile-orb-delay': '-18s',
      '--profile-orb-drift-x': '13vw',
      '--profile-orb-drift-y': '16vh',
      '--profile-orb-scale-start': '0.95',
      '--profile-orb-scale-mid': '1.08',
      '--profile-orb-scale-end': '1.03',
    },
  },
  {
    id: 'cyan-breath',
    style: {
      '--profile-orb-size': '30vw',
      '--profile-orb-top': '22vh',
      '--profile-orb-left': '28vw',
      '--profile-orb-color': 'rgba(101, 210, 255, 0.74)',
      '--profile-orb-opacity': '0.32',
      '--profile-orb-blur': '114px',
      '--profile-orb-duration': '42s',
      '--profile-orb-delay': '-34s',
      '--profile-orb-drift-x': '16vw',
      '--profile-orb-drift-y': '22vh',
      '--profile-orb-scale-start': '0.92',
      '--profile-orb-scale-mid': '1.12',
      '--profile-orb-scale-end': '1.04',
    },
  },
  {
    id: 'iris-air',
    style: {
      '--profile-orb-size': '18vw',
      '--profile-orb-top': '34vh',
      '--profile-orb-left': '78vw',
      '--profile-orb-color': 'rgba(149, 167, 255, 0.66)',
      '--profile-orb-opacity': '0.28',
      '--profile-orb-blur': '90px',
      '--profile-orb-duration': '36s',
      '--profile-orb-delay': '-12s',
      '--profile-orb-drift-x': '-10vw',
      '--profile-orb-drift-y': '16vh',
      '--profile-orb-scale-start': '0.94',
      '--profile-orb-scale-mid': '1.08',
      '--profile-orb-scale-end': '1.02',
    },
  },
  {
    id: 'rose-cloud',
    style: {
      '--profile-orb-size': '28vw',
      '--profile-orb-top': '58vh',
      '--profile-orb-left': '-6vw',
      '--profile-orb-color': 'rgba(255, 157, 212, 0.7)',
      '--profile-orb-opacity': '0.36',
      '--profile-orb-blur': '112px',
      '--profile-orb-duration': '44s',
      '--profile-orb-delay': '-30s',
      '--profile-orb-drift-x': '15vw',
      '--profile-orb-drift-y': '-14vh',
      '--profile-orb-scale-start': '0.92',
      '--profile-orb-scale-mid': '1.12',
      '--profile-orb-scale-end': '1',
    },
  },
  {
    id: 'lagoon-haze',
    style: {
      '--profile-orb-size': '20vw',
      '--profile-orb-top': '74vh',
      '--profile-orb-left': '18vw',
      '--profile-orb-color': 'rgba(105, 194, 255, 0.68)',
      '--profile-orb-opacity': '0.3',
      '--profile-orb-blur': '96px',
      '--profile-orb-duration': '35s',
      '--profile-orb-delay': '-20s',
      '--profile-orb-drift-x': '-11vw',
      '--profile-orb-drift-y': '-18vh',
      '--profile-orb-scale-start': '0.96',
      '--profile-orb-scale-mid': '1.1',
      '--profile-orb-scale-end': '1.01',
    },
  },
  {
    id: 'sunbeam',
    style: {
      '--profile-orb-size': '24vw',
      '--profile-orb-top': '72vh',
      '--profile-orb-left': '50vw',
      '--profile-orb-color': 'rgba(255, 208, 105, 0.7)',
      '--profile-orb-opacity': '0.32',
      '--profile-orb-blur': '100px',
      '--profile-orb-duration': '40s',
      '--profile-orb-delay': '-42s',
      '--profile-orb-drift-x': '12vw',
      '--profile-orb-drift-y': '-18vh',
      '--profile-orb-scale-start': '0.95',
      '--profile-orb-scale-mid': '1.1',
      '--profile-orb-scale-end': '1.02',
    },
  },
  {
    id: 'violet-whisper',
    style: {
      '--profile-orb-size': '18vw',
      '--profile-orb-top': '62vh',
      '--profile-orb-left': '78vw',
      '--profile-orb-color': 'rgba(188, 159, 255, 0.68)',
      '--profile-orb-opacity': '0.24',
      '--profile-orb-blur': '88px',
      '--profile-orb-duration': '34s',
      '--profile-orb-delay': '-16s',
      '--profile-orb-drift-x': '-12vw',
      '--profile-orb-drift-y': '-14vh',
      '--profile-orb-scale-start': '0.98',
      '--profile-orb-scale-mid': '1.08',
      '--profile-orb-scale-end': '1.01',
    },
  },
  {
    id: 'peach-spark',
    style: {
      '--profile-orb-size': '16vw',
      '--profile-orb-top': '42vh',
      '--profile-orb-left': '14vw',
      '--profile-orb-color': 'rgba(255, 182, 133, 0.68)',
      '--profile-orb-opacity': '0.22',
      '--profile-orb-blur': '82px',
      '--profile-orb-duration': '30s',
      '--profile-orb-delay': '-21s',
      '--profile-orb-drift-x': '9vw',
      '--profile-orb-drift-y': '12vh',
      '--profile-orb-scale-start': '0.94',
      '--profile-orb-scale-mid': '1.08',
      '--profile-orb-scale-end': '1.02',
    },
  },
  {
    id: 'mint-spark',
    style: {
      '--profile-orb-size': '14vw',
      '--profile-orb-top': '48vh',
      '--profile-orb-left': '60vw',
      '--profile-orb-color': 'rgba(136, 242, 191, 0.66)',
      '--profile-orb-opacity': '0.22',
      '--profile-orb-blur': '76px',
      '--profile-orb-duration': '28s',
      '--profile-orb-delay': '-6s',
      '--profile-orb-drift-x': '-9vw',
      '--profile-orb-drift-y': '13vh',
      '--profile-orb-scale-start': '0.96',
      '--profile-orb-scale-mid': '1.1',
      '--profile-orb-scale-end': '1.03',
    },
  },
];

function toCommunityWorks(cards: CardSummary[], boxes: BoxSummary[]): CommunityWorkItem[] {
  const cardItems = cards
    .filter((card) => card.visibility === 'public' && card.status === 'ready')
    .map<CommunityWorkItem>((card) => ({
      id: card.id,
      type: 'card',
      title: card.title,
      coverUrl: card.coverUrl,
      coverRatio: card.coverRatio,
      href: `/cards/${card.id}`,
      createdAt: card.createdAt,
    }));

  const boxItems = boxes
    .filter((box) => box.visibility === 'public')
    .map<CommunityWorkItem>((box) => ({
      id: box.id,
      type: 'box',
      title: box.title,
      coverUrl: box.coverUrl,
      coverRatio: box.coverRatio,
      href: `/boxes/${box.id}`,
      createdAt: box.createdAt,
    }));

  return [...cardItems, ...boxItems].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function toPublicProfile(user: {
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}): PublicUserProfile {
  return {
    username: user.username,
    displayName: user.displayName || user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export default function ProfilePage() {
  const { username: rawUsername } = useParams<{ username: string }>();
  const { t } = useAppPreferences();
  const { user: authUser, isLoading: isAuthLoading, refreshUser } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [manageError, setManageError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [state, setState] = useState<ProfileState>({
    user: null,
    items: [],
    loading: true,
    error: '',
  });

  const username = useMemo(() => {
    if (!rawUsername) {
      return undefined;
    }

    return rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  }, [rawUsername]);

  useEffect(() => {
    if (!username) {
      setState({
        user: null,
        items: [],
        loading: false,
        error: t('profile.notFound'),
      });
      return;
    }

    let active = true;

    setState((current) => ({
      ...current,
      loading: true,
      error: '',
    }));

    void Promise.all([
      authApi.getUserProfile(username),
      cardsApi.getAllUserCards(username),
      boxesApi.getAllUserBoxes(username),
    ])
      .then(([profile, cards, boxes]) => {
        if (!active) {
          return;
        }

        setState({
          user: profile,
          items: toCommunityWorks(cards, boxes),
          loading: false,
          error: '',
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setState({
          user: null,
          items: [],
          loading: false,
          error: getErrorMessage(error, t('profile.notFound')),
        });
      });

    return () => {
      active = false;
    };
  }, [reloadKey, t, username]);

  const isOwner = useMemo(() => {
    if (isAuthLoading || !authUser || !state.user) {
      return false;
    }

    return authUser.username.toLowerCase() === state.user.username.toLowerCase();
  }, [authUser, isAuthLoading, state.user]);

  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);

  useEffect(() => {
    setManageMode(false);
    setSelectedCardIds([]);
    setManageError('');
    setIsDeleting(false);
    setIsProfileSettingsOpen(false);
  }, [username]);

  useEffect(() => {
    if (!isOwner) {
      setIsProfileSettingsOpen(false);
    }
  }, [isOwner]);

  const handleToggleManageMode = () => {
    if (isDeleting) {
      return;
    }

    setManageMode((current) => !current);
    setSelectedCardIds([]);
    setManageError('');
  };

  const handleToggleCardSelection = (item: CommunityWorkItem) => {
    if (!manageMode || item.type !== 'card' || isDeleting) {
      return;
    }

    setSelectedCardIds((current) => (
      current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : [...current, item.id]
    ));
    setManageError('');
  };

  const handleDeleteSelectedCards = async () => {
    if (!selectedCardIds.length || isDeleting) {
      return;
    }

    const deleteTargets = [...selectedCardIds];
    const confirmed = window.confirm(
      t('profile.manageDeleteConfirm', { count: deleteTargets.length }),
    );
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setManageError('');

    const results = await Promise.allSettled(
      deleteTargets.map(async (cardId) => {
        await cardsApi.deleteCard(cardId);
        return cardId;
      }),
    );

    const successIds = results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map((result) => result.value);
    const failedResults = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (successIds.length > 0) {
      const successIdSet = new Set(successIds);
      setState((current) => ({
        ...current,
        items: current.items.filter((item) => !(item.type === 'card' && successIdSet.has(item.id))),
      }));
    }

    if (failedResults.length > 0) {
      setSelectedCardIds(
        results.flatMap((result, index) => (result.status === 'rejected' ? [deleteTargets[index]] : [])),
      );
      setManageError(t('profile.manageDeleteFailed', { count: failedResults.length }));
    } else {
      setSelectedCardIds([]);
      setManageMode(false);
    }

    setIsDeleting(false);
  };

  const handleProfileSubmit = async ({ displayName, bio, avatarFile }: ProfileSettingsPayload) => {
    const currentDisplayName = state.user?.displayName || '';
    const currentBio = state.user?.bio ?? '';
    const shouldPatchProfile = displayName !== currentDisplayName || bio !== currentBio;

    if (!avatarFile && !shouldPatchProfile) {
      setIsProfileSettingsOpen(false);
      return;
    }

    if (avatarFile) {
      await authApi.uploadAvatar(avatarFile);
    }

    if (shouldPatchProfile) {
      await authApi.updateMe({ displayName, bio });
    }

    const refreshedUser = await refreshUser();
    const nextUser = toPublicProfile(refreshedUser);

    setState((current) => (
      current.user
        ? {
            ...current,
            user: nextUser,
          }
        : current
    ));
    setIsProfileSettingsOpen(false);
  };

  let pageBody: ReactNode;

  if (state.loading) {
    pageBody = (
      <>
        <section className="profile-hero profile-hero--skeleton">
          <div className="skeleton-circle" />
          <div className="profile-hero__content">
            <span className="skeleton-line skeleton-line--sm" />
            <span className="skeleton-line skeleton-line--lg" />
            <span className="skeleton-line skeleton-line--md" />
            <span className="skeleton-line skeleton-line--xl" />
          </div>
        </section>

        <section className="works-section">
          <div className="works-section__header">
            <div>
              <span className="skeleton-line skeleton-line--sm" />
              <span className="skeleton-line skeleton-line--md" />
            </div>
          </div>

          <div className="work-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="panel skeleton-tile" />
            ))}
          </div>
        </section>
      </>
    );
  } else if (!state.user || state.error) {
    pageBody = (
      <section className="panel error-panel profile-state">
        <h1>{state.error || t('profile.notFound')}</h1>
        <button type="button" className="button button--secondary" onClick={() => setReloadKey((value) => value + 1)}>
          {t('common.retry')}
        </button>
      </section>
    );
  } else {
    pageBody = (
      <>
        <ProfileHero
          user={state.user}
          isOwner={isOwner}
          onOpenSettings={() => setIsProfileSettingsOpen(true)}
        />
        <WorkGrid
          items={state.items}
          isOwner={isOwner}
          manageMode={manageMode}
          selectedCardIds={selectedCardIdSet}
          manageError={manageError}
          isDeleting={isDeleting}
          onToggleManageMode={handleToggleManageMode}
          onToggleCardSelection={handleToggleCardSelection}
          onDeleteSelectedCards={handleDeleteSelectedCards}
        />
      </>
    );
  }

  return (
    <div className="page-container profile-page">
      <div className="profile-page__ambient" aria-hidden="true">
        {PROFILE_BACKGROUND_STREAMS.map((stream) => (
          <span key={stream.id} className="profile-page__stream" style={stream.style} />
        ))}
        {PROFILE_BACKGROUND_ORBS.map((orb) => (
          <span key={orb.id} className="profile-page__orb" style={orb.style} />
        ))}
        <span className="profile-page__frost" />
      </div>

      <div className="profile-page__content">{pageBody}</div>

      {state.user && isOwner ? (
        <ProfileSettingsDialog
          isOpen={isProfileSettingsOpen}
          user={state.user}
          onClose={() => setIsProfileSettingsOpen(false)}
          onSubmit={handleProfileSubmit}
        />
      ) : null}
    </div>
  );
}

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { getInitial, getWorkCoverStyle } from '../lib/ui';
import { Icon } from '../runtime/icons/Icon';
import type { CommunityWorkItem } from '../types/community';

interface WorkTileProps {
  item: CommunityWorkItem;
  manageMode?: boolean;
  selected?: boolean;
  onToggleSelection?: (item: CommunityWorkItem) => void;
}

export function WorkTile({ item, manageMode = false, selected = false, onToggleSelection }: WorkTileProps) {
  const { t } = useAppPreferences();
  const isCard = item.type === 'card';
  const selectable = manageMode && isCard;
  const coverStyle = getWorkCoverStyle(item.coverRatio) as CSSProperties;

  const content = (
    <article className="work-tile__surface">
      <div className="work-tile__cover-stage">
        <div className="work-tile__cover-shell">
          <div className="work-tile__cover-clip">
            {item.coverUrl && isCard ? (
              <iframe
                className="work-tile__cover-frame"
                src={item.coverUrl}
                title={item.title}
                loading="lazy"
                sandbox="allow-scripts"
                scrolling="no"
              />
            ) : item.coverUrl ? (
              <img src={item.coverUrl} alt={item.title} loading="lazy" />
            ) : (
              <div className="work-tile__placeholder">
                <span>{getInitial(item.title)}</span>
              </div>
            )}
          </div>

          {manageMode ? (
            <span
              className={`work-tile__selection-badge${selected ? ' is-selected' : ''}${selectable ? '' : ' is-disabled'}`}
              aria-hidden="true"
            >
              {selectable && selected ? <Icon name="check" size={16} /> : null}
            </span>
          ) : null}
        </div>
      </div>

      <div className="work-tile__label">
        <h2>{item.title}</h2>
      </div>
    </article>
  );

  if (manageMode) {
    return (
      <button
        type="button"
        className={`work-tile work-tile--${item.type} work-tile--manage${selected ? ' is-selected' : ''}${selectable ? '' : ' is-readonly'}`}
        style={coverStyle}
        onClick={selectable ? () => onToggleSelection?.(item) : undefined}
        disabled={!selectable}
        aria-pressed={selectable ? selected : undefined}
        aria-label={selectable ? t('profile.manageTileSelect', { title: item.title }) : `${item.title} · ${t('common.box')}`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={item.href}
      className={`work-tile work-tile--${item.type}`}
      style={coverStyle}
      aria-label={`${item.title} · ${item.type === 'card' ? t('common.card') : t('common.box')}`}
    >
      {content}
    </Link>
  );
}

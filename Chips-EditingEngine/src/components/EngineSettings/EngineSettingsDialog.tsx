import React, { useState, useEffect, useMemo } from 'react';
import { ChipsButton } from '@chips/component-library';
import { useTranslation } from '../../hooks/useTranslation';
import './EngineSettingsDialog.css';

interface EngineSettingsDialogProps {
  visible: boolean;
  initialCategory?: string;
  onClose: () => void;
}

// Stub for now. Will be connected to SettingsContext or Store
const mockedCategories = [
  { id: 'general', labelKey: 'engine_settings.category_general', icon: '⚙️' },
  { id: 'appearance', labelKey: 'engine_settings.category_appearance', icon: '🎨' },
  { id: 'shortcuts', labelKey: 'engine_settings.category_shortcuts', icon: '⌨️' },
];
const mockedGroups = [mockedCategories];

export function EngineSettingsDialog({
  visible,
  initialCategory,
  onClose,
}: EngineSettingsDialogProps) {
  const { t } = useTranslation();
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');

  useEffect(() => {
    if (visible) {
      if (initialCategory) {
        setActiveCategoryId(initialCategory);
      } else {
        setActiveCategoryId(mockedCategories[0].id);
      }
    }
  }, [visible, initialCategory]);

  if (!visible) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('engine-settings-overlay')) {
      onClose();
    }
  };

  const handleGlobalKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && visible) {
      onClose();
    }
  };

  const handleResetCategory = () => {
    console.log('Reset category:', activeCategoryId);
  };

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [visible]);

  return (
    <div className="engine-settings-overlay" onClick={handleOverlayClick}>
      <div className="engine-settings-dialog">
        <div className="engine-settings-dialog__header">
          <h2 className="engine-settings-dialog__title">{t('engine_settings.title') || '引擎设置'}</h2>
          <button
            type="button"
            className="engine-settings-dialog__close-btn"
            aria-label={t('engine_settings.close') || '关闭'}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="engine-settings-dialog__body">
          <nav className="engine-settings-dialog__nav">
            {mockedGroups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {groupIndex > 0 && <div className="engine-settings-dialog__nav-divider" />}
                {group.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`engine-settings-dialog__nav-item ${
                      activeCategoryId === category.id ? 'engine-settings-dialog__nav-item--active' : ''
                    }`}
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    {category.icon && (
                      <span className="engine-settings-dialog__nav-icon">{category.icon}</span>
                    )}
                    <span className="engine-settings-dialog__nav-label">
                      {t(category.labelKey) || category.id}
                    </span>
                  </button>
                ))}
              </React.Fragment>
            ))}
          </nav>

          <div className="engine-settings-dialog__content">
            {activeCategoryId ? (
              <div className="engine-settings-dialog__panel-placeholder">
                <p>设置项渲染占位: {activeCategoryId}</p>
              </div>
            ) : (
              <div className="engine-settings-dialog__empty">
                <p className="engine-settings-dialog__empty-text">
                  {t('engine_settings.no_settings') || '暂无设置项'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="engine-settings-dialog__footer">
          <ChipsButton
            variant="ghost"
            className="engine-settings-dialog__btn engine-settings-dialog__btn--reset"
            onPress={handleResetCategory}
          >
            {t('engine_settings.reset') || '恢复默认'}
          </ChipsButton>
          <div className="engine-settings-dialog__footer-spacer" />
          <ChipsButton
            variant="primary"
            className="engine-settings-dialog__btn engine-settings-dialog__btn--close"
            onPress={onClose}
          >
            {t('engine_settings.close') || '关闭'}
          </ChipsButton>
        </div>
      </div>
    </div>
  );
}

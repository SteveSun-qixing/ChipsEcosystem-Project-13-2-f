import React, { useState, useEffect, useMemo } from 'react';
import type { IconDescriptor } from 'chips-sdk';
import { useTranslation } from '../../hooks/useTranslation';
import { useSettings } from '../../context/SettingsContext';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import './EngineSettingsDialog.css';

interface EngineSettingsDialogProps {
  visible: boolean;
  initialCategory?: string;
  onClose: () => void;
}

const categories = [
  { id: 'general', labelKey: 'engine_settings.category_general', icon: ENGINE_ICONS.settings },
  { id: 'appearance', labelKey: 'engine_settings.category_appearance', icon: ENGINE_ICONS.palette },
  { id: 'shortcuts', labelKey: 'engine_settings.category_shortcuts', icon: ENGINE_ICONS.shortcuts },
];

type SettingsCategory = {
  id: string;
  labelKey: string;
  icon: IconDescriptor;
};

const RESETTABLE_CATEGORY_IDS = new Set(['general', 'appearance', 'shortcuts']);

export function EngineSettingsDialog({
  visible,
  initialCategory,
  onClose,
}: EngineSettingsDialogProps) {
  const { t } = useTranslation();
  const { registeredPanels, getSetting, setSetting } = useSettings();
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');

  useEffect(() => {
    if (visible) {
      if (initialCategory) {
        setActiveCategoryId(initialCategory);
      } else {
        setActiveCategoryId(categories[0].id);
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
    switch (activeCategoryId) {
      case 'general':
        setSetting('defaultWorkspacePath', '');
        return;
      case 'appearance':
        setSetting('theme', 'default');
        return;
      case 'shortcuts':
        return;
      default:
        return;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [visible]);

  const categoryGroups = useMemo(() => {
    const allCategories: SettingsCategory[] = [...categories];
    registeredPanels.forEach(panel => {
      allCategories.push({
        id: panel.id,
        labelKey: panel.name,
        icon: ENGINE_ICONS.layout,
      });
    });
    return [allCategories];
  }, [registeredPanels]);

  const canResetActiveCategory = RESETTABLE_CATEGORY_IDS.has(activeCategoryId);

  const renderCategoryContent = () => {
    switch (activeCategoryId) {
      case 'general':
        return (
          <div className="engine-settings-dialog__content">
            <div className="engine-settings-dialog__section">
              <h3>{t('engine_settings.general_section_workspace') || '工作区'}</h3>
              <label>
                <span>{t('engine_settings.default_workspace') || '默认工作区路径'}</span>
                <input
                  type="text"
                  value={getSetting<string>('defaultWorkspacePath', '') || ''}
                  onChange={(e) => setSetting('defaultWorkspacePath', e.target.value)}
                />
              </label>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="engine-settings-dialog__content">
            <div className="engine-settings-dialog__section">
              <h3>{t('engine_settings.appearance_section_theme') || '主题'}</h3>
              <label>
                <span>{t('engine_settings.theme') || '主题'}</span>
                <select
                  value={getSetting<string>('theme', 'default') || 'default'}
                  onChange={(e) => setSetting('theme', e.target.value)}
                >
                  <option value="default">{t('engine_settings.theme_default') || '默认'}</option>
                  <option value="dark">{t('engine_settings.theme_dark') || '深色'}</option>
                  <option value="light">{t('engine_settings.theme_light') || '浅色'}</option>
                </select>
              </label>
            </div>
          </div>
        );
      case 'shortcuts':
        return (
          <div className="engine-settings-dialog__content">
            <div className="engine-settings-dialog__section">
              <h3>{t('engine_settings.shortcuts_section') || '快捷键'}</h3>
              <p>{t('engine_settings.shortcuts_hint') || '快捷键设置'}</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="engine-settings-dialog__content">
            <p>{t('engine_settings.select_category') || '请选择一个类别'}</p>
          </div>
        );
    }
  };

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
            <RuntimeIcon icon={ENGINE_ICONS.close} />
          </button>
        </div>

        <div className="engine-settings-dialog__body">
          <div className="engine-settings-dialog__sidebar">
            {categoryGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="engine-settings-dialog__category-group">
                {group.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`engine-settings-dialog__category-btn ${activeCategoryId === category.id ? 'active' : ''}`}
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    <span className="engine-settings-dialog__category-icon">
                      <RuntimeIcon icon={category.icon} />
                    </span>
                    <span className="engine-settings-dialog__category-label">{t(category.labelKey)}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="engine-settings-dialog__main">
            {renderCategoryContent()}
          </div>
        </div>

        <div className="engine-settings-dialog__footer">
          <button
            type="button"
            className="engine-settings-dialog__btn"
            onClick={handleResetCategory}
            disabled={!canResetActiveCategory}
          >
            {t('engine_settings.reset') || '重置'}
          </button>
          <button
            type="button"
            className="engine-settings-dialog__btn"
            onClick={onClose}
          >
            {t('engine_settings.done') || '完成'}
          </button>
        </div>
      </div>
    </div>
  );
}

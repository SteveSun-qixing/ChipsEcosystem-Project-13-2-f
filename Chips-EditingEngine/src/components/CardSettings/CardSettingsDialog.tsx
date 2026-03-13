import React, { useState, useEffect } from 'react';
import { ChipsButton, ChipsTabs } from '@chips/component-library';
import { useTranslation } from '../../hooks/useTranslation';
import { BasicInfoPanel } from './panels/BasicInfoPanel';
import { CoverPanel } from './panels/CoverPanel';
import { ThemePanel } from './panels/ThemePanel';
import { ExportPanel } from './panels/ExportPanel';
import './CardSettingsDialog.css';

interface CardSettingsDialogProps {
  cardId: string;
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function CardSettingsDialog({
  cardId,
  visible,
  onClose,
  onSave,
}: CardSettingsDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('basic');
  const [theme, setTheme] = useState('default-light');

  // Mocks for card info
  const mockCardInfo = {
    metadata: {
      name: 'Test Card',
      tags: ['test', 'tag'],
      created_at: Date.now(),
      modified_at: Date.now(),
      theme,
    },
    structure: [],
  };

  useEffect(() => {
    if (visible) {
      setActiveTab('basic');
    }
  }, [visible]);

  if (!visible) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('card-settings-overlay')) {
      onClose();
    }
  };

  const handleGlobalKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && visible) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [visible]);

  return (
    <div className="card-settings-overlay" onClick={handleOverlayClick}>
      <div className="card-settings-dialog">
        <div className="card-settings-dialog__header">
          <h2 className="card-settings-dialog__title">{t('card_settings.title') || '卡片设置'}</h2>
          <button
            type="button"
            className="card-settings-dialog__close-btn"
            aria-label={t('card_settings.close') || '关闭'}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="card-settings-dialog__body">
          <ChipsTabs
            value={activeTab}
            onValueChange={(id: string) => setActiveTab(id)}
            items={[
              {
                value: 'basic',
                label: t('card_settings.tab_basic') || '基础信息',
                content: (
                  <div className="card-settings-dialog__panel">
                    <BasicInfoPanel 
                      cardId={cardId} 
                      cardInfo={mockCardInfo} 
                      onUpdateName={(name) => console.log('Name:', name)}
                      onUpdateTags={(tags) => console.log('Tags:', tags)}
                    />
                  </div>
                ),
              },
              {
                value: 'cover',
                label: t('card_settings.tab_cover') || '封面',
                content: (
                  <div className="card-settings-dialog__panel">
                    <CoverPanel onOpenCoverMaker={() => console.log('Open Cover Maker')} />
                  </div>
                ),
              },
              {
                value: 'theme',
                label: t('card_settings.tab_theme') || '主题',
                content: (
                  <div className="card-settings-dialog__panel">
                    <ThemePanel value={theme} onChange={setTheme} />
                  </div>
                ),
              },
              {
                value: 'export',
                label: t('card_settings.tab_export') || '导出',
                content: (
                  <div className="card-settings-dialog__panel">
                    <ExportPanel cardId={cardId} cardInfo={mockCardInfo} />
                  </div>
                ),
              },
            ]}
          />
        </div>

        <div className="card-settings-dialog__footer">
          <ChipsButton
            variant="ghost"
            className="card-settings-dialog__btn card-settings-dialog__btn--cancel"
            onPress={onClose}
          >
            {t('card_settings.cancel') || '取消'}
          </ChipsButton>
          <ChipsButton
            variant="primary"
            className="card-settings-dialog__btn card-settings-dialog__btn--save"
            onPress={() => {
              onSave();
              onClose();
            }}
          >
            {t('card_settings.save') || '保存'}
          </ChipsButton>
        </div>
      </div>
    </div>
  );
}

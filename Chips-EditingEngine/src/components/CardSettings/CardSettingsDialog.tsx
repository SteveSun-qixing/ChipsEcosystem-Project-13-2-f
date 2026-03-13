import React, { useState, useEffect } from 'react';
import { ChipsTabs } from '@chips/component-library';
import { useTranslation } from '../../hooks/useTranslation';
import { useCard } from '../../context/CardContext';
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
  const { getCard, updateCard } = useCard();
  const [activeTab, setActiveTab] = useState('basic');

  const card = getCard(cardId);
  const theme = card?.metadata.themeId || 'default-light';
  const cardInfo = card as any;

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

  const handleUpdateName = (name: string) => {
    if (card) {
      updateCard(cardId, {
        ...card,
        metadata: { ...card.metadata, name },
      } as any);
    }
  };

  const handleUpdateTags = (tags: string[]) => {
    if (card) {
      updateCard(cardId, {
        ...card,
        metadata: { ...card.metadata, tags },
      } as any);
    }
  };

  const handleSave = async () => {
    await saveCard(cardId);
    onSave();
  };

  const { saveCard } = useCard();

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
                      cardInfo={cardInfo}
                      onUpdateName={handleUpdateName}
                      onUpdateTags={handleUpdateTags}
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
                    <ThemePanel value={theme} onChange={(newTheme) => {
                      if (card) {
                        updateCard(cardId, {
                          ...card,
                          metadata: { ...card.metadata, themeId: newTheme },
                        } as any);
                      }
                    }} />
                  </div>
                ),
              },
              {
                value: 'export',
                label: t('card_settings.tab_export') || '导出',
                content: (
                  <div className="card-settings-dialog__panel">
                    <ExportPanel cardId={cardId} cardInfo={cardInfo} />
                  </div>
                ),
              },
            ]}
          />
        </div>

        <div className="card-settings-dialog__footer">
          <button
            type="button"
            className="card-settings-dialog__btn card-settings-dialog__btn--cancel"
            onClick={onClose}
          >
            {t('card_settings.cancel') || '取消'}
          </button>
          <button
            type="button"
            className="card-settings-dialog__btn card-settings-dialog__btn--save"
            onClick={handleSave}
          >
            {t('card_settings.save') || '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

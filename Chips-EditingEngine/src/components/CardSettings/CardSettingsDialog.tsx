import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChipsTabs } from '@chips/component-library';
import { useTranslation } from '../../hooks/useTranslation';
import { useCard } from '../../context/CardContext';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import { BasicInfoPanel } from './panels/BasicInfoPanel';
import { CoverPanel, type CoverPanelDraft } from './panels/CoverPanel';
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
  const { getCard, saveCard, updateCardMetadata, updateCardCover } = useCard();
  const [activeTab, setActiveTab] = useState('basic');
  const [coverDraft, setCoverDraft] = useState<CoverPanelDraft | null>(null);

  const card = getCard(cardId);
  const theme = card?.metadata.themeId || 'chips-official.default-theme';
  const cardInfo = card as any;
  const dialogTitleId = useMemo(() => `card-settings-dialog-title-${cardId}`, [cardId]);

  useEffect(() => {
    if (visible) {
      setActiveTab('basic');
      setCoverDraft(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [onClose, visible]);

  if (!visible) {
    return null;
  }

  const isSaveDisabled = activeTab === 'cover' && Boolean(coverDraft?.dirty && !coverDraft.valid);

  const handleUpdateName = (name: string) => {
    if (card) {
      updateCardMetadata(cardId, { name });
    }
  };

  const handleUpdateTags = (tags: string[]) => {
    if (card) {
      updateCardMetadata(cardId, { tags });
    }
  };

  const applyCoverDraft = () => {
    if (coverDraft?.dirty && coverDraft.valid) {
      updateCardCover(cardId, {
        html: coverDraft.html,
        ratio: coverDraft.ratio,
        resources: coverDraft.resources,
      });
    }
  };

  const handleSave = async () => {
    applyCoverDraft();
    await saveCard(cardId);
    onSave();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('card-settings-overlay')) {
      onClose();
    }
  };

  const dialog = (
    <div className="card-settings-overlay" onClick={handleOverlayClick}>
      <div
        className={`card-settings-dialog ${activeTab === 'cover' ? 'card-settings-dialog--cover' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
      >
        <div className="card-settings-dialog__header">
          <h2 id={dialogTitleId} className="card-settings-dialog__title">{t('card_settings.title') || '卡片设置'}</h2>
          <button
            type="button"
            className="card-settings-dialog__close-btn"
            aria-label={t('card_settings.close') || '关闭'}
            onClick={onClose}
          >
            <RuntimeIcon icon={ENGINE_ICONS.close} />
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
                  <div className="card-settings-dialog__panel card-settings-dialog__panel--cover">
                    <CoverPanel
                      cardId={cardId}
                      cardPath={card?.path ?? ''}
                      cardName={card?.metadata.name ?? (t('card_window.untitled') || '无标题卡片')}
                      currentCoverHtml={card?.cover?.html}
                      currentRatio={card?.cover?.ratio ?? card?.metadata.coverRatio}
                      onDraftChange={setCoverDraft}
                    />
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
                        updateCardMetadata(cardId, { themeId: newTheme });
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
                    <ExportPanel
                      cardId={cardId}
                      onBeforeExport={applyCoverDraft}
                    />
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
            disabled={isSaveDisabled}
          >
            {t('card_settings.save') || '保存'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined' || !document.body) {
    return dialog;
  }

  return createPortal(dialog, document.body);
}

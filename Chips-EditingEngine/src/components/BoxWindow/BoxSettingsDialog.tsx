import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChipsTabs } from '@chips/component-library';
import type { BoxDocumentSessionSnapshot } from '../../services/box-document-service';
import { boxDocumentService } from '../../services/box-document-service';
import { workspaceService } from '../../services/workspace-service';
import { useTranslation } from '../../hooks/useTranslation';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import { BasicInfoPanel } from '../CardSettings/panels/BasicInfoPanel';
import { CoverPanel, type CoverPanelDraft } from '../CardSettings/panels/CoverPanel';
import '../CardSettings/CardSettingsDialog.css';
import './BoxSettingsDialog.css';

interface BoxSettingsDialogProps {
  boxId: string;
  visible: boolean;
  session: BoxDocumentSessionSnapshot | null;
  onClose: () => void;
  onSave: () => void;
}

export function BoxSettingsDialog({
  boxId,
  visible,
  session,
  onClose,
  onSave,
}: BoxSettingsDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('basic');
  const [coverDraft, setCoverDraft] = useState<CoverPanelDraft | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const dialogTitleId = useMemo(() => `box-settings-dialog-title-${boxId}`, [boxId]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setActiveTab('basic');
    setCoverDraft(null);
    setDescriptionDraft(session?.metadata.description ?? '');
  }, [session?.metadata.description, visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const handleGlobalKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [onClose, visible]);

  if (!visible || !session) {
    return null;
  }

  const isSaveDisabled = activeTab === 'cover' && Boolean(coverDraft?.dirty && !coverDraft.valid);

  const handleUpdateName = (name: string) => {
    boxDocumentService.updateMetadata(boxId, { name });
  };

  const handleUpdateTags = (tags: string[]) => {
    boxDocumentService.updateMetadata(boxId, { tags });
  };

  const handleDescriptionBlur = () => {
    boxDocumentService.updateMetadata(boxId, {
      description: descriptionDraft.trim() || undefined,
    });
  };

  const applyCoverDraft = async () => {
    if (coverDraft?.dirty && coverDraft.valid) {
      await boxDocumentService.updateCover(boxId, {
        html: coverDraft.html,
        ratio: coverDraft.ratio,
        resources: coverDraft.resources.map((resource) => ({
          path: resource.path,
          data: resource.data,
        })),
      });
    }
  };

  const handleSave = async () => {
    await applyCoverDraft();
    if (descriptionDraft !== (session.metadata.description ?? '')) {
      handleDescriptionBlur();
    }
    await boxDocumentService.saveBox(boxId);
    await workspaceService.refresh();
    onSave();
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).classList.contains('card-settings-overlay')) {
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
          <h2 id={dialogTitleId} className="card-settings-dialog__title">
            {t('box_settings.title') || '箱子设置'}
          </h2>
          <button
            type="button"
            className="card-settings-dialog__close-btn"
            aria-label={t('box_settings.close') || '关闭'}
            onClick={onClose}
          >
            <RuntimeIcon icon={ENGINE_ICONS.close} />
          </button>
        </div>

        <div className="card-settings-dialog__body">
          <ChipsTabs
            value={activeTab}
            onValueChange={(value: string) => setActiveTab(value)}
            items={[
              {
                value: 'basic',
                label: t('box_settings.tab_basic') || '基础信息',
                content: (
                  <div className="card-settings-dialog__panel">
                    <BasicInfoPanel
                      cardId={boxId}
                      cardInfo={{ metadata: session.metadata }}
                      onUpdateName={handleUpdateName}
                      onUpdateTags={handleUpdateTags}
                      documentIdLabel={t('box_settings.box_id') || '箱子 ID'}
                      nameLabel={t('box_settings.name') || '箱子名称'}
                      namePlaceholder={t('box_settings.name_placeholder') || '输入箱子名称'}
                      tagsLabel={t('box_settings.tags') || '标签'}
                      tagPlaceholder={t('box_settings.tag_placeholder') || '输入标签名称'}
                      addTagLabel={t('box_settings.tag_add') || '添加标签'}
                      metadataLabel={t('box_settings.metadata') || '元数据'}
                      createdAtLabel={t('box_settings.created_at') || '创建时间'}
                      modifiedAtLabel={t('box_settings.modified_at') || '修改时间'}
                    />

                    <div className="box-settings-dialog__field">
                      <label className="box-settings-dialog__label">
                        {t('box_settings.description') || '描述'}
                      </label>
                      <textarea
                        className="box-settings-dialog__textarea"
                        rows={4}
                        value={descriptionDraft}
                        placeholder={t('box_settings.description_placeholder') || '输入箱子描述'}
                        onChange={(event) => setDescriptionDraft(event.currentTarget.value)}
                        onBlur={handleDescriptionBlur}
                      />
                    </div>
                  </div>
                ),
              },
              {
                value: 'cover',
                label: t('box_settings.tab_cover') || '封面',
                content: (
                  <div className="card-settings-dialog__panel card-settings-dialog__panel--cover">
                    <CoverPanel
                      cardId={session.boxId}
                      cardPath={session.workspaceDir}
                      cardName={session.metadata.name}
                      packageDirectoryName=".box"
                      assetDirectoryName="boxcover"
                      currentCoverHtml={session.coverHtml}
                      currentRatio={session.metadata.coverRatio}
                      onDraftChange={setCoverDraft}
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
            {t('box_settings.cancel') || '取消'}
          </button>
          <button
            type="button"
            className="card-settings-dialog__btn card-settings-dialog__btn--save"
            onClick={() => { void handleSave(); }}
            disabled={isSaveDisabled}
          >
            {t('box_settings.save') || '保存'}
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

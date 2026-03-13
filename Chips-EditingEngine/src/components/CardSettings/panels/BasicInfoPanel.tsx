import React, { useState, useEffect, useMemo, KeyboardEvent } from 'react';
import { ChipsInput } from '@chips/component-library';
import { useTranslation } from '../../../hooks/useTranslation';
import './BasicInfoPanel.css';

export interface CardMetaData {
  name?: string;
  tags?: (string | string[])[];
  createdAt?: string | number;
  modifiedAt?: string | number;
  created_at?: string | number;
  modified_at?: string | number;
}
export interface CardInfo {
  metadata: CardMetaData;
}

interface BasicInfoPanelProps {
  cardId: string;
  cardInfo?: CardInfo;
  onUpdateName?: (name: string) => void;
  onUpdateTags?: (tags: string[]) => void;
}

export function BasicInfoPanel({
  cardId,
  cardInfo,
  onUpdateName,
  onUpdateTags,
}: BasicInfoPanelProps) {
  const { t } = useTranslation();

  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (cardInfo) {
      setEditName(cardInfo.metadata.name || '');
      const tags = (cardInfo.metadata.tags || []).map((tag) =>
        Array.isArray(tag) ? tag.join('/') : tag
      );
      setEditTags(tags);
    }
  }, [cardInfo]);

  // Synchronize changes upwards
  const handleNameChange = (val: string) => {
    setEditName(val);
    onUpdateName?.(val);
  };

  const handleTagsChange = (newTags: string[]) => {
    setEditTags(newTags);
    onUpdateTags?.(newTags);
  };

  const formatDateTime = (timestamp: string | number | undefined): string => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !editTags.includes(tag)) {
      const updatedTags = [...editTags, tag];
      handleTagsChange(updatedTags);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    const updatedTags = editTags.filter((_, i) => i !== index);
    handleTagsChange(updatedTags);
  };

  const handleKeydown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const metadataItems = useMemo(() => [
    {
      label: t('card_settings.card_id') || '卡片 ID',
      value: cardId,
      mono: true,
    },
    {
      label: t('card_settings.created_at') || '创建时间',
      value: formatDateTime(cardInfo?.metadata?.createdAt ?? cardInfo?.metadata?.created_at),
      mono: false,
    },
    {
      label: t('card_settings.modified_at') || '修改时间',
      value: formatDateTime(cardInfo?.metadata?.modifiedAt ?? cardInfo?.metadata?.modified_at),
      mono: false,
    },
  ], [cardId, cardInfo, t]);

  return (
    <div className="basic-info-panel">
      <div className="basic-info-panel__field">
        <label className="basic-info-panel__label">
          {t('card_settings.name') || '资源名称'}
        </label>
        <ChipsInput
          value={editName}
          onChange={handleNameChange}
          placeholder={t('card_settings.name_placeholder') || '请输入名称'}
          className="basic-info-panel__input"
        />
      </div>

      <div className="basic-info-panel__field">
        <label className="basic-info-panel__label">
          {t('card_settings.tags') || '标签'}
        </label>
        <div className="basic-info-panel__tag-input-row">
          <ChipsInput
            value={newTag}
            onChange={setNewTag}
            placeholder={t('card_settings.tag_placeholder') || '输入标签按回车添加'}
            onKeyDown={handleKeydown}
            className="basic-info-panel__tag-input"
          />
          <button
            type="button"
            className="basic-info-panel__tag-add-btn"
            onClick={addTag}
          >
            {t('card_settings.tag_add') || '添加'}
          </button>
        </div>
        {editTags.length > 0 && (
          <div className="basic-info-panel__tag-list">
            {editTags.map((tag, index) => (
              <span
                key={index}
                className="basic-info-panel__tag"
              >
                {tag}
                <button type="button" onClick={() => removeTag(index)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="basic-info-panel__field">
        <label className="basic-info-panel__label">
          {t('card_settings.metadata') || '元数据'}
        </label>
        <div className="basic-info-panel__metadata">
          {metadataItems.map((item) => (
            <div key={item.label} className="basic-info-panel__metadata-row">
              <span className="basic-info-panel__metadata-label">{item.label}</span>
              <span className={`basic-info-panel__metadata-value ${item.mono ? 'basic-info-panel__metadata-value--mono' : ''}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

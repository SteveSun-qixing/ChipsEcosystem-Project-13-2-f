import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import './CoverPanel.css';

interface CoverPanelProps {
  onOpenCoverMaker: () => void;
}

export function CoverPanel({ onOpenCoverMaker }: CoverPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="cover-panel">
      <p className="cover-panel__desc">
        {t('card_settings.cover_description') || '卡片封面用于在各种列表中展示，也是导出图片的关键元素。'}
      </p>

      <div className="cover-panel__options">
        <button
          type="button"
          className="cover-panel__option-card"
          onClick={onOpenCoverMaker}
        >
          <div className="cover-panel__option-inner">
            <span className="cover-panel__option-icon" aria-hidden="true">🎨</span>
            <div className="cover-panel__option-text">
              <span className="cover-panel__option-title">
                {t('card_settings.cover_maker') || '封面制作器'}
              </span>
              <span className="cover-panel__option-desc">
                {t('card_settings.cover_maker_desc') || '使用内置工具快速生成高质量封面，或上传自定义图片。'}
              </span>
            </div>
          </div>
        </button>
      </div>

      <div className="cover-panel__hint">
        <div className="cover-panel__hint-icon">💡</div>
        <div className="cover-panel__hint-message">
          {t('card_settings.cover_maker_hint') || '最佳封面尺寸一般推荐为 1200x630 或 800x800，适配多数平台标准。'}
        </div>
      </div>
    </div>
  );
}

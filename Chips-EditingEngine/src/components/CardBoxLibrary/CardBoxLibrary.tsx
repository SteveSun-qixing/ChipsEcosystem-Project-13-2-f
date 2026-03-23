import React, { useState, useMemo } from 'react';
import { CardTypeGrid } from './CardTypeGrid';
import { LayoutTypeGrid } from './LayoutTypeGrid';
import { useCardTypeDefinitions, useLayoutTypeDefinitions } from './data';
import { useTranslation } from '../../hooks/useTranslation';
import { DragProvider } from './DragContext';
import './CardBoxLibrary.css';

type TabType = 'cards' | 'boxes';

export default function CardBoxLibrary() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('cards');
  const allCardTypes = useCardTypeDefinitions();
  const allLayoutTypes = useLayoutTypeDefinitions();

  const currentCardCount = allCardTypes.length;
  const currentLayoutCount = allLayoutTypes.length;

  const hasContent = useMemo(() => {
    return activeTab === 'cards' ? currentCardCount > 0 : currentLayoutCount > 0;
  }, [activeTab, currentCardCount, currentLayoutCount]);

  return (
    <DragProvider>
      <div className="card-box-library">
        {/* Tabs */}
        <div className="card-box-library__tabs">
          <button
            type="button"
            className={`card-box-library__tab ${activeTab === 'cards' ? 'card-box-library__tab--active' : ''}`}
            onClick={() => setActiveTab('cards')}
          >
            <span className="card-box-library__tab-icon">🃏</span>
            <span className="card-box-library__tab-label">{t('card_box.tab_cards') || '基础卡片'}</span>
            <span className="card-box-library__tab-count">{currentCardCount}</span>
          </button>
          <button
            type="button"
            className={`card-box-library__tab ${activeTab === 'boxes' ? 'card-box-library__tab--active' : ''}`}
            onClick={() => setActiveTab('boxes')}
          >
            <span className="card-box-library__tab-icon">📦</span>
            <span className="card-box-library__tab-label">{t('card_box.tab_boxes') || '布局盒子'}</span>
            <span className="card-box-library__tab-count">{currentLayoutCount}</span>
          </button>
        </div>

        {/* Content */}
        <div className="card-box-library__content">
          {activeTab === 'cards' ? (
            hasContent ? (
              <CardTypeGrid types={allCardTypes} />
            ) : (
              <div className="card-box-library__empty">
                <span className="card-box-library__empty-icon">📭</span>
                <span className="card-box-library__empty-text">{t('card_box.empty_cards') || '没有已安装的卡片'}</span>
                <span className="card-box-library__empty-hint">{t('card_box.empty_hint') || '请在插件市场中安装更多卡片和布局'}</span>
              </div>
            )
          ) : (
            hasContent ? (
              <LayoutTypeGrid types={allLayoutTypes} />
            ) : (
              <div className="card-box-library__empty">
                <span className="card-box-library__empty-icon">📭</span>
                <span className="card-box-library__empty-text">{t('card_box.empty_boxes') || '没有已安装的布局'}</span>
                <span className="card-box-library__empty-hint">{t('card_box.empty_hint') || '请在插件市场中安装更多卡片和布局'}</span>
              </div>
            )
          )}
        </div>
      </div>
    </DragProvider>
  );
}

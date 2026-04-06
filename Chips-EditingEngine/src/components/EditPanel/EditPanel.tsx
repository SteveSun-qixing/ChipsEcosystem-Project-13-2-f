import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useCard } from '../../context/CardContext';
import { PluginHost } from './PluginHost';
import './EditPanel.css';

interface EditPanelProps {
  position?: 'right' | 'left';
}

export default function EditPanel({
  position = 'right',
}: EditPanelProps) {
  const { t } = useTranslation();
  const { activeCardId, selectedBaseCardId, getCard, saveCard, updateBasicCard } = useCard();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pendingSaveOnBlurRef = useRef(false);
  const [isPanelFocused, setIsPanelFocused] = useState(false);

  const activeCard = activeCardId ? getCard(activeCardId) : null;
  const selectedBaseCard = activeCard && selectedBaseCardId
    ? activeCard.structure.basicCards.find(bc => bc.id === selectedBaseCardId)
    : null;
  const persistedRevision = activeCard?.persistedRevision ?? 0;
  const pendingPersistRevision = activeCard?.pendingPersistRevision ?? persistedRevision;
  const hasPendingPersist = pendingPersistRevision > persistedRevision;

  const panelClass = [
    'edit-panel',
    'edit-panel--expanded',
    `edit-panel--${position}`,
  ].join(' ');

  const handlePanelFocusCapture = useCallback(() => {
    setIsPanelFocused(true);
    pendingSaveOnBlurRef.current = false;
  }, []);

  const handlePanelBlurCapture = useCallback(() => {
    window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      const activeElement = document.activeElement;
      const focusStillInside = Boolean(
        panel
        && activeElement instanceof Node
        && panel.contains(activeElement),
      );

      if (focusStillInside) {
        setIsPanelFocused(true);
        return;
      }

      setIsPanelFocused(false);
      pendingSaveOnBlurRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!activeCard || isPanelFocused || !pendingSaveOnBlurRef.current || !hasPendingPersist) {
      return;
    }

    pendingSaveOnBlurRef.current = false;
    void saveCard(activeCard.id);
  }, [activeCard, hasPendingPersist, isPanelFocused, saveCard]);

  return (
    <div
      ref={panelRef}
      className={panelClass}
      role="complementary"
      aria-label={t('edit_panel.title') || '编辑面板'}
      onFocusCapture={handlePanelFocusCapture}
      onBlurCapture={handlePanelBlurCapture}
    >
      <div className="edit-panel__content">
        {activeCard && selectedBaseCard ? (
          <PluginHost
            cardId={activeCard.id}
            cardPath={activeCard.path}
            cardType={selectedBaseCard.type}
            baseCardId={selectedBaseCard.id}
            config={selectedBaseCard.data}
            pendingResourceImports={selectedBaseCard.pendingResourceImports}
            onConfigChange={(nextConfig, resourceOperations) => {
              if (activeCard) {
                updateBasicCard(
                  activeCard.id,
                  selectedBaseCard.id,
                  nextConfig,
                  resourceOperations,
                  { persist: false },
                );
              }
            }}
          />
        ) : (
          <div className="edit-panel__empty">
            <div className="edit-panel__empty-icon">📝</div>
            <p className="edit-panel__empty-text">{t('edit_panel.empty_hint') || '请在左侧选择要编辑的内容'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

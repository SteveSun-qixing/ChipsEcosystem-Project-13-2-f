import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CardWindowBase } from '../CardWindowBase/CardWindowBase';
import { WindowMenu } from '../WindowMenu/WindowMenu';
import { useCard } from '../../context/CardContext';
import { workspaceService } from '../../services/workspace-service';
import { useCanvas } from '../../layouts/InfiniteCanvas/CanvasContext';
import { useTranslation } from '../../hooks/useTranslation';
import type { CardWindowConfig, Position, Size } from '../../types/window';
import './CardWindow.css';

export interface CardWindowProps {
    config: CardWindowConfig;
    onUpdateConfig: (config: Partial<CardWindowConfig>) => void;
    onClose: () => void;
    onFocus: () => void;
}

export function CardWindow({
    config,
    onUpdateConfig,
    onClose,
    onFocus
}: CardWindowProps) {
    const { openCards, selectedBaseCardId, setActiveCard, setSelectedBaseCard } = useCard();
    const canvasContext = useCanvas();
    const { t } = useTranslation();

    const cardInfo = openCards.get(config.cardId);
    const isEditing = !!config.isEditing;
    const windowState = config.state;

    const [isCoverDragging, setIsCoverDragging] = useState(false);
    const [coverRenderPosition, setCoverRenderPosition] = useState(config.position);

    const coverDragStart = useRef({ x: 0, y: 0 });
    const coverInitialPosition = useRef({ x: 0, y: 0 });
    const coverDragMoved = useRef(false);

    useEffect(() => {
        if (!isCoverDragging) {
            setCoverRenderPosition(config.position);
        }
    }, [config.position, isCoverDragging]);

    const toggleEditMode = () => onUpdateConfig({ isEditing: !isEditing });
    const switchToCover = () => onUpdateConfig({ state: 'cover' });
    const restoreFromCover = () => onUpdateConfig({ state: 'normal' });

    const handleUpdatePosition = (pos: Position) => onUpdateConfig({ position: pos });
    const handleUpdateSize = (size: Size) => onUpdateConfig({ size });

    const handleUpdateTitle = (title: string) => {
        // We would update the store metadata, but we'll leave it as a placeholder here for the future metadata mutation
        // cardStore.updateCardMetadata(config.cardId, { name: title });
        workspaceService.renameFile(config.cardId, `${title}.card`);
        console.warn('[CardWindow] 更新卡片名称:', title, 'ID:', config.cardId);
    };

    const handleMinimize = () => onUpdateConfig({ state: 'minimized' });

    const handleCollapse = () => {
        const newState = windowState === 'collapsed' ? 'normal' : 'collapsed';
        onUpdateConfig({ state: newState });
    };

    const selectBaseCard = (baseCardId: string) => {
        setActiveCard(config.cardId);
        setSelectedBaseCard(baseCardId);
    };

    const handleCoverMouseDown = (event: React.MouseEvent) => {
        if (event.button !== 0) return;
        setIsCoverDragging(true);
        coverDragMoved.current = false;
        coverDragStart.current = { x: event.clientX, y: event.clientY };
        coverInitialPosition.current = { ...config.position };
        setCoverRenderPosition({ ...config.position });
        event.preventDefault();
    };

    const handleCoverMouseMove = useCallback((event: MouseEvent) => {
        if (!isCoverDragging) return;
        const zoom = canvasContext?.zoom ?? 1;
        const deltaX = (event.clientX - coverDragStart.current.x) / zoom;
        const deltaY = (event.clientY - coverDragStart.current.y) / zoom;

        if (!coverDragMoved.current && Math.abs(deltaX) + Math.abs(deltaY) > 2 / zoom) {
            coverDragMoved.current = true;
        }

        setCoverRenderPosition({
            x: coverInitialPosition.current.x + deltaX,
            y: coverInitialPosition.current.y + deltaY,
        });
    }, [isCoverDragging, canvasContext]);

    const handleCoverMouseUp = useCallback(() => {
        if (isCoverDragging && !coverDragMoved.current) {
            restoreFromCover();
        } else if (isCoverDragging && coverDragMoved.current) {
            onUpdateConfig({ position: coverRenderPosition });
        }
        setIsCoverDragging(false);
        coverDragMoved.current = false;
    }, [isCoverDragging, coverRenderPosition, onUpdateConfig]);

    useEffect(() => {
        if (isCoverDragging) {
            document.addEventListener('mousemove', handleCoverMouseMove);
            document.addEventListener('mouseup', handleCoverMouseUp);
        } else {
            document.removeEventListener('mousemove', handleCoverMouseMove);
            document.removeEventListener('mouseup', handleCoverMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleCoverMouseMove);
            document.removeEventListener('mouseup', handleCoverMouseUp);
        };
    }, [isCoverDragging, handleCoverMouseMove, handleCoverMouseUp]);

    const coverStyle = {
        transform: `translate(${coverRenderPosition.x}px, ${coverRenderPosition.y}px)`
    };

    if (windowState === 'cover') {
        const rawRatio = config.coverRatio?.replace(':', '/') || '3/4';
        return (
            <div
                className={`card-cover ${isCoverDragging ? 'card-cover--dragging' : ''}`}
                style={coverStyle}
                onMouseDown={handleCoverMouseDown}
            >
                <div className="card-cover__image" style={{ aspectRatio: rawRatio }}>
                    <div className="card-cover__placeholder">
                        {cardInfo?.metadata?.name || t('card_window.untitled')}
                    </div>
                </div>
                <div className="card-cover__title">
                    {cardInfo?.metadata?.name || t('card_window.untitled')}
                </div>
            </div>
        );
    }

    return (
        <CardWindowBase
            config={config}
            onUpdatePosition={handleUpdatePosition}
            onUpdateSize={handleUpdateSize}
            onFocus={onFocus}
            onClose={onClose}
            onMinimize={handleMinimize}
            onCollapse={handleCollapse}
            headerSlot={
                <WindowMenu
                    title={cardInfo?.metadata?.name || t('card_window.untitled')}
                    isEditing={isEditing}
                    showLock={true}
                    showCover={true}
                    showSettings={true}
                    onToggleEdit={toggleEditMode}
                    onSwitchToCover={switchToCover}
                    onUpdateTitle={handleUpdateTitle}
                    onSettings={() => console.log('Open Settings')}
                />
            }
        >
            <div className="card-window__content">
                {!cardInfo ? (
                    <div className="card-window__loading">
                        <span className="card-window__loading-icon">⏳</span>
                        <span className="card-window__loading-text">{t('card_window.loading')}</span>
                    </div>
                ) : (
                    <div className="card-window__body">
                        {(!cardInfo.structure || !cardInfo.structure.structure || cardInfo.structure.structure.length === 0) ? (
                            <div className="card-window__empty">
                                <span className="card-window__empty-icon">📄</span>
                                <span className="card-window__empty-text">{t('card_window.empty')}</span>
                                {isEditing && (
                                    <span className="card-window__empty-hint">{t('card_window.empty_hint')}</span>
                                )}
                            </div>
                        ) : (
                            cardInfo.structure.structure.map((baseCard: any, idx: number) => (
                                <div
                                    key={baseCard.id}
                                    className={`card-window__base-card ${selectedBaseCardId === baseCard.id ? 'card-window__base-card--selected' : ''} ${isEditing ? 'card-window__base-card--editing' : ''}`}
                                    onClick={() => selectBaseCard(baseCard.id)}
                                >
                                    <div className="card-window__base-card-content">
                                        <div className="card-window__base-card-placeholder">
                                            <span className="card-window__base-card-type-icon">📄</span>
                                            <span>{baseCard.type}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </CardWindowBase>
    );
}

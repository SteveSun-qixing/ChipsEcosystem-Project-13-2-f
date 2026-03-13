import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useThemeRuntime } from '@chips/component-library';
import { CardWindowBase } from '../CardWindowBase/CardWindowBase';
import { WindowMenu } from '../WindowMenu/WindowMenu';
import { useCard } from '../../context/CardContext';
import { getChipsClient } from '../../services/bridge-client';
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
    const { openCards, activeCardId, selectedBaseCardId, setActiveCard, setSelectedBaseCard } = useCard();
    const canvasContext = useCanvas();
    const themeRuntime = useThemeRuntime();
    const { t } = useTranslation();

    const cardInfo = openCards.get(config.cardId);
    const isEditing = !!config.isEditing;
    const windowState = config.state;
    const clientRef = useRef(getChipsClient());
    const previewHostRef = useRef<HTMLDivElement | null>(null);
    const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
    const persistedRevision = cardInfo?.persistedRevision ?? 0;
    const visibleBaseCards = cardInfo?.structure.basicCards ?? [];
    const visibleBaseCardIds = visibleBaseCards.map((baseCard) => baseCard.id).join('|');

    const [isCoverDragging, setIsCoverDragging] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
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

    const handleUpdateTitle = async (title: string) => {
        try {
            await workspaceService.renameFile(config.cardId, `${title}.card`);
        } catch (error) {
            console.error('[CardWindow] Failed to rename card metadata.', error);
        }
    };

    const handleMinimize = () => onUpdateConfig({ state: 'minimized' });

    const handleCollapse = () => {
        const newState = windowState === 'collapsed' ? 'normal' : 'collapsed';
        onUpdateConfig({ state: newState });
    };

    const selectBaseCard = useCallback((baseCardId: string) => {
        setActiveCard(config.cardId);
        setSelectedBaseCard(baseCardId);
    }, [config.cardId, setActiveCard, setSelectedBaseCard]);

    const handleWindowFocus = () => {
        setActiveCard(config.cardId);
        onFocus();
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

    useEffect(() => {
        const host = previewHostRef.current;
        if (!host) {
            return;
        }

        while (host.firstChild) {
            host.removeChild(host.firstChild);
        }

        previewFrameRef.current = null;

        if (!cardInfo || windowState === 'cover' || visibleBaseCards.length === 0) {
            setIsPreviewLoading(false);
            setPreviewError(null);
            return;
        }

        let disposed = false;
        const cleanupTasks: Array<() => void> = [];

        setIsPreviewLoading(true);
        setPreviewError(null);

        clientRef.current.card.compositeWindow.render({
            cardFile: cardInfo.path,
            mode: isEditing ? 'preview' : 'view',
        }).then((result) => {
            if (disposed) {
                return;
            }

            const frame = result.frame;
            previewFrameRef.current = frame;
            frame.style.width = '100%';
            frame.style.height = '100%';
            frame.style.border = 'none';
            frame.style.display = 'block';
            frame.style.background = 'transparent';
            host.appendChild(frame);

            const handleNativeLoad = () => {
                if (!disposed) {
                    setIsPreviewLoading(false);
                }
            };

            frame.addEventListener('load', handleNativeLoad);
            cleanupTasks.push(() => {
                frame.removeEventListener('load', handleNativeLoad);
            });

            cleanupTasks.push(
                clientRef.current.card.compositeWindow.onNodeSelect(frame, (payload) => {
                    if (disposed || !isEditing || !payload.nodeId) {
                        return;
                    }
                    if (!visibleBaseCards.some((baseCard) => baseCard.id === payload.nodeId)) {
                        return;
                    }
                    selectBaseCard(payload.nodeId);
                }),
            );

            cleanupTasks.push(
                clientRef.current.card.compositeWindow.onReady(frame, () => {
                    if (!disposed) {
                        setIsPreviewLoading(false);
                    }
                }),
            );

            cleanupTasks.push(
                clientRef.current.card.compositeWindow.onFatalError(frame, (error) => {
                    if (!disposed) {
                        console.error('[CardWindow] Composite preview fatal error.', {
                            cardId: config.cardId,
                            cardFile: cardInfo?.path,
                            mode: isEditing ? 'preview' : 'view',
                            error,
                        });
                        setIsPreviewLoading(false);
                        setPreviewError(error.message || (t('plugin_host.error') || '加载失败'));
                    }
                }),
            );

            cleanupTasks.push(
                clientRef.current.card.compositeWindow.onNodeError(frame, (payload) => {
                    console.warn('[CardWindow] Composite node degraded.', payload);
                }),
            );
        }).catch((error: unknown) => {
            if (disposed) {
                return;
            }
            const message = error instanceof Error ? error.message : String(error);
            console.error('[CardWindow] Failed to render composite preview.', {
                cardId: config.cardId,
                cardFile: cardInfo?.path,
                mode: isEditing ? 'preview' : 'view',
                error,
            });
            setIsPreviewLoading(false);
            setPreviewError(message || (t('plugin_host.error') || '加载失败'));
        });

        return () => {
            disposed = true;
            cleanupTasks.forEach((cleanup) => cleanup());
            const frame = previewFrameRef.current;
            if (frame && frame.parentElement) {
                frame.parentElement.removeChild(frame);
            }
            previewFrameRef.current = null;
        };
    }, [
        cardInfo?.path,
        isEditing,
        persistedRevision,
        selectBaseCard,
        themeRuntime.cacheKey,
        t,
        visibleBaseCardIds,
        windowState,
    ]);

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
            onFocus={handleWindowFocus}
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
                ) : visibleBaseCards.length === 0 ? (
                    <div className="card-window__empty">
                        <span className="card-window__empty-icon">📄</span>
                        <span className="card-window__empty-text">{t('card_window.empty')}</span>
                        {isEditing && (
                            <span className="card-window__empty-hint">{t('card_window.empty_hint')}</span>
                        )}
                    </div>
                ) : (
                    <div className="card-window__workspace">
                        <div className="card-window__preview">
                            <div ref={previewHostRef} className="card-window__preview-frame" />

                            {isPreviewLoading && (
                                <div className="card-window__overlay">
                                    <span className="card-window__loading-icon">⏳</span>
                                    <span className="card-window__loading-text">{t('card_window.loading')}</span>
                                </div>
                            )}

                            {previewError && (
                                <div className="card-window__overlay card-window__overlay--error">
                                    <span className="card-window__empty-icon">⚠️</span>
                                    <span className="card-window__empty-text">{previewError}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </CardWindowBase>
    );
}

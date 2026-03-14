import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useThemeRuntime } from '@chips/component-library';
import type { CompositeInteractionPayload } from 'chips-sdk';
import { CardWindowBase } from '../CardWindowBase/CardWindowBase';
import { WindowMenu } from '../WindowMenu/WindowMenu';
import { useCard } from '../../context/CardContext';
import { getChipsClient } from '../../services/bridge-client';
import { workspaceService } from '../../services/workspace-service';
import { useCanvas } from '../../layouts/InfiniteCanvas/CanvasContext';
import { useTranslation } from '../../hooks/useTranslation';
import type { CardWindowConfig, Position, Size } from '../../types/window';
import { globalEventEmitter } from '../../core/event-emitter';
import './CardWindow.css';

const EDITING_PREVIEW_REFRESH_DEBOUNCE_MS = 320;
const ACTIVE_EDITOR_PREVIEW_REFRESH_DEBOUNCE_MS = 1200;
const ACTIVE_EDITOR_ACTIVITY_WINDOW_MS = 3000;
const CardSettingsDialog = lazy(() => import('../CardSettings/CardSettingsDialog').then((module) => ({ default: module.CardSettingsDialog })));

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
    const interactionPolicy = windowState === 'normal' ? 'delegate' : 'native';
    const clientRef = useRef(getChipsClient());
    const translationRef = useRef(t);
    const panByInputRef = useRef(canvasContext.panByInput);
    const zoomByFactorAtPointRef = useRef(canvasContext.zoomByFactorAtPoint);
    const markInteractionSequenceRef = useRef(canvasContext.markInteractionSequence);
    const previewHostRef = useRef<HTMLDivElement | null>(null);
    const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
    const hasResolvedPreviewRef = useRef(false);
    const lastEditorActivityAtRef = useRef(0);
    const visibleBaseCards = cardInfo?.structure.basicCards ?? [];
    const visibleBaseCardIds = visibleBaseCards.map((baseCard) => baseCard.id).join('|');

    const [isCoverDragging, setIsCoverDragging] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewHeight, setPreviewHeight] = useState<number | null>(null);
    const [coverRenderPosition, setCoverRenderPosition] = useState(config.position);
    const [previewRefreshRevision, setPreviewRefreshRevision] = useState(0);

    const coverDragStart = useRef({ x: 0, y: 0 });
    const coverInitialPosition = useRef({ x: 0, y: 0 });
    const coverDragMoved = useRef(false);

    useEffect(() => {
        translationRef.current = t;
    }, [t]);

    useEffect(() => {
        panByInputRef.current = canvasContext.panByInput;
        zoomByFactorAtPointRef.current = canvasContext.zoomByFactorAtPoint;
        markInteractionSequenceRef.current = canvasContext.markInteractionSequence;
    }, [
        canvasContext.markInteractionSequence,
        canvasContext.panByInput,
        canvasContext.zoomByFactorAtPoint,
    ]);

    useEffect(() => {
        const subscriptionId = globalEventEmitter.on<{ cardId?: string; at?: number }>('card:editor-activity', (payload) => {
            if (payload?.cardId !== config.cardId) {
                return;
            }

            lastEditorActivityAtRef.current = typeof payload.at === 'number' ? payload.at : Date.now();
        });

        return () => {
            globalEventEmitter.off('card:editor-activity', subscriptionId);
        };
    }, [config.cardId]);

    useEffect(() => {
        let refreshTimer: number | null = null;
        const subscriptions: Array<{ event: string; id: string }> = [];

        const schedulePreviewRefresh = () => {
            if (windowState === 'cover') {
                return;
            }

            if (refreshTimer !== null) {
                window.clearTimeout(refreshTimer);
            }

            if (!isEditing) {
                setPreviewRefreshRevision((current) => current + 1);
                return;
            }

            const lastActivityAt = lastEditorActivityAtRef.current;
            const hasRecentEditorActivity =
                lastActivityAt > 0 &&
                Date.now() - lastActivityAt <= ACTIVE_EDITOR_ACTIVITY_WINDOW_MS;
            const debounceMs = hasRecentEditorActivity
                ? ACTIVE_EDITOR_PREVIEW_REFRESH_DEBOUNCE_MS
                : EDITING_PREVIEW_REFRESH_DEBOUNCE_MS;

            refreshTimer = window.setTimeout(() => {
                refreshTimer = null;
                setPreviewRefreshRevision((current) => current + 1);
            }, debounceMs);
        };

        const subscribe = (event: string) => {
            const id = globalEventEmitter.on<{ cardId?: string }>(event, (payload) => {
                if (payload?.cardId !== config.cardId) {
                    return;
                }
                schedulePreviewRefresh();
            });
            subscriptions.push({ event, id });
        };

        subscribe('card:basic-card-updated');
        subscribe('card:basic-card-added');
        subscribe('card:basic-card-removed');
        subscribe('card:basic-card-moved');
        subscribe('card:metadata-updated');

        return () => {
            if (refreshTimer !== null) {
                window.clearTimeout(refreshTimer);
            }
            subscriptions.forEach(({ event, id }) => {
                globalEventEmitter.off(event, id);
            });
        };
    }, [config.cardId, isEditing, windowState]);

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

    const handleOpenSettings = () => {
        setIsSettingsOpen(true);
    };

    const handleCloseSettings = () => {
        setIsSettingsOpen(false);
    };

    const handleCompositeInteraction = useCallback((frame: HTMLIFrameElement, payload: CompositeInteractionPayload) => {
        if (windowState !== 'normal') {
            return;
        }

        markInteractionSequenceRef.current({ suppressDesktopZoom: true });

        if (payload.intent === 'zoom') {
            const zoomDelta = Number(payload.zoomDelta);
            if (!Number.isFinite(zoomDelta)) {
                return;
            }

            const frameRect = frame.getBoundingClientRect();
            const anchorX = frameRect.left + payload.clientX;
            const anchorY = frameRect.top + payload.clientY;
            const zoomFactor = Math.max(0.55, Math.min(1.45, 1 + zoomDelta));
            zoomByFactorAtPointRef.current(zoomFactor, anchorX, anchorY);
            return;
        }

        panByInputRef.current(payload.deltaX, payload.deltaY);
    }, [windowState]);

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

        if (!cardInfo || windowState === 'cover' || visibleBaseCards.length === 0) {
            while (host.firstChild) {
                host.removeChild(host.firstChild);
            }
            previewFrameRef.current = null;
            hasResolvedPreviewRef.current = false;
            setIsPreviewLoading(false);
            setPreviewError(null);
            setPreviewHeight(null);
            return;
        }

        let disposed = false;
        const cleanupTasks: Array<() => void> = [];
        let stagedFrame: HTMLIFrameElement | null = null;
        const previousFrame = previewFrameRef.current;
        const hasVisiblePreview = !!(previousFrame && previousFrame.parentElement === host);
        const shouldShowInitialLoading = !hasVisiblePreview && !hasResolvedPreviewRef.current;

        setIsPreviewLoading(shouldShowInitialLoading);
        setPreviewError(null);
        if (shouldShowInitialLoading) {
            setPreviewHeight(null);
        }

        clientRef.current.card.compositeWindow.render({
            cardFile: cardInfo.path,
            mode: isEditing ? 'preview' : 'view',
            interactionPolicy,
        }).then((result) => {
            if (disposed) {
                return;
            }

            const frame = result.frame;
            stagedFrame = frame;
            frame.style.width = '100%';
            frame.style.height = '100%';
            frame.style.border = 'none';
            frame.style.display = 'block';
            frame.style.background = 'transparent';
            frame.style.position = 'absolute';
            frame.style.inset = '0';
            frame.style.visibility = hasVisiblePreview ? 'hidden' : 'visible';
            frame.style.pointerEvents = hasVisiblePreview ? 'none' : 'auto';
            host.appendChild(frame);

            let didRevealFrame = false;
            const revealFrame = () => {
                if (disposed || didRevealFrame) {
                    return;
                }

                didRevealFrame = true;
                hasResolvedPreviewRef.current = true;
                frame.style.visibility = 'visible';
                frame.style.pointerEvents = 'auto';
                previewFrameRef.current = frame;

                if (previousFrame && previousFrame !== frame && previousFrame.parentElement === host) {
                    previousFrame.parentElement.removeChild(previousFrame);
                }

                setIsPreviewLoading(false);
                setPreviewError(null);
            };

            const handleNativeLoad = () => {
                revealFrame();
            };

            frame.addEventListener('load', handleNativeLoad);
            cleanupTasks.push(() => {
                frame.removeEventListener('load', handleNativeLoad);
            });

            cleanupTasks.push(
                clientRef.current.card.compositeWindow.onResize(frame, (payload) => {
                    if (disposed) {
                        return;
                    }
                    const nextHeight = Math.max(1, Math.ceil(payload.height));
                    setPreviewHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
                }),
            );

            cleanupTasks.push(
                clientRef.current.card.compositeWindow.onInteraction(frame, (payload) => {
                    if (disposed) {
                        return;
                    }

                    handleCompositeInteraction(frame, payload);
                }),
            );

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
                    revealFrame();
                }),
            );

            cleanupTasks.push(
                clientRef.current.card.compositeWindow.onFatalError(frame, (error) => {
                    if (disposed) {
                        return;
                    }

                    console.error('[CardWindow] Composite preview fatal error.', {
                        cardId: config.cardId,
                        cardFile: cardInfo?.path,
                        mode: isEditing ? 'preview' : 'view',
                        error,
                    });

                    if (frame.parentElement && frame !== previewFrameRef.current) {
                        frame.parentElement.removeChild(frame);
                    }

                    if (shouldShowInitialLoading) {
                        setIsPreviewLoading(false);
                        setPreviewError(error.message || (translationRef.current('plugin_host.error') || '加载失败'));
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

            if (shouldShowInitialLoading) {
                setIsPreviewLoading(false);
                setPreviewError(message || (translationRef.current('plugin_host.error') || '加载失败'));
            }
        });

        return () => {
            disposed = true;
            cleanupTasks.forEach((cleanup) => cleanup());
            if (stagedFrame && stagedFrame.parentElement && stagedFrame !== previewFrameRef.current) {
                stagedFrame.parentElement.removeChild(stagedFrame);
            }
        };
    }, [
        cardInfo?.path,
        isEditing,
        previewRefreshRevision,
        selectBaseCard,
        themeRuntime.cacheKey,
        visibleBaseCardIds,
        interactionPolicy,
        handleCompositeInteraction,
        windowState,
    ]);

    const coverStyle = {
        transform: `translate(${coverRenderPosition.x}px, ${coverRenderPosition.y}px)`
    };
    const previewContainerStyle: React.CSSProperties = {
        flex: '1 1 auto',
        width: '100%',
        maxWidth: '100%',
        alignSelf: 'stretch',
    };

    if (previewHeight) {
        previewContainerStyle.height = `${previewHeight}px`;
        previewContainerStyle.minHeight = `${previewHeight}px`;
    }

    if (windowState === 'cover') {
        const rawRatio = (cardInfo?.metadata?.coverRatio ?? config.coverRatio)?.replace(':', '/') || '3/4';
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
        <>
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
                        onSettings={handleOpenSettings}
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
                            <div
                                className="card-window__preview"
                                data-chips-drop-surface="composite-preview"
                                data-chips-card-id={config.cardId}
                                data-chips-base-card-count={visibleBaseCards.length}
                                data-chips-composite-scroll-surface={interactionPolicy}
                                style={previewContainerStyle}
                            >
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
            <Suspense fallback={null}>
                <CardSettingsDialog
                    cardId={config.cardId}
                    visible={isSettingsOpen}
                    onClose={handleCloseSettings}
                    onSave={handleCloseSettings}
                />
            </Suspense>
        </>
    );
}

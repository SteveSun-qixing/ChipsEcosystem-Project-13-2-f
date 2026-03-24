import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardWindowBase } from '../CardWindowBase/CardWindowBase';
import { useTranslation } from '../../hooks/useTranslation';
import { workspaceService } from '../../services/workspace-service';
import { boxDocumentService, type BoxDocumentSessionSnapshot } from '../../services/box-document-service';
import { getChipsClient } from '../../services/bridge-client';
import type { BoxWindowConfig, Position, Size } from '../../types/window';
import {
    createInMemoryBoxLayoutRuntime,
    loadLayoutDefinition,
    type BoxLayoutDefinition,
} from 'chips-box-layout-host';
import './BoxWindow.css';

function isSupportedBoxUrl(value: string): boolean {
    try {
        const parsed = new URL(value);
        return ['file:', 'http:', 'https:', 'webdav:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

export interface BoxWindowProps {
    config: BoxWindowConfig;
    onUpdateConfig: (config: Partial<BoxWindowConfig>) => void;
    onClose: () => void;
    onFocus: () => void;
}

export function BoxWindow({
    config,
    onUpdateConfig,
    onClose,
    onFocus,
}: BoxWindowProps) {
    const { t } = useTranslation();
    const client = useMemo(() => getChipsClient(), []);
    const editorContainerRef = useRef<HTMLDivElement | null>(null);
    const previewContainerRef = useRef<HTMLDivElement | null>(null);
    const [session, setSession] = useState<BoxDocumentSessionSnapshot | null>(() => boxDocumentService.getSession(config.boxId));
    const [layoutDefinition, setLayoutDefinition] = useState<BoxLayoutDefinition | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(() => !boxDocumentService.getSession(config.boxId));
    const [newEntryUrl, setNewEntryUrl] = useState('');

    const activeLayoutType = session?.content.activeLayoutType ?? session?.metadata.activeLayoutType ?? '';
    const activeLayoutConfig = useMemo(() => {
        if (!layoutDefinition || !session) {
            return null;
        }
        const rawConfig = session.content.layoutConfigs[activeLayoutType] ?? layoutDefinition.createDefaultConfig();
        return layoutDefinition.normalizeConfig(rawConfig);
    }, [activeLayoutType, layoutDefinition, session]);

    useEffect(() => {
        let disposed = false;
        const eventName = `session:${config.boxId}`;
        const handleSessionChange = (next: BoxDocumentSessionSnapshot) => {
            if (!disposed) {
                setSession(next);
            }
        };

        boxDocumentService.on(eventName, handleSessionChange);
        setIsLoading(true);
        setLoadError(null);

        void boxDocumentService.openBox(
            config.boxPath,
            workspaceService.getState().rootPath,
            config.boxId,
        ).then((snapshot) => {
            if (!disposed) {
                setSession(snapshot);
                setIsLoading(false);
            }
        }).catch((error) => {
            if (!disposed) {
                setLoadError(error instanceof Error ? error.message : String(error));
                setIsLoading(false);
            }
        });

        return () => {
            disposed = true;
            boxDocumentService.off(eventName, handleSessionChange);
        };
    }, [config.boxId, config.boxPath]);

    useEffect(() => {
        if (!activeLayoutType) {
            setLayoutDefinition(null);
            return;
        }

        let cancelled = false;
        void loadLayoutDefinition(client, activeLayoutType).then((definition) => {
            if (!cancelled) {
                setLayoutDefinition(definition);
            }
        }).catch((error) => {
            if (!cancelled) {
                setLayoutDefinition(null);
                setLoadError(error instanceof Error ? error.message : String(error));
            }
        });

        return () => {
            cancelled = true;
        };
    }, [activeLayoutType, client]);

    useEffect(() => {
        const container = editorContainerRef.current;
        if (!container || !layoutDefinition || !session || !activeLayoutConfig || !layoutDefinition.renderEditor) {
            if (container) {
                container.replaceChildren();
            }
            return;
        }

        container.replaceChildren();
        const cleanup = layoutDefinition.renderEditor({
            container,
            entries: session.entries,
            initialConfig: activeLayoutConfig,
            onChange(next) {
                boxDocumentService.updateLayoutConfig(
                    session.boxId,
                    activeLayoutType,
                    layoutDefinition.normalizeConfig(next),
                );
            },
            readBoxAsset(assetPath) {
                return boxDocumentService.readBoxAsset(session.boxId, assetPath);
            },
            importBoxAsset(input) {
                return boxDocumentService.importBoxAsset(session.boxId, input);
            },
            deleteBoxAsset(assetPath) {
                return boxDocumentService.deleteBoxAsset(session.boxId, assetPath);
            },
        });

        return () => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
            container.replaceChildren();
        };
    }, [activeLayoutConfig, activeLayoutType, layoutDefinition, session]);

    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container || !layoutDefinition || !session || !activeLayoutConfig) {
            if (container) {
                container.replaceChildren();
            }
            return;
        }

        container.replaceChildren();
        const runtime = createInMemoryBoxLayoutRuntime({
            getEntries: () => boxDocumentService.getSession(session.boxId)?.entries ?? [],
            readBoxAsset(assetPath) {
                return boxDocumentService.readBoxAsset(session.boxId, assetPath);
            },
        });

        const cleanup = layoutDefinition.renderView({
            container,
            sessionId: `editing:${session.boxId}`,
            box: {
                boxId: session.boxId,
                boxFile: session.boxFile,
                name: session.metadata.name,
                activeLayoutType,
                availableLayouts: Object.keys(session.content.layoutConfigs),
                tags: session.metadata.tags,
                coverAsset: session.metadata.coverAsset,
                capabilities: {
                    listEntries: true,
                    readEntryDetail: true,
                    resolveEntryResource: true,
                    readBoxAsset: true,
                    prefetchEntries: true,
                },
            },
            initialView: {
                items: session.entries,
                total: session.entries.length,
            },
            config: activeLayoutConfig,
            runtime,
        });

        return () => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
            container.replaceChildren();
        };
    }, [activeLayoutConfig, activeLayoutType, layoutDefinition, session]);

    const handleUpdatePosition = (position: Position) => onUpdateConfig({ position });
    const handleUpdateSize = (size: Size) => onUpdateConfig({ size });
    const handleMinimize = () => onUpdateConfig({ state: 'minimized' });
    const handleCollapse = () => {
        onUpdateConfig({ state: config.state === 'collapsed' ? 'normal' : 'collapsed' });
    };

    const handleSave = useCallback(async () => {
        if (!session) {
            return;
        }

        await boxDocumentService.saveBox(session.boxId);
    }, [session]);

    const handleClose = useCallback(async () => {
        try {
            if (session?.isDirty) {
                await boxDocumentService.saveBox(session.boxId);
            }
            await boxDocumentService.closeBox(config.boxId);
            onClose();
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : String(error));
        }
    }, [config.boxId, onClose, session]);

    const handleAddEntry = useCallback(() => {
        if (!session) {
            return;
        }
        const trimmed = newEntryUrl.trim();
        if (!trimmed || !isSupportedBoxUrl(trimmed)) {
            return;
        }
        boxDocumentService.addEntry(session.boxId, trimmed);
        setNewEntryUrl('');
    }, [newEntryUrl, session]);

    return (
        <CardWindowBase
            config={config}
            minWidth={860}
            minHeight={560}
            onUpdatePosition={handleUpdatePosition}
            onUpdateSize={handleUpdateSize}
            onFocus={onFocus}
            onClose={() => { void handleClose(); }}
            onMinimize={handleMinimize}
            onCollapse={handleCollapse}
            headerSlot={(
                <div className="box-window__header">
                    <span className="box-window__header-title">{config.title}</span>
                    <span className="box-window__header-meta">
                        {session?.isSaving
                            ? (t('box_window.status_saving') || '保存中')
                            : session?.isDirty
                                ? (t('box_window.status_dirty') || '未保存')
                                : (t('box_window.status_saved') || '已保存')}
                    </span>
                    <button
                        type="button"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={() => { void handleSave(); }}
                    >
                        {t('box_window.save') || '保存'}
                    </button>
                </div>
            )}
        >
            {isLoading ? (
                <div className="box-window__empty">{t('box_window.loading') || '正在加载箱子...'}</div>
            ) : loadError ? (
                <div className="box-window__error">{loadError}</div>
            ) : !session ? (
                <div className="box-window__empty">{t('box_window.empty') || '箱子会话不可用'}</div>
            ) : (
                <div className="box-window">
                    <section className="box-window__panel">
                        <div className="box-window__actions">
                            <input
                                type="text"
                                value={newEntryUrl}
                                placeholder={t('box_window.entry_url_placeholder') || '输入 file:// / http:// / https:// / webdav:// URL'}
                                onChange={(event) => setNewEntryUrl(event.currentTarget.value)}
                            />
                            <button
                                type="button"
                                disabled={!isSupportedBoxUrl(newEntryUrl.trim())}
                                onClick={handleAddEntry}
                            >
                                {t('box_window.add_entry') || '新增条目'}
                            </button>
                        </div>

                        <div className="box-window__entry-list">
                            {session.entries.map((entry, index) => (
                                <article key={entry.entryId} className="box-window__entry">
                                    <div className="box-window__entry-row">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={entry.enabled}
                                                onChange={(event) => {
                                                    boxDocumentService.updateEntry(session.boxId, entry.entryId, {
                                                        enabled: event.currentTarget.checked,
                                                    });
                                                }}
                                            />
                                            {t('box_window.enabled') || '启用'}
                                        </label>
                                        <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => boxDocumentService.moveEntry(session.boxId, entry.entryId, 'up')}
                                        >
                                            {t('box_window.move_up') || '上移'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={index === session.entries.length - 1}
                                            onClick={() => boxDocumentService.moveEntry(session.boxId, entry.entryId, 'down')}
                                        >
                                            {t('box_window.move_down') || '下移'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => boxDocumentService.removeEntry(session.boxId, entry.entryId)}
                                        >
                                            {t('box_window.remove_entry') || '删除'}
                                        </button>
                                    </div>

                                    <div className="box-window__entry-row">
                                        <input
                                            type="text"
                                            value={entry.url}
                                            onChange={(event) => {
                                                boxDocumentService.updateEntry(session.boxId, entry.entryId, {
                                                    url: event.currentTarget.value,
                                                });
                                            }}
                                        />
                                    </div>

                                    <div className="box-window__entry-row">
                                        <input
                                            type="text"
                                            value={entry.snapshot.title ?? ''}
                                            placeholder={t('box_window.entry_title') || '标题'}
                                            onChange={(event) => {
                                                boxDocumentService.updateEntry(session.boxId, entry.entryId, {
                                                    snapshot: {
                                                        ...entry.snapshot,
                                                        title: event.currentTarget.value,
                                                    },
                                                });
                                            }}
                                        />
                                    </div>

                                    <div className="box-window__entry-row">
                                        <input
                                            type="text"
                                            value={entry.snapshot.summary ?? ''}
                                            placeholder={t('box_window.entry_summary') || '摘要'}
                                            onChange={(event) => {
                                                boxDocumentService.updateEntry(session.boxId, entry.entryId, {
                                                    snapshot: {
                                                        ...entry.snapshot,
                                                        summary: event.currentTarget.value,
                                                    },
                                                });
                                            }}
                                        />
                                    </div>

                                    <div className="box-window__entry-row">
                                        <input
                                            type="text"
                                            value={entry.layoutHints?.group ?? ''}
                                            placeholder={t('box_window.entry_group') || '分组'}
                                            onChange={(event) => {
                                                boxDocumentService.updateEntry(session.boxId, entry.entryId, {
                                                    layoutHints: {
                                                        ...entry.layoutHints,
                                                        group: event.currentTarget.value,
                                                    },
                                                });
                                            }}
                                        />
                                        <input
                                            type="number"
                                            value={typeof entry.layoutHints?.priority === 'number' ? entry.layoutHints.priority : ''}
                                            placeholder={t('box_window.entry_priority') || '优先级'}
                                            onChange={(event) => {
                                                const value = event.currentTarget.value.trim();
                                                boxDocumentService.updateEntry(session.boxId, entry.entryId, {
                                                    layoutHints: {
                                                        ...entry.layoutHints,
                                                        priority: value ? Number(value) : undefined,
                                                    },
                                                });
                                            }}
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="box-window__surface">
                        <div>
                            <strong>{t('box_window.layout_editor') || '布局编辑器'}</strong>
                            <div className="box-window__canvas" ref={editorContainerRef} />
                        </div>

                        <div>
                            <strong>{t('box_window.preview') || '实时预览'}</strong>
                            <div className="box-window__canvas" ref={previewContainerRef} />
                        </div>
                    </section>
                </div>
            )}
        </CardWindowBase>
    );
}

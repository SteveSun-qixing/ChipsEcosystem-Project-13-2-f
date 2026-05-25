import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { ChipsInput, ChipsToolbar, type ChipsCommandView } from '@chips/component-library';
import { FileTree } from './FileTree';
import { ContextMenu } from './ContextMenu';
import { workspaceService } from '../../services/workspace-service';
import { DEFAULT_BOX_LAYOUT_TYPE } from '../../services/box-document-service';
import type { WorkspaceFile } from '../../types/workspace';
import { useTranslation } from '../../hooks/useTranslation';
import { CHIPS_DRAG_DATA_TYPE, type WorkspaceFileDragData } from '../CardBoxLibrary/types';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import { useEditingEngineCommands } from '../../commands/EditingEngineCommandProvider';
import {
    EDITING_ENGINE_COMMAND_HANDLER_IDS,
    EDITING_ENGINE_COMMAND_IDS,
    isEditingEngineCommandId,
    type EditingEngineCommandHandlerId,
    type EditingEngineCommandId,
    type EditingEngineCommandStatus,
} from '../../commands/editing-engine-commands';
import './FileManager.css';

interface FileManagerProps {
    workingDirectory?: string;
}

export default function FileManager({ workingDirectory }: FileManagerProps) {
    const { t } = useTranslation();
    const commands = useEditingEngineCommands();

    // State
    const [files, setFiles] = useState<WorkspaceFile[]>([]);
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [renamingPath, setRenamingPath] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

    const searchInputRef = useRef<any>(null);

    // Derived State
    const flattenedFiles = useMemo(() => {
        const result: WorkspaceFile[] = [];
        const flatten = (list: WorkspaceFile[]) => {
            for (const file of list) {
                result.push(file);
                if (file.children) flatten(file.children);
            }
        };
        flatten(files);
        return result;
    }, [files]);

    const selectedFiles = useMemo(() =>
        flattenedFiles.filter(f => selectedPaths.includes(f.path)),
        [flattenedFiles, selectedPaths]
    );

    const isSearching = searchQuery.trim().length > 0;

    const searchResults = useMemo(() => {
        if (!isSearching) return [];
        const query = searchQuery.toLowerCase();
        return flattenedFiles.filter(f => f.name.toLowerCase().includes(query));
    }, [flattenedFiles, searchQuery, isSearching]);

    const displayFiles = isSearching ? searchResults : files;
    const rootPath = workingDirectory || workspaceService.getState().rootPath;
    const selectedFilesRef = useRef<WorkspaceFile[]>([]);
    const workingDirectoryRef = useRef<string | undefined>(workingDirectory);

    useEffect(() => {
        selectedFilesRef.current = selectedFiles;
    }, [selectedFiles]);

    useEffect(() => {
        workingDirectoryRef.current = workingDirectory;
    }, [workingDirectory]);

    // Initialization & Event Listeners
    useEffect(() => {
        const loadFiles = async () => {
            setIsLoading(true);
            if (!workspaceService.isInitialized()) {
                await workspaceService.initialize();
            }
            setFiles([...workspaceService.getFiles()]);
            setIsLoading(false);
        };

        const handleRefresh = () => {
            setFiles([...workspaceService.getFiles()]);
        };

        loadFiles();
        workspaceService.on('workspace:refreshed', handleRefresh);
        workspaceService.on('workspace:initialized', handleRefresh);

        return () => {
            workspaceService.off('workspace:refreshed', handleRefresh);
            workspaceService.off('workspace:initialized', handleRefresh);
        };
    }, []);

    // Handlers
    const handleSelect = (paths: string[]) => {
        setSelectedPaths(paths);
    };

    const handleOpen = useCallback((file: WorkspaceFile) => {
        if (file.type !== 'folder') {
            workspaceService.openFile(file.id);
        }
    }, []);

    const handleContextMenu = (file: WorkspaceFile, event: React.MouseEvent) => {
        event.preventDefault();
        if (!selectedPaths.includes(file.path)) {
            setSelectedPaths([file.path]);
        }
        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
        });
    };

    const handleToggle = (file: WorkspaceFile) => {
        // Toggle expanded state locally in the tree
        const updatedFiles = [...files];
        const toggleNode = (list: WorkspaceFile[]) => {
            for (let i = 0; i < list.length; i++) {
                if (list[i].path === file.path) {
                    list[i] = { ...list[i], expanded: !list[i].expanded };
                    return true;
                }
                if (list[i].children && toggleNode(list[i].children!)) return true;
            }
            return false;
        };
        toggleNode(updatedFiles);
        setFiles(updatedFiles);
    };

    const handleRename = async (file: WorkspaceFile, newName: string) => {
        try {
            await workspaceService.renameFile(file.id, newName);
            setRenamingPath(null);
        } catch (e) {
            console.error('Rename failed:', e);
        }
    };

    const handleDragStart = (file: WorkspaceFile, event: React.DragEvent) => {
        if (!event.dataTransfer || file.type === 'folder') {
            return;
        }

        const dragData: WorkspaceFileDragData = {
            type: 'workspace-file',
            fileId: file.id,
            fileType: file.type,
            filePath: file.path,
            name: file.name,
        };

        event.dataTransfer.setData(CHIPS_DRAG_DATA_TYPE, JSON.stringify(dragData));
        event.dataTransfer.setData('text/plain', file.path);
        event.dataTransfer.effectAllowed = 'copy';
    };

    const toggleSearch = useCallback(() => {
        setIsSearchExpanded((wasExpanded) => {
            if (!wasExpanded) {
                setTimeout(() => searchInputRef.current?.focus(), 0);
                return true;
            }

            setSearchQuery('');
            return false;
        });
    }, []);

    const handleCommandStatus = useCallback(async (status: EditingEngineCommandStatus) => {
        const targetFiles = deserializeWorkspaceFiles(status.payload?.files) ?? selectedFilesRef.current;
        const targetFile = targetFiles[0];
        const parentPath = targetFile?.type === 'folder' ? targetFile.path : workingDirectoryRef.current;

        switch (status.handlerId) {
            case EDITING_ENGINE_COMMAND_HANDLER_IDS.fileNewCard:
                await workspaceService.createCard(
                    t('file.untitled_card') || '无标题卡片',
                    undefined,
                    undefined,
                    parentPath,
                );
                break;
            case EDITING_ENGINE_COMMAND_HANDLER_IDS.fileNewBox:
                await workspaceService.createBox(
                    t('file.untitled_box') || '无标题盒子',
                    DEFAULT_BOX_LAYOUT_TYPE,
                    parentPath,
                );
                break;
            case EDITING_ENGINE_COMMAND_HANDLER_IDS.fileOpen:
                if (targetFile) handleOpen(targetFile);
                break;
            case EDITING_ENGINE_COMMAND_HANDLER_IDS.fileRename:
                if (targetFile) setRenamingPath(targetFile.path);
                break;
            case EDITING_ENGINE_COMMAND_HANDLER_IDS.fileDelete:
                for (const f of targetFiles) {
                    await workspaceService.deleteFile(f.id);
                }
                setSelectedPaths([]);
                break;
            case EDITING_ENGINE_COMMAND_HANDLER_IDS.fileRefresh:
                await workspaceService.refresh();
                break;
            case EDITING_ENGINE_COMMAND_HANDLER_IDS.searchWorkspace:
                toggleSearch();
                break;
        }
    }, [handleOpen, t, toggleSearch]);

    useEffect(() => {
        const handlerIds: EditingEngineCommandHandlerId[] = [
            EDITING_ENGINE_COMMAND_HANDLER_IDS.fileNewCard,
            EDITING_ENGINE_COMMAND_HANDLER_IDS.fileNewBox,
            EDITING_ENGINE_COMMAND_HANDLER_IDS.fileOpen,
            EDITING_ENGINE_COMMAND_HANDLER_IDS.fileRename,
            EDITING_ENGINE_COMMAND_HANDLER_IDS.fileDelete,
            EDITING_ENGINE_COMMAND_HANDLER_IDS.fileRefresh,
            EDITING_ENGINE_COMMAND_HANDLER_IDS.searchWorkspace,
        ];

        const unregisterFns = handlerIds.map((handlerId) => commands.registerHandler(handlerId, handleCommandStatus));
        return () => unregisterFns.forEach((unregister) => unregister());
    }, [commands, handleCommandStatus]);

    const commandPayload = useMemo(() => ({
        files: serializeWorkspaceFiles(selectedFiles),
    }), [selectedFiles]);

    const commandInvocationContext = useMemo(() => ({
        ...commands.invocationContext,
        componentId: 'FileManager',
    }), [commands.invocationContext]);

    const fileCommandViews = useMemo(() => {
        return createFileManagerCommandViews(commands.commandViews, {
            hasSelection: selectedFiles.length > 0,
            isSingleFile: selectedFiles.length === 1,
            hasOpenableSelection: selectedFiles.length === 1 && selectedFiles[0]?.type !== 'folder',
        });
    }, [commands.commandViews, selectedFiles]);

    const invokeFileCommand = useCallback((commandId: EditingEngineCommandId, source: 'toolbar' | 'context-menu') => {
        void commands.invokeCommand(commandId, source, commandPayload, commandInvocationContext);
    }, [commandInvocationContext, commandPayload, commands]);

    return (
        <div className="file-manager">
            {/* Toolbar */}
            <div className="file-manager__toolbar">
                <ChipsToolbar
                    adapter={commands.adapter}
                    commands={fileCommandViews}
                    toolbarId="file-manager"
                    ariaLabel={t('commands.file_manager.toolbar.ariaLabel')}
                    payload={commandPayload}
                    invocationContext={commandInvocationContext}
                />
            </div>

            {/* Search Input Row */}
            {isSearchExpanded && (
                <div className="file-manager__search-row">
                    <ChipsInput
                        ref={searchInputRef}
                        value={searchQuery}
                        className="file-manager__search-input"
                        placeholder={t('file_manager.search_placeholder') || '搜索文件...'}
                        onValueChange={setSearchQuery}
                    />
                    <button
                        type="button"
                        className="file-manager__search-close"
                        onClick={toggleSearch}
                    >
                        <RuntimeIcon icon={ENGINE_ICONS.close} />
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="file-manager__content">
                {isLoading ? (
                    <div className="file-manager__loading">
                        <span className="file-manager__loading-spinner">
                            <RuntimeIcon icon={ENGINE_ICONS.loading} />
                        </span>
                        <span>{t('file_manager.loading') || '加载中...'}</span>
                    </div>
                ) : displayFiles.length === 0 ? (
                    <div className="file-manager__empty">
                        <span className="file-manager__empty-icon">
                            <RuntimeIcon icon={isSearching ? ENGINE_ICONS.search : ENGINE_ICONS.folderOpen} />
                        </span>
                        <span className="file-manager__empty-title">
                            {isSearching ? t('file_manager.search_empty_title') : t('file_manager.empty_title')}
                        </span>
                        {!isSearching && (
                             <span className="file-manager__empty-hint">
                                {t('file_manager.empty_hint_line1')}<br/>
                                {t('file_manager.empty_hint_line2')}
                            </span>
                        )}
                        {isSearching && (
                            <button type="button" onClick={() => setSearchQuery('')}>
                                {t('file_manager.clear_search')}
                            </button>
                        )}
                    </div>
                ) : (
                    <FileTree
                        files={displayFiles}
                        rootPath={rootPath}
                        selectedPaths={selectedPaths}
                        renamingPath={renamingPath}
                        searchQuery={searchQuery}
                        multiSelect={true}
                        onSelect={handleSelect}
                        onOpen={handleOpen}
                        onContextMenu={handleContextMenu}
                        onToggle={handleToggle}
                        onRename={handleRename}
                        onRenameCancel={() => setRenamingPath(null)}
                        onDragStart={handleDragStart}
                    />
                )}
            </div>

            {/* Status Bar */}
            <div className="file-manager__statusbar">
                {isSearching ? (
                    <>
                        <span>{t('file_manager.search_results')}</span>
                        <span className="file-manager__statusbar-count">{searchResults.length}</span>
                    </>
                ) : (
                    <>
                        {selectedPaths.length > 0 ? (
                            <>
                                {t('file_manager.selected_count')}
                                <span className="file-manager__statusbar-count">{selectedPaths.length}</span>
                            </>
                        ) : (
                            <>
                                {t('file_manager.total_items')}
                                <span className="file-manager__statusbar-count">{flattenedFiles.length}</span>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Context Menu */}
            <ContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                commands={fileCommandViews}
                onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                onCommand={(commandId) => {
                    if (isEditingEngineCommandId(commandId)) {
                        invokeFileCommand(commandId, 'context-menu');
                    }
                }}
            />
        </div>
    );
}

function serializeWorkspaceFiles(files: WorkspaceFile[]): Record<string, unknown>[] {
    return files.map((file) => ({
        id: file.id,
        name: file.name,
        path: file.path,
        type: file.type,
        createdAt: file.createdAt,
        modifiedAt: file.modifiedAt,
    }));
}

function deserializeWorkspaceFiles(value: unknown): WorkspaceFile[] | null {
    if (!Array.isArray(value)) {
        return null;
    }

    return value
        .map((item): WorkspaceFile | null => {
            if (!item || typeof item !== 'object') {
                return null;
            }
            const record = item as Record<string, unknown>;
            if (
                typeof record.id !== 'string' ||
                typeof record.name !== 'string' ||
                typeof record.path !== 'string' ||
                (record.type !== 'card' && record.type !== 'box' && record.type !== 'folder')
            ) {
                return null;
            }

            return {
                id: record.id,
                name: record.name,
                path: record.path,
                type: record.type,
                createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
                modifiedAt: typeof record.modifiedAt === 'string' ? record.modifiedAt : '',
            };
        })
        .filter((item): item is WorkspaceFile => item !== null);
}

function createFileManagerCommandViews(
    commandViews: ChipsCommandView[],
    selection: {
        hasSelection: boolean;
        isSingleFile: boolean;
        hasOpenableSelection: boolean;
    },
): ChipsCommandView[] {
    return commandViews.map((command) => {
        if (!isEditingEngineCommandId(command.commandId)) {
            return command;
        }

        let enabled = command.state?.enabled !== false;
        let disabledReasonKey = command.state?.disabledReasonKey;

        if (command.commandId === EDITING_ENGINE_COMMAND_IDS.fileOpen) {
            enabled = enabled && selection.hasOpenableSelection;
            disabledReasonKey = enabled ? undefined : 'commands.file.open.disabled';
        }
        if (command.commandId === EDITING_ENGINE_COMMAND_IDS.fileRename) {
            enabled = enabled && selection.isSingleFile;
            disabledReasonKey = enabled ? undefined : 'commands.file.rename.disabled';
        }
        if (command.commandId === EDITING_ENGINE_COMMAND_IDS.fileDelete) {
            enabled = enabled && selection.hasSelection;
            disabledReasonKey = enabled ? undefined : 'commands.file.delete.disabled';
        }

        const nextState = {
            ...command.state,
            enabled,
            disabledReasonKey,
        };

        return {
            ...command,
            state: nextState,
            diagnostic: {
                ...command.diagnostic,
                enabled,
                disabledReasonKey,
            },
        };
    });
}

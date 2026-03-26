import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChipsInput } from '@chips/component-library';
import { FileTree } from './FileTree';
import { ContextMenu } from './ContextMenu';
import { workspaceService } from '../../services/workspace-service';
import { DEFAULT_BOX_LAYOUT_TYPE } from '../../services/box-document-service';
import type { WorkspaceFile } from '../../types/workspace';
import { useTranslation } from '../../hooks/useTranslation';
import { CHIPS_DRAG_DATA_TYPE, type WorkspaceFileDragData } from '../CardBoxLibrary/types';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import './FileManager.css';

interface FileManagerProps {
    workingDirectory?: string;
}

export default function FileManager({ workingDirectory }: FileManagerProps) {
    const { t } = useTranslation();

    // State
    const [files, setFiles] = useState<WorkspaceFile[]>([]);
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [renamingPath, setRenamingPath] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
    const [hasClipboard, setHasClipboard] = useState(false);

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

    const handleOpen = (file: WorkspaceFile) => {
        if (file.type !== 'folder') {
            workspaceService.openFile(file.id);
        }
    };

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

    const handleContextMenuAction = async (actionId: string, targetFiles: WorkspaceFile[]) => {
        const targetFile = targetFiles[0];
        const parentPath = targetFile?.type === 'folder' ? targetFile.path : workingDirectory;

        switch (actionId) {
            case 'new-card':
                await workspaceService.createCard(t('file.untitled_card') || '无标题卡片', undefined, undefined, parentPath);
                break;
            case 'new-box':
                await workspaceService.createBox(
                    t('file.untitled_box') || '无标题盒子',
                    DEFAULT_BOX_LAYOUT_TYPE,
                    parentPath,
                );
                break;
            case 'open':
                if (targetFile) handleOpen(targetFile);
                break;
            case 'rename':
                if (targetFile) setRenamingPath(targetFile.path);
                break;
            case 'delete':
                for (const f of targetFiles) {
                    await workspaceService.deleteFile(f.id);
                }
                setSelectedPaths([]);
                break;
            case 'refresh':
                await workspaceService.refresh();
                break;
        }
    };

    const toggleSearch = () => {
        setIsSearchExpanded(!isSearchExpanded);
        if (!isSearchExpanded) {
            setTimeout(() => searchInputRef.current?.focus(), 0);
        } else {
            setSearchQuery('');
        }
    };

    return (
        <div className="file-manager">
            {/* Toolbar */}
            <div className="file-manager__toolbar">
                <div className="file-manager__toolbar-left">
                    <button
                        type="button"
                        className="file-manager__btn file-manager__btn--icon"
                        title={t('file_manager.new_card') || '新建卡片'}
                        onClick={() => handleContextMenuAction('new-card', [])}
                    >
                        <RuntimeIcon icon={ENGINE_ICONS.card} />
                    </button>
                    <button
                        type="button"
                        className="file-manager__btn file-manager__btn--icon"
                        title={t('file_manager.new_box') || '新建盒子'}
                        onClick={() => handleContextMenuAction('new-box', [])}
                    >
                        <RuntimeIcon icon={ENGINE_ICONS.box} />
                    </button>
                </div>

                <button
                    type="button"
                    className="file-manager__btn file-manager__btn--icon"
                    title={t('file_manager.search_placeholder') || '搜索'}
                    onClick={toggleSearch}
                >
                    <RuntimeIcon icon={ENGINE_ICONS.search} />
                </button>
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
                selectedFiles={selectedFiles}
                hasClipboard={hasClipboard}
                onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                onAction={handleContextMenuAction}
            />
        </div>
    );
}

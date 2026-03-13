import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChipsButton, ChipsInput } from '@chips/component-library';
import { FileTree } from './FileTree';
import { ContextMenu } from './ContextMenu';
import { workspaceService } from '../../services/workspace-service';
import type { WorkspaceFile } from '../../types/workspace';
import { useTranslation } from '../../hooks/useTranslation';
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
    const [hasClipboard, setHasClipboard] = useState(false); // TODO: Implement clipboard service
    
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

    const handleContextMenuAction = async (actionId: string, targetFiles: WorkspaceFile[]) => {
        const targetFile = targetFiles[0];
        const parentPath = targetFile?.type === 'folder' ? targetFile.path : workingDirectory;

        switch (actionId) {
            case 'new-card':
                await workspaceService.createCard(t('file.untitled_card') || '无标题卡片', undefined, undefined, parentPath);
                break;
            case 'new-box':
                await workspaceService.createBox(t('file.untitled_box') || '无标题盒子', 'grid', parentPath);
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
                    <ChipsButton
                        className="file-manager__btn file-manager__btn--icon"
                        title={t('file_manager.new_card') || '新建卡片'}
                        variant="ghost"
                        onPress={() => handleContextMenuAction('new-card', [])}
                    >
                        🃏
                    </ChipsButton>
                    <ChipsButton
                        className="file-manager__btn file-manager__btn--icon"
                        title={t('file_manager.new_box') || '新建盒子'}
                        variant="ghost"
                        onPress={() => handleContextMenuAction('new-box', [])}
                    >
                        📦
                    </ChipsButton>
                </div>

                <ChipsButton
                    className="file-manager__btn file-manager__btn--icon"
                    title={t('file_manager.search_placeholder') || '搜索'}
                    variant="ghost"
                    onPress={toggleSearch}
                >
                    🔍
                </ChipsButton>
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
                    <ChipsButton
                        className="file-manager__search-close"
                        variant="ghost"
                        onPress={toggleSearch}
                    >
                        ✕
                    </ChipsButton>
                </div>
            )}

            {/* Main Content */}
            <div className="file-manager__content">
                {isLoading ? (
                    <div className="file-manager__loading">
                        <span className="file-manager__loading-spinner">⏳</span>
                        <span>{t('file_manager.loading') || '加载中...'}</span>
                    </div>
                ) : displayFiles.length === 0 ? (
                    <div className="file-manager__empty">
                        <span className="file-manager__empty-icon">{isSearching ? '🔍' : '📂'}</span>
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
                            <ChipsButton variant="ghost" onPress={() => setSearchQuery('')}>
                                {t('file_manager.clear_search')}
                            </ChipsButton>
                        )}
                    </div>
                ) : (
                    <FileTree
                        files={displayFiles}
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
                        onDragStart={(file, e) => console.log('Drag Start', file)}
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

import React, { useState, useMemo, useRef } from 'react';
import { FileItem } from './FileItem';
import type { WorkspaceFile } from '../../types/workspace';
import { useTranslation } from '../../hooks/useTranslation';
import './FileTree.css';

interface FileTreeProps {
    files: WorkspaceFile[];
    selectedPaths: string[];
    renamingPath: string | null;
    searchQuery: string;
    multiSelect?: boolean;
    onSelect: (paths: string[], files: WorkspaceFile[]) => void;
    onOpen: (file: WorkspaceFile) => void;
    onContextMenu: (file: WorkspaceFile, event: React.MouseEvent) => void;
    onToggle: (file: WorkspaceFile) => void;
    onRename: (file: WorkspaceFile, newName: string) => void;
    onRenameCancel: () => void;
    onDragStart: (file: WorkspaceFile, event: React.DragEvent) => void;
}

export function FileTree({
    files,
    selectedPaths,
    renamingPath,
    searchQuery,
    multiSelect = false,
    onSelect,
    onOpen,
    onContextMenu,
    onToggle,
    onRename,
    onRenameCancel,
    onDragStart,
}: FileTreeProps) {
    const { t } = useTranslation();
    const treeRef = useRef<HTMLDivElement>(null);
    const [focusIndex, setFocusIndex] = useState(-1);

    const flattenedFiles = useMemo(() => {
        const result: WorkspaceFile[] = [];
        const flatten = (list: WorkspaceFile[]) => {
            for (const file of list) {
                result.push(file);
                if (file.type === 'folder' && file.expanded && file.children) {
                    flatten(file.children);
                }
            }
        };
        flatten(files);
        return result;
    }, [files]);

    const getFileLevel = (file: WorkspaceFile): number => {
        const parts = file.path.split('/').filter(Boolean);
        return Math.max(0, parts.length - 2);
    };

    const handleFileClick = (file: WorkspaceFile, event: React.MouseEvent) => {
        let newPaths: string[] = [];
        let newFiles: WorkspaceFile[] = [];

        if (multiSelect && (event.ctrlKey || event.metaKey)) {
            const currentPaths = [...selectedPaths];
            const index = currentPaths.indexOf(file.path);
            if (index > -1) {
                currentPaths.splice(index, 1);
            } else {
                currentPaths.push(file.path);
            }
            
            newPaths = currentPaths;
            newFiles = flattenedFiles.filter(f => newPaths.includes(f.path));
        } else if (multiSelect && event.shiftKey && selectedPaths.length > 0) {
            const lastSelected = selectedPaths[selectedPaths.length - 1];
            const lastIndex = flattenedFiles.findIndex((f) => f.path === lastSelected);
            const currentIndex = flattenedFiles.findIndex((f) => f.path === file.path);
            
            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                
                for (let i = start; i <= end; i++) {
                    const f = flattenedFiles[i];
                    newPaths.push(f.path);
                    newFiles.push(f);
                }
            }
        } else {
            newPaths = [file.path];
            newFiles = [file];
        }

        setFocusIndex(flattenedFiles.findIndex((f) => f.path === file.path));
        onSelect(newPaths, newFiles);
    };

    const selectFocusedFile = (index: number) => {
        const file = flattenedFiles[index];
        if (file) {
            onSelect([file.path], [file]);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (renamingPath) return;

        const len = flattenedFiles.length;
        if (len === 0) return;

        switch (event.key) {
            case 'ArrowDown': {
                event.preventDefault();
                const next = Math.min(focusIndex + 1, len - 1);
                setFocusIndex(next);
                selectFocusedFile(next);
                break;
            }
            case 'ArrowUp': {
                event.preventDefault();
                const next = Math.max(focusIndex - 1, 0);
                setFocusIndex(next);
                selectFocusedFile(next);
                break;
            }
            case 'ArrowRight': {
                event.preventDefault();
                const file = flattenedFiles[focusIndex];
                if (file?.type === 'folder' && !file.expanded) {
                    onToggle(file);
                }
                break;
            }
            case 'ArrowLeft': {
                event.preventDefault();
                const file = flattenedFiles[focusIndex];
                if (file?.type === 'folder' && file.expanded) {
                    onToggle(file);
                }
                break;
            }
            case 'Enter': {
                event.preventDefault();
                const file = flattenedFiles[focusIndex];
                if (file) {
                    if (file.type === 'folder') {
                        onToggle(file);
                    } else {
                        onOpen(file);
                    }
                }
                break;
            }
            case 'Home': {
                event.preventDefault();
                setFocusIndex(0);
                selectFocusedFile(0);
                break;
            }
            case 'End': {
                event.preventDefault();
                setFocusIndex(len - 1);
                selectFocusedFile(len - 1);
                break;
            }
        }
    };

    return (
        <div
            ref={treeRef}
            className="file-tree"
            tabIndex={0}
            role="tree"
            onKeyDown={handleKeyDown}
        >
            {files.length > 0 ? (
                flattenedFiles.map((file) => (
                    <FileItem
                        key={file.path}
                        file={file}
                        level={getFileLevel(file)}
                        selected={selectedPaths.includes(file.path)}
                        renaming={renamingPath === file.path}
                        searchQuery={searchQuery}
                        onClick={handleFileClick}
                        onDoubleClick={(f) => f.type === 'folder' ? onToggle(f) : onOpen(f)}
                        onContextMenu={onContextMenu}
                        onToggle={(f) => onToggle(f)}
                        onRename={onRename}
                        onRenameCancel={onRenameCancel}
                        onDragStart={onDragStart}
                    />
                ))
            ) : (
                <div className="file-tree__empty">
                    <span className="file-tree__empty-icon">📁</span>
                    <span className="file-tree__empty-text">{t('file.empty_folder') || '文件夹为空'}</span>
                </div>
            )}
        </div>
    );
}

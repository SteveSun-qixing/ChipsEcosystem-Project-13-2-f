import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { WorkspaceFile } from '../../types/workspace';
import { useTranslation } from '../../hooks/useTranslation';
import './ContextMenu.css';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  children?: MenuItem[];
}

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  selectedFiles?: WorkspaceFile[];
  hasClipboard?: boolean;
  onClose: () => void;
  onAction: (actionId: string, files: WorkspaceFile[]) => void;
}

export function ContextMenu({
  visible,
  x,
  y,
  selectedFiles = [],
  hasClipboard = false,
  onClose,
  onAction,
}: ContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);

  const isSingleFile = selectedFiles.length === 1;
  const hasSelection = selectedFiles.length > 0;

  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [];

    // 新建菜单
    items.push({
      id: 'new',
      label: 'file_manager.menu_new',
      icon: '➕',
      children: [
        { id: 'new-card', label: 'file_manager.new_card', icon: '🃏' },
        { id: 'new-box', label: 'file_manager.new_box', icon: '📦' },
      ],
    });

    items.push({ id: 'divider-1', label: '', divider: true });

    if (hasSelection) {
      items.push({
        id: 'open',
        label: 'file_manager.open',
        icon: '📂',
        shortcut: 'Enter',
        disabled: !isSingleFile,
      });

      items.push({ id: 'divider-2', label: '', divider: true });

      items.push({
        id: 'cut',
        label: 'common.cut',
        icon: '✂️',
        shortcut: '⌘X',
      });

      items.push({
        id: 'copy',
        label: 'common.copy',
        icon: '📋',
        shortcut: '⌘C',
      });
    }

    items.push({
      id: 'paste',
      label: 'common.paste',
      icon: '📥',
      shortcut: '⌘V',
      disabled: !hasClipboard,
    });

    if (hasSelection) {
      items.push({ id: 'divider-3', label: '', divider: true });

      items.push({
        id: 'rename',
        label: 'file_manager.rename',
        icon: '✏️',
        shortcut: 'F2',
        disabled: !isSingleFile,
      });

      items.push({
        id: 'delete',
        label: 'common.delete',
        icon: '🗑️',
        shortcut: 'Del',
      });
    }

    items.push({ id: 'divider-4', label: '', divider: true });

    if (isSingleFile) {
      items.push({
        id: 'reveal',
        label: 'file_manager.reveal_in_finder',
        icon: '🔍',
      });
    }

    items.push({
      id: 'refresh',
      label: 'file_manager.refresh',
      icon: '🔄',
    });

    return items;
  }, [hasSelection, isSingleFile, hasClipboard]);

  useEffect(() => {
    if (visible && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let nextX = x;
      let nextY = y;

      if (nextX + rect.width > viewportWidth) {
        nextX = viewportWidth - rect.width - 10;
      }
      if (nextY + rect.height > viewportHeight) {
        nextY = viewportHeight - rect.height - 10;
      }

      setAdjustedPos({ x: Math.max(10, nextX), y: Math.max(10, nextY) });
      setExpandedSubmenu(null);
    }
  }, [visible, x, y]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (visible) {
      document.addEventListener('mousedown', handleGlobalClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose]);

  const handleItemClick = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.disabled || item.divider) return;
    if (item.children) {
      setExpandedSubmenu(expandedSubmenu === item.id ? null : item.id);
      return;
    }
    onAction(item.id, selectedFiles);
    onClose();
  };

  if (!visible) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
      }}
      role="menu"
    >
      {menuItems.map((item) => (
        <React.Fragment key={item.id}>
          {item.divider ? (
            <div className="context-menu__divider" />
          ) : (
            <div
              className={`context-menu__item ${item.disabled ? 'context-menu__item--disabled' : ''} ${item.children ? 'context-menu__item--has-submenu' : ''} ${expandedSubmenu === item.id ? 'context-menu__item--expanded' : ''}`}
              role="menuitem"
              onMouseEnter={() => setExpandedSubmenu(item.children ? item.id : null)}
              onClick={(e) => handleItemClick(item, e)}
            >
              {item.icon && <span className="context-menu__icon">{item.icon}</span>}
              <span className="context-menu__label">{t(item.label) || item.label}</span>
              {item.shortcut && <span className="context-menu__shortcut">{item.shortcut}</span>}
              {item.children && <span className="context-menu__arrow">▶</span>}

              {item.children && expandedSubmenu === item.id && (
                <div className="context-menu__submenu">
                  {item.children.map((child) => (
                    <div
                      key={child.id}
                      className={`context-menu__item ${child.disabled ? 'context-menu__item--disabled' : ''}`}
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (child.disabled) return;
                        onAction(child.id, selectedFiles);
                        onClose();
                      }}
                    >
                      {child.icon && <span className="context-menu__icon">{child.icon}</span>}
                      <span className="context-menu__label">{t(child.label) || child.label}</span>
                      {child.shortcut && <span className="context-menu__shortcut">{child.shortcut}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>,
    document.body
  );
}

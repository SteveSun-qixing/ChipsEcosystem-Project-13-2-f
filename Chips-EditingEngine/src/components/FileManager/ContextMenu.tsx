import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  resolveCommandMenuGroups,
  type ChipsCommandView,
  type ChipsResolvedCommandView,
} from '@chips/component-library';
import { useTranslation } from '../../hooks/useTranslation';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import './ContextMenu.css';

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  commands: ChipsCommandView[];
  onClose: () => void;
  onCommand: (commandId: string) => void;
}

export function ContextMenu({
  visible,
  x,
  y,
  commands,
  onClose,
  onCommand,
}: ContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  const menuGroups = useMemo(() => resolveCommandMenuGroups(commands, {
    menuId: 'workspace-file',
    i18n: t,
    includeHidden: false,
  }), [commands, t]);

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

  const handleCommandClick = (command: ChipsResolvedCommandView, e: React.MouseEvent) => {
    e.stopPropagation();
    if (command.disabled) {
      return;
    }
    onCommand(command.commandId);
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
      {menuGroups.map((group, groupIndex) => (
        <React.Fragment key={group.groupId}>
          {groupIndex > 0 && <div className="context-menu__divider" />}
          {group.items.map((item) => (
            <div
              key={item.commandId}
              className={`context-menu__item ${item.disabled ? 'context-menu__item--disabled' : ''}`}
              role="menuitem"
              aria-disabled={item.disabled ? 'true' : undefined}
              onClick={(e) => handleCommandClick(item, e)}
            >
              {item.icon && (
                <span className="context-menu__icon">
                  <RuntimeIcon icon={item.icon} />
                </span>
              )}
              <span className="context-menu__label">{item.label}</span>
              {item.shortcutLabel && <span className="context-menu__shortcut">{item.shortcutLabel}</span>}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>,
    document.body
  );
}

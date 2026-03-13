import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { AnyWindowConfig, BaseWindowConfig, Position, Size } from '../../types/window';
import './BaseWindow.css';

export interface BaseWindowProps {
    config: BaseWindowConfig;
    draggable?: boolean;
    resizable?: boolean;
    minWidth?: number;
    minHeight?: number;
    onUpdatePosition?: (position: Position) => void;
    onUpdateSize?: (size: Size) => void;
    onFocus?: () => void;
    onClose?: () => void;
    onMinimize?: () => void;
    onCollapse?: () => void;
    headerSlot?: React.ReactNode;
    actionsSlot?: React.ReactNode;
    children?: React.ReactNode;
}

export function BaseWindow({
    config,
    draggable = true,
    resizable = true,
    minWidth = 200,
    minHeight = 100,
    onUpdatePosition,
    onUpdateSize,
    onFocus,
    onClose,
    onMinimize,
    onCollapse,
    headerSlot,
    actionsSlot,
    children,
}: BaseWindowProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const dragStart = useRef({ x: 0, y: 0 });
    const initialPosition = useRef({ x: 0, y: 0 });

    const resizeStart = useRef({ x: 0, y: 0 });
    const initialSize = useRef({ width: 0, height: 0 });

    const windowStyle = useMemo(() => ({
        transform: `translate(${config.position.x}px, ${config.position.y}px)`,
        width: `${config.size.width}px`,
        height: config.state === 'collapsed' ? 'auto' : `${config.size.height}px`,
        zIndex: config.zIndex,
    }), [config.position, config.size, config.state, config.zIndex]);

    const windowClass = [
        'base-window',
        isDragging ? 'base-window--dragging' : '',
        isResizing ? 'base-window--resizing' : '',
        config.state === 'minimized' ? 'base-window--minimized' : '',
        config.state === 'collapsed' ? 'base-window--collapsed' : '',
        'base-window--focused', // Default focused for styling
    ].filter(Boolean).join(' ');

    const handleDragStart = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.base-window__action')) {
            return;
        }
        if (!draggable) return;

        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialPosition.current = { ...config.position };

        e.preventDefault();
    };

    const handleDragMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStart.current.x;
        const deltaY = e.clientY - dragStart.current.y;

        if (onUpdatePosition) {
            onUpdatePosition({
                x: initialPosition.current.x + deltaX,
                y: initialPosition.current.y + deltaY,
            });
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        } else {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, onUpdatePosition]);

    const handleResizeStart = (e: React.MouseEvent) => {
        if (!resizable) return;
        e.stopPropagation();
        setIsResizing(true);
        resizeStart.current = { x: e.clientX, y: e.clientY };
        initialSize.current = { ...config.size };
        e.preventDefault();
    };

    const handleResizeMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;

        if (onUpdateSize) {
            onUpdateSize({
                width: Math.max(minWidth, initialSize.current.width + deltaX),
                height: Math.max(minHeight, initialSize.current.height + deltaY),
            });
        }
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
    };

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
        } else {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [isResizing, onUpdateSize]);

    return (
        <div
            className={windowClass}
            style={windowStyle}
            onMouseDown={() => onFocus?.()}
        >
            <div className="base-window__header" onMouseDown={handleDragStart}>
                {headerSlot || <span className="base-window__title">{config.title}</span>}

                <div className="base-window__actions">
                    {actionsSlot || (
                        <>
                            {config.minimizable !== false && (
                                <button
                                    type="button"
                                    className="base-window__action"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMinimize?.(); }}
                                >
                                    <span className="base-window__action-icon">−</span>
                                </button>
                            )}
                            <button
                                type="button"
                                className="base-window__action"
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCollapse?.(); }}
                            >
                                <span className="base-window__action-icon">
                                    {config.state === 'collapsed' ? '▽' : '△'}
                                </span>
                            </button>
                            {config.closable !== false && (
                                <button
                                    type="button"
                                    className="base-window__action base-window__action--close"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onClose?.(); }}
                                >
                                    <span className="base-window__action-icon">×</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div
                className="base-window__content"
                style={{ display: config.state === 'collapsed' ? 'none' : 'flex' }}
            >
                {children}
            </div>

            {resizable && config.state === 'normal' && (
                <div
                    className="base-window__resize-handle"
                    onMouseDown={handleResizeStart}
                />
            )}
        </div>
    );
}

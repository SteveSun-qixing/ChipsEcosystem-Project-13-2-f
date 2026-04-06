import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import './SidePanel.css';

export type SidePanelPosition = 'left' | 'right';

export interface SidePanelProps {
    position?: SidePanelPosition;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    expanded?: boolean;
    title?: string;
    resizable?: boolean;
    collapsedWidth?: number;
    headerSlot?: ReactNode;
    children?: ReactNode;
    onWidthChange?: (width: number) => void;
    onExpandedChange?: (expanded: boolean) => void;
}

export function SidePanel({
    position = 'left',
    width = 280,
    minWidth = 180,
    maxWidth = 480,
    expanded = true,
    title = '',
    resizable = true,
    collapsedWidth = 40,
    headerSlot,
    children,
    onWidthChange,
    onExpandedChange,
}: SidePanelProps) {
    const [currentWidth, setCurrentWidth] = useState(width);
    const [isResizing, setIsResizing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(expanded);

    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(0);

    useEffect(() => {
        setCurrentWidth(width);
    }, [width]);

    useEffect(() => {
        setIsExpanded(expanded);
    }, [expanded]);

    const displayWidth = isExpanded ? currentWidth : collapsedWidth;

    const toggleExpand = () => {
        const nextState = !isExpanded;
        setIsExpanded(nextState);
        onExpandedChange?.(nextState);
    };

    const expand = () => {
        if (!isExpanded) {
            setIsExpanded(true);
            onExpandedChange?.(true);
        }
    };

    const setWidth = (w: number) => {
        const clamped = Math.max(minWidth, Math.min(maxWidth, w));
        setCurrentWidth(clamped);
        onWidthChange?.(clamped);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        if (!resizable || !isExpanded) return;
        e.preventDefault();
        setIsResizing(true);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = currentWidth;

        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeStartX.current;
        const newWidth = position === 'left'
            ? resizeStartWidth.current + deltaX
            : resizeStartWidth.current - deltaX;
        setWidth(newWidth);
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeDoubleClick = () => {
        setWidth(width);
    };

    const panelClass = [
        'side-panel',
        `side-panel--${position}`,
        isExpanded ? 'side-panel--expanded' : 'side-panel--collapsed',
        isResizing ? 'side-panel--resizing' : ''
    ].filter(Boolean).join(' ');

    const handleClass = [
        'side-panel__resize-handle',
        `side-panel__resize-handle--${position === 'left' ? 'right' : 'left'}`
    ].join(' ');

    return (
        <aside
            className={panelClass}
            style={{ width: `${displayWidth}px`, '--panel-width': `${displayWidth}px` } as React.CSSProperties}
            role="complementary"
            aria-expanded={isExpanded}
            aria-label={title}
        >
            {(title || headerSlot) && (
                <header className="side-panel__header">
                    {headerSlot || <span className="side-panel__title">{title}</span>}
                    <button
                        type="button"
                        className="side-panel__toggle"
                        onClick={toggleExpand}
                    >
                        <span className="side-panel__toggle-icon">
                            <RuntimeIcon icon={isExpanded
                                ? (position === 'left' ? ENGINE_ICONS.chevronLeft : ENGINE_ICONS.chevronRight)
                                : (position === 'left' ? ENGINE_ICONS.chevronRight : ENGINE_ICONS.chevronLeft)} />
                        </span>
                    </button>
                </header>
            )}

            <div className="side-panel__content" style={{ display: isExpanded ? 'flex' : 'none' }}>
                {children}
            </div>

            {!isExpanded && (
                <div
                    className="side-panel__collapsed-trigger"
                    role="button"
                    tabIndex={0}
                    onClick={expand}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && expand()}
                >
                    <span className="side-panel__collapsed-icon">
                        <RuntimeIcon icon={position === 'left' ? ENGINE_ICONS.chevronRight : ENGINE_ICONS.chevronLeft} />
                    </span>
                </div>
            )}

            {resizable && isExpanded && (
                <div
                    className={handleClass}
                    role="separator"
                    tabIndex={0}
                    onMouseDown={handleResizeStart}
                    onDoubleClick={handleResizeDoubleClick}
                />
            )}
        </aside>
    );
}

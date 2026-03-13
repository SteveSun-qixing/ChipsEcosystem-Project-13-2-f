import React, { useState } from 'react';
import './DockItem.css';

export interface DockItemProps {
    toolId: string;
    icon?: string;
    title: string;
    minimized?: boolean;
    onRestore: (toolId: string) => void;
}

export function DockItem({ toolId, icon, title, minimized = false, onRestore }: DockItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`dock-item ${minimized ? 'dock-item--minimized' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onRestore(toolId)}
        >
            <button
                type="button"
                className="dock-item__btn"
                title="" // We use custom tooltip
                aria-label={title}
            >
                <div className="dock-item__icon-wrapper">
                    <span className="dock-item__icon">{icon || '🛠️'}</span>
                </div>
            </button>

            {/* Tooltip */}
            {isHovered && (
                <div className="dock-item__tooltip">
                    {title}
                </div>
            )}
        </div>
    );
}

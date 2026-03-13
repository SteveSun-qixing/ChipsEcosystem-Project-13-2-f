import React, { useState } from 'react';
import { ChipsButton } from '@chips/component-library';
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
            <ChipsButton
                variant="ghost"
                className="dock-item__btn"
                title="" // We use custom tooltip
                aria-label={title}
            >
                <div className="dock-item__icon-wrapper">
                    <span className="dock-item__icon">{icon || '🛠️'}</span>
                </div>
            </ChipsButton>

            {/* Tooltip */}
            {isHovered && (
                <div className="dock-item__tooltip">
                    {title}
                </div>
            )}
        </div>
    );
}

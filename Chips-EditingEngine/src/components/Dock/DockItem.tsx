import React, { useState } from 'react';
import type { IconDescriptor } from 'chips-sdk';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import './DockItem.css';

export interface DockItemProps {
    toolId: string;
    icon?: IconDescriptor;
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
                    <span className="dock-item__icon">
                        <RuntimeIcon icon={icon} fallbackIcon={ENGINE_ICONS.settings} />
                    </span>
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

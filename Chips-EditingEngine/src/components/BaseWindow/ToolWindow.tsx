import React, { Suspense } from 'react';
import { BaseWindow } from './BaseWindow';
import { useUI } from '../../context/UIContext';
import { ToolComponentRegistry } from '../ToolComponentRegistry';
import type { ToolWindowConfig } from '../../types/window';
import './ToolWindow.css';

interface ToolWindowProps {
    config: ToolWindowConfig;
}

export function ToolWindow({ config }: ToolWindowProps) {
    const { updateWindow, removeWindow, bringToFront } = useUI();

    const handleFocus = () => {
        bringToFront(config.id);
    };

    const handleUpdate = (updates: any) => {
        updateWindow(config.id, updates);
    };

    const handleClose = () => {
        removeWindow(config.id);
    };

    const handleCollapse = () => {
        updateWindow(config.id, {
            state: config.state === 'collapsed' ? 'normal' : 'collapsed'
        });
    };

    const handleMinimize = () => {
        updateWindow(config.id, { state: 'minimized' });
    };

    const ToolComponent = ToolComponentRegistry[config.component];

    return (
        <BaseWindow
            config={config}
            onFocus={handleFocus}
            onUpdatePosition={(pos) => handleUpdate({ position: pos })}
            onUpdateSize={(size) => handleUpdate({ size: size })}
            onClose={handleClose}
            onCollapse={handleCollapse}
            onMinimize={handleMinimize}
            headerSlot={
                <div className="tool-window__header">
                    {config.icon && <span className="tool-window__icon">{config.icon}</span>}
                    <span className="tool-window__title">{config.title}</span>
                </div>
            }
        >
            <div className="tool-window__content">
                <Suspense fallback={<div className="tool-window__loading">加载中...</div>}>
                    {ToolComponent ? <ToolComponent /> : <div>组件 {config.component} 未找到</div>}
                </Suspense>
            </div>
        </BaseWindow>
    );
}

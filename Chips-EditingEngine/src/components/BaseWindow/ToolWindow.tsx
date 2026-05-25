import React, { Suspense } from 'react';
import { BaseWindow } from './BaseWindow';
import { useUI } from '../../context/UIContext';
import { ToolComponentRegistry } from '../ToolComponentRegistry';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import { useTranslation } from '../../hooks/useTranslation';
import type { ToolWindowConfig } from '../../types/window';
import './ToolWindow.css';

interface ToolWindowProps {
    config: ToolWindowConfig;
}

export function ToolWindow({ config }: ToolWindowProps) {
    const { updateWindow, removeWindow, bringToFront } = useUI();
    const { t } = useTranslation();

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
            ariaLabel={t('tool_window.aria_label', { title: config.title })}
            headerSlot={
                <div className="tool-window__header">
                    {config.icon && <RuntimeIcon className="tool-window__icon" icon={config.icon} />}
                    <span className="tool-window__title">{config.title}</span>
                </div>
            }
        >
            <div className="tool-window__content">
                <Suspense fallback={<div className="tool-window__loading" role="status">{t('tool_window.loading')}</div>}>
                    {ToolComponent ? (
                        React.createElement(ToolComponent as any, {
                            visible: true,
                            onClose: handleClose
                        })
                    ) : (
                        <div className="tool-window__missing" role="alert">
                            {t('tool_window.missing_component', { component: config.component })}
                        </div>
                    )}
                </Suspense>
            </div>
        </BaseWindow>
    );
}

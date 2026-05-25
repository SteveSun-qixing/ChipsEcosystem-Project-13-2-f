import React from 'react';
import { DockItem } from './DockItem';
import { useUI } from '../../context/UIContext';
import { useTranslation } from '../../hooks/useTranslation';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { useEditingEngineCommands } from '../../commands/EditingEngineCommandProvider';
import { EDITING_ENGINE_COMMAND_IDS } from '../../commands/editing-engine-commands';
import './Dock.css';

export interface DockProps {
    onOpenSettings?: () => void;
}

export function Dock({ onOpenSettings }: DockProps) {
    const { dockPosition, dockVisible, windows, focusWindow, updateWindow } = useUI();
    const commands = useEditingEngineCommands();
    const { t } = useTranslation();

    const allTools = windows.filter(w => w.type === 'tool');

    const handleToolClick = (toolId: string) => {
        const tool = windows.find(w => w.id === toolId);
        if (!tool) return;
        if (tool.state === 'minimized') {
            updateWindow(toolId, { state: 'normal' });
        }
        focusWindow(toolId);
    };

    const isMinimized = (toolId: string) => {
        const tool = windows.find(w => w.id === toolId);
        return tool?.state === 'minimized';
    };

    const handleOpenSettings = () => {
        void commands.invokeCommand(EDITING_ENGINE_COMMAND_IDS.settingsOpen, 'toolbar')
            .catch(() => onOpenSettings?.());
    };

    if (!dockVisible) return null;

    return (
        <div
            className={`dock dock--${dockPosition}`}
            role="toolbar"
            aria-label={t('dock.aria_label')}
            data-chips-surface="dock"
        >
            {allTools.map((tool) => (
                <DockItem
                    key={tool.id}
                    toolId={tool.id}
                    icon={tool.icon}
                    title={tool.title}
                    minimized={isMinimized(tool.id)}
                    onRestore={handleToolClick}
                />
            ))}

            {allTools.length > 0 && <div className="dock__divider" role="separator" aria-orientation={dockPosition === 'bottom' ? 'vertical' : 'horizontal'} />}

            <DockItem
                toolId="__engine-settings__"
                icon={ENGINE_ICONS.settings}
                title={t('engine_settings.title')}
                minimized={false}
                onRestore={handleOpenSettings}
            />
        </div>
    );
}

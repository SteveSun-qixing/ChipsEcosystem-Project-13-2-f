import React, { ReactNode } from 'react';
import { useUI } from '../../context/UIContext';
import { ToolWindow } from '../../components/BaseWindow/ToolWindow';
import { Dock } from '../../components/Dock/Dock';
import './WindowLayer.css';

interface WindowLayerProps {
    onOpenSettings?: () => void;
    children?: ReactNode;
}

export function WindowLayer({ onOpenSettings }: WindowLayerProps) {
    const { windows } = useUI();

    // Filter windows to render in this layer (non-minimized tool windows)
    const visibleToolWindows = windows.filter(
        w => w.type === 'tool' && w.state !== 'minimized'
    );

    return (
        <div className="window-layer">
            {/* Tool Windows */}
            {visibleToolWindows.map((window) => (
                <ToolWindow key={window.id} config={window as any} />
            ))}

            {/* Program Dock */}
            <Dock onOpenSettings={onOpenSettings || (() => {})} />
        </div>
    );
}

import React, { ReactNode } from 'react';
import { CardWindow } from '../../components/CardWindow/CardWindow';
import { BoxWindow } from '../../components/BoxWindow/BoxWindow';
import { useUI } from '../../context/UIContext';
import type { BoxWindowConfig, CardWindowConfig } from '../../types/window';
import './DesktopLayer.css';

interface DesktopLayerProps {
    style?: React.CSSProperties;
    children?: ReactNode;
}

export function DesktopLayer({ style, children }: DesktopLayerProps) {
    const { windows, updateWindow, removeWindow, bringToFront } = useUI();

    const visibleCardWindows = windows
        .filter((window): window is CardWindowConfig => window.type === 'card' && window.state !== 'minimized')
        .sort((left, right) => left.zIndex - right.zIndex);
    const visibleBoxWindows = windows
        .filter((window): window is BoxWindowConfig => window.type === 'box' && window.state !== 'minimized')
        .sort((left, right) => left.zIndex - right.zIndex);

    return (
        <div className="desktop-layer" style={style}>
            {children}
            {visibleCardWindows.map((window) => (
                <CardWindow
                    key={window.id}
                    config={window}
                    onUpdateConfig={(updates) => updateWindow(window.id, updates)}
                    onClose={() => removeWindow(window.id)}
                    onFocus={() => bringToFront(window.id)}
                />
            ))}
            {visibleBoxWindows.map((window) => (
                <BoxWindow
                    key={window.id}
                    config={window}
                    onUpdateConfig={(updates) => updateWindow(window.id, updates)}
                    onClose={() => removeWindow(window.id)}
                    onFocus={() => bringToFront(window.id)}
                />
            ))}
        </div>
    );
}

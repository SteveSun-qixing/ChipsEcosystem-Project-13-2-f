import React, { ReactNode } from 'react';
import './DesktopLayer.css';

interface DesktopLayerProps {
    style?: React.CSSProperties;
    children?: ReactNode;
}

export function DesktopLayer({ style, children }: DesktopLayerProps) {
    return (
        <div className="desktop-layer" style={style}>
            {children}
        </div>
    );
}

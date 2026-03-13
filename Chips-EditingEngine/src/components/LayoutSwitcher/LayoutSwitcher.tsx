import React, { useCallback } from 'react';
import { useLayoutSwitch } from '../../hooks/use-layout-switch';
import { useTranslation } from '../../hooks/useTranslation';
import type { LayoutType } from '../../types/editor';

interface LayoutSwitcherProps {
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
    disabled?: boolean;
    onBeforeSwitch?: (from: LayoutType, to: LayoutType) => void;
    onAfterSwitch?: (from: LayoutType, to: LayoutType) => void;
}

export function LayoutSwitcher({
    size = 'medium',
    showLabel = true,
    disabled = false,
    onBeforeSwitch,
    onAfterSwitch,
}: LayoutSwitcherProps) {
    const { t } = useTranslation();
    const {
        currentLayout,
        isSwitching,
        isInfiniteCanvas,
        isWorkbench,
        toggleLayout,
    } = useLayoutSwitch({
        enableTransition: true,
        transitionDuration: 300,
        preserveCardState: true,
        onBeforeSwitch,
        onAfterSwitch,
    });

    const handleClick = useCallback(async () => {
        if (disabled || isSwitching) return;
        await toggleLayout();
    }, [disabled, isSwitching, toggleLayout]);

    const currentIcon = isInfiniteCanvas ? '🎨' : '📋';
    const currentLabel = isInfiniteCanvas 
        ? t('layout_switcher.canvas') 
        : t('layout_switcher.workbench');
    const targetLabel = isInfiniteCanvas 
        ? t('layout_switcher.to_workbench') 
        : t('layout_switcher.to_canvas');

    const sizeClass = `layout-switcher__button--${size}`;
    const switchingClass = isSwitching ? 'layout-switcher__button--switching' : '';

    return (
        <div className="layout-switcher">
            <button
                type="button"
                className={`layout-switcher__button ${sizeClass} ${switchingClass}`}
                onClick={handleClick}
                disabled={disabled || isSwitching}
                title={targetLabel}
            >
                <span className="layout-switcher__icon">{currentIcon}</span>
                {showLabel && (
                    <span className="layout-switcher__label">{currentLabel}</span>
                )}
            </button>
        </div>
    );
}

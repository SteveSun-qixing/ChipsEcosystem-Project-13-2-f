import React from 'react';
import { ChipsButton } from '@chips/component-library';
import { useEditor } from '../../context/EditorContext';
import { useUI } from '../../context/UIContext';
import { useTranslation } from '../../hooks/useTranslation';
import './HeaderBar.css';

export function HeaderBar() {
    const { currentLayout, setLayout, state } = useEditor();
    const { theme, setTheme } = useUI();
    const { t } = useTranslation();

    const isReady = state === 'ready';

    const handleToggleLayout = () => {
        setLayout(currentLayout === 'infinite-canvas' ? 'workbench' : 'infinite-canvas');
    };

    const handleToggleTheme = () => {
        setTheme(theme.includes('dark') ? 'chips-official.default-theme' : 'chips-official.dark-theme');
    };

    return (
        <div className="header-bar">
            <div className="header-bar__left">
                <div className="header-bar__logo">🍟</div>
                <div className="header-bar__title">Chips Editing Engine</div>
                <div className={`header-bar__status ${isReady ? 'header-bar__status--ready' : ''}`}>
                    {isReady ? t('header_bar.status.ready') : t('header_bar.status.loading')}
                </div>
            </div>

            <div className="header-bar__center">
                {/* 工具栏预留位 */}
            </div>

            <div className="header-bar__right">
                <ChipsButton
                    className="header-bar__action"
                    onPress={handleToggleLayout}
                    aria-label={t('header_bar.toggle_layout')}
                >
                    {currentLayout === 'infinite-canvas' ? '📝' : '♾️'}
                </ChipsButton>
                <ChipsButton
                    className="header-bar__action"
                    onPress={handleToggleTheme}
                    aria-label={t('header_bar.toggle_theme')}
                >
                    {theme.includes('dark') ? '☀️' : '🌙'}
                </ChipsButton>
            </div>
        </div>
    );
}

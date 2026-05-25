import React from 'react';
import {
    ChipsCommandPalette,
    ChipsMenuBar,
    ChipsToolbar,
} from '@chips/component-library';
import { useEditor } from '../../context/EditorContext';
import { useTranslation } from '../../hooks/useTranslation';
import { AppBrandIcon } from '../../icons/AppBrandIcon';
import { useEditingEngineCommands } from '../../commands/EditingEngineCommandProvider';
import { isApplicationChromeCommand } from '../../commands/editing-engine-commands';
import './HeaderBar.css';

export function HeaderBar() {
    const { state } = useEditor();
    const commands = useEditingEngineCommands();
    const { t } = useTranslation();

    const isReady = state === 'ready';

    const menuDescriptors = React.useMemo(() => [
        { menuId: 'file', label: t('commands.menu.file') },
        { menuId: 'edit', label: t('commands.menu.edit') },
        { menuId: 'view', label: t('commands.menu.view') },
        { menuId: 'app', label: t('commands.menu.app') },
    ], [t]);
    const chromeCommandViews = React.useMemo(
        () => commands.commandViews.filter(isApplicationChromeCommand),
        [commands.commandViews],
    );

    return (
        <div className="header-bar">
            <div className="header-bar__left">
                <div className="header-bar__logo">
                    <AppBrandIcon className="header-bar__logo-image" aria-hidden="true" />
                </div>
                <div className="header-bar__title">Chips Editing Engine</div>
                <div className={`header-bar__status ${isReady ? 'header-bar__status--ready' : ''}`}>
                    {isReady ? t('header_bar.status.ready') : t('header_bar.status.loading')}
                </div>
            </div>

            <div className="header-bar__center">
                <ChipsMenuBar
                    adapter={commands.adapter}
                    commands={chromeCommandViews}
                    menus={menuDescriptors}
                    ariaLabel={t('commands.menu.ariaLabel')}
                    invocationContext={commands.invocationContext}
                />
                <ChipsToolbar
                    adapter={commands.adapter}
                    commands={chromeCommandViews}
                    toolbarId="workspace"
                    ariaLabel={t('commands.toolbar.ariaLabel')}
                    invocationContext={commands.invocationContext}
                />
            </div>

            <div className="header-bar__right">
                <ChipsCommandPalette
                    className="header-bar__palette"
                    adapter={commands.adapter}
                    commands={chromeCommandViews}
                    defaultOpen={false}
                    ariaLabel={t('commands.palette.ariaLabel')}
                    inputPlaceholder={t('commands.palette.searchPlaceholder')}
                    invocationContext={commands.invocationContext}
                />
            </div>
        </div>
    );
}

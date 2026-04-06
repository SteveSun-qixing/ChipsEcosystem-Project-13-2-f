import React from 'react';
import type { IconDescriptor } from 'chips-sdk';
import { ENGINE_ICONS } from '../../icons/descriptors';
import { RuntimeIcon } from '../../icons/RuntimeIcon';
import './MainArea.css';

export interface TabInfo {
    id: string;
    title: string;
    modified?: boolean;
    closable?: boolean;
    icon?: IconDescriptor;
}

export interface MainAreaProps {
    activeTabId?: string | null;
    tabs?: TabInfo[];
    showTabs?: boolean;
    emptyText?: string;
    emptyIcon?: IconDescriptor;
    onTabChange?: (tabId: string) => void;
    onTabClose?: (tabId: string) => void;
    tabContentRenderer?: (tab: TabInfo) => React.ReactNode;
    emptyActionsSlot?: React.ReactNode;
}

export function MainArea({
    activeTabId,
    tabs = [],
    showTabs = true,
    emptyText = '无已打开的卡片',
    emptyIcon = ENGINE_ICONS.document,
    onTabChange,
    onTabClose,
    tabContentRenderer,
    emptyActionsSlot,
}: MainAreaProps) {
    const hasTabs = tabs.length > 0;

    const handleTabMiddleClick = (e: React.MouseEvent, tabId: string) => {
        if (e.button === 1) {
            e.preventDefault();
            onTabClose?.(tabId);
        }
    };

    const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
    };

    return (
        <main className="main-area">
            {showTabs && hasTabs && (
                <div className="main-area__tabs" role="tablist">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            className={`main-area__tab ${activeTabId === tab.id ? 'main-area__tab--active' : ''} ${tab.modified ? 'main-area__tab--modified' : ''}`}
                            role="tab"
                            aria-selected={activeTabId === tab.id}
                            tabIndex={activeTabId === tab.id ? 0 : -1}
                            onClick={() => onTabChange?.(tab.id)}
                            onMouseDown={e => handleTabMiddleClick(e, tab.id)}
                            onContextMenu={e => handleTabContextMenu(e, tab.id)}
                        >
                            {tab.icon && (
                                <span className="main-area__tab-icon">
                                    <RuntimeIcon icon={tab.icon} />
                                </span>
                            )}
                            <span className="main-area__tab-title">{tab.title}</span>
                            {tab.modified && <span className="main-area__tab-indicator">●</span>}
                            {tab.closable && (
                                <button
                                    type="button"
                                    className="main-area__tab-close"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        onTabClose?.(tab.id);
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="main-area__content">
                {hasTabs ? (
                    tabs.map(tab => (
                        <div
                            key={tab.id}
                            className="main-area__panel"
                            role="tabpanel"
                            style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
                            aria-hidden={activeTabId !== tab.id}
                        >
                            {tabContentRenderer ? tabContentRenderer(tab) : (
                                <div className="main-area__card-preview">
                                    <p>卡片预览: {tab.title}</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="main-area__empty">
                        <span className="main-area__empty-icon">
                            <RuntimeIcon icon={emptyIcon} />
                        </span>
                        <p className="main-area__empty-text">{emptyText}</p>
                        {emptyActionsSlot}
                    </div>
                )}
            </div>
        </main>
    );
}

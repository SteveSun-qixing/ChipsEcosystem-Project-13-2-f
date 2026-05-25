import React, { useState, useEffect } from 'react';
import { SidePanel } from './SidePanel';
import { MainArea, type TabInfo } from './MainArea';
import { useTranslation } from '../../hooks/useTranslation';
import './Workbench.css';

export interface WorkbenchLayoutConfig {
    leftPanelWidth?: number;
    rightPanelWidth?: number;
    leftPanelExpanded?: boolean;
    rightPanelExpanded?: boolean;
    showLeftPanel?: boolean;
    showRightPanel?: boolean;
}

export interface WorkbenchProps {
    initialConfig?: WorkbenchLayoutConfig;
    onLayoutChange?: (config: WorkbenchLayoutConfig) => void;
    activeTabId?: string | null;
    tabs?: TabInfo[];
    onTabChange?: (tabId: string) => void;
    onTabClose?: (tabId: string) => void;
    leftPanelContent?: React.ReactNode;
    rightPanelContent?: React.ReactNode;
    tabContentRenderer?: (tab: TabInfo) => React.ReactNode;
    emptyActionsSlot?: React.ReactNode;
}

export function Workbench({
    initialConfig = {},
    onLayoutChange,
    activeTabId,
    tabs = [],
    onTabChange,
    onTabClose,
    leftPanelContent,
    rightPanelContent,
    tabContentRenderer,
    emptyActionsSlot,
}: WorkbenchProps) {
    const { t } = useTranslation();
    const [config, setConfig] = useState<WorkbenchLayoutConfig>({
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        leftPanelExpanded: true,
        rightPanelExpanded: true,
        showLeftPanel: true,
        showRightPanel: true,
        ...initialConfig,
    });

    const {
        leftPanelWidth = 280,
        rightPanelWidth = 320,
        leftPanelExpanded = true,
        rightPanelExpanded = true,
        showLeftPanel = true,
        showRightPanel = true,
    } = config;

    const updateConfig = (updates: Partial<WorkbenchLayoutConfig>) => {
        const nextConfig = { ...config, ...updates };
        setConfig(nextConfig);
        onLayoutChange?.(nextConfig);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                updateConfig({ leftPanelExpanded: !leftPanelExpanded });
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                updateConfig({ rightPanelExpanded: !rightPanelExpanded });
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [config, leftPanelExpanded, rightPanelExpanded]);

    const workbenchStyle = {
        '--left-panel-width': `${leftPanelExpanded ? leftPanelWidth : 40}px`,
        '--right-panel-width': `${rightPanelExpanded ? rightPanelWidth : 40}px`,
    } as React.CSSProperties;

    return (
        <div
            className="workbench"
            style={workbenchStyle}
            role="group"
            aria-label={t('workbench.aria_label')}
            data-chips-surface="workbench"
        >
            {showLeftPanel && (
                <SidePanel
                    position="left"
                    width={leftPanelWidth}
                    expanded={leftPanelExpanded}
                    minWidth={180}
                    maxWidth={480}
                    title={t('workbench.left_panel_title')}
                    toggleLabel={leftPanelExpanded
                        ? t('workbench.left_panel_collapse')
                        : t('workbench.left_panel_expand')}
                    collapsedLabel={t('workbench.left_panel_expand')}
                    resizeLabel={t('workbench.left_panel_resize')}
                    onWidthChange={(w) => updateConfig({ leftPanelWidth: w })}
                    onExpandedChange={(exp) => updateConfig({ leftPanelExpanded: exp })}
                >
                    {leftPanelContent || (
                        <div className="workbench__placeholder" role="status">
                            {t('workbench.left_panel_empty')}
                        </div>
                    )}
                </SidePanel>
            )}

            <MainArea
                activeTabId={activeTabId}
                tabs={tabs}
                showTabs={true}
                ariaLabel={t('workbench.main_area_label')}
                tabListLabel={t('workbench.tabs_label')}
                emptyText={t('workbench.empty_text')}
                modifiedLabel={t('workbench.tab_modified')}
                closeTabLabel={(title) => t('workbench.close_tab', { title })}
                previewFallbackLabel={(title) => t('workbench.preview_fallback', { title })}
                onTabChange={onTabChange}
                onTabClose={onTabClose}
                tabContentRenderer={tabContentRenderer}
                emptyActionsSlot={emptyActionsSlot}
            />

            {showRightPanel && (
                <SidePanel
                    position="right"
                    width={rightPanelWidth}
                    expanded={rightPanelExpanded}
                    minWidth={200}
                    maxWidth={500}
                    title={t('workbench.right_panel_title')}
                    toggleLabel={rightPanelExpanded
                        ? t('workbench.right_panel_collapse')
                        : t('workbench.right_panel_expand')}
                    collapsedLabel={t('workbench.right_panel_expand')}
                    resizeLabel={t('workbench.right_panel_resize')}
                    onWidthChange={(w) => updateConfig({ rightPanelWidth: w })}
                    onExpandedChange={(exp) => updateConfig({ rightPanelExpanded: exp })}
                >
                    {rightPanelContent || (
                        <div className="workbench__placeholder" role="status">
                            {t('workbench.right_panel_empty')}
                        </div>
                    )}
                </SidePanel>
            )}
        </div>
    );
}

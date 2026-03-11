import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChipsButton, ChipsCardShell, ChipsEmptyState } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { DropZone } from "../../shared/ui/DropZone";
import { NotificationStack } from "../../shared/ui/NotificationStack";
import { PageFrame } from "../../shared/ui/PageFrame";
import { SearchField } from "../../shared/ui/SearchField";
import { SectionStateBoundary } from "../../shared/ui/SectionStateBoundary";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { useAppPluginGovernance } from "./useAppPluginGovernance";
export function AppPluginsPage() {
    const { t } = useI18n();
    const { plugins, loading, error, activeActionId, searchTerm, setSearchTerm, installWithFilePicker, installFromDroppedFiles, togglePluginEnabled, uninstallPlugin, refresh, feedback, dropActive, setDropActive, } = useAppPluginGovernance();
    return (_jsxs(PageFrame, { title: t("settingsPanel.appPlugins.title"), subtitle: t("settingsPanel.appPlugins.subtitle"), actions: _jsx(ChipsButton, { onPress: installWithFilePicker, children: t("settingsPanel.appPlugins.actions.install") }), children: [_jsx(NotificationStack, { ariaLabel: t("settingsPanel.feedback.ariaLabel"), items: feedback }), _jsx("div", { className: "control-bar", children: _jsx(SearchField, { value: searchTerm, placeholder: t("settingsPanel.appPlugins.searchPlaceholder"), onChange: setSearchTerm }) }), _jsx("div", { onDragEnter: () => setDropActive(true), onDragLeave: () => setDropActive(false), children: _jsx(DropZone, { title: t("settingsPanel.appPlugins.dropzone.title"), description: t("settingsPanel.appPlugins.dropzone.description"), active: dropActive, onDropFiles: installFromDroppedFiles }) }), _jsx(SectionStateBoundary, { loading: loading, error: error, loadingLabel: t("settingsPanel.appPlugins.loading"), onRetry: () => {
                    void refresh();
                }, children: plugins.length === 0 ? (_jsx(ChipsEmptyState, { ariaLabel: t("settingsPanel.appPlugins.empty.ariaLabel"), title: t("settingsPanel.appPlugins.empty.title"), description: t("settingsPanel.appPlugins.empty.description"), actionLabel: t("settingsPanel.appPlugins.actions.install"), onAction: installWithFilePicker })) : (_jsx("div", { className: "card-grid", children: plugins.map((plugin) => {
                        const busy = activeActionId === plugin.pluginId;
                        return (_jsxs(ChipsCardShell, { title: plugin.name, toolbar: plugin.enabled ? (_jsx(StatusBadge, { tone: "positive", label: t("settingsPanel.appPlugins.badges.enabled") })) : (_jsx(StatusBadge, { tone: "neutral", label: t("settingsPanel.appPlugins.badges.disabled") })), footer: _jsxs("div", { className: "action-row", children: [_jsx(ChipsButton, { disabled: busy, onPress: () => void togglePluginEnabled(plugin), children: plugin.enabled
                                            ? t("settingsPanel.appPlugins.actions.disable")
                                            : t("settingsPanel.appPlugins.actions.enable") }), _jsx(ChipsButton, { disabled: busy, onPress: () => void uninstallPlugin(plugin), children: t("settingsPanel.appPlugins.actions.uninstall") })] }), children: [_jsx("p", { className: "card-description", children: plugin.description ?? t("settingsPanel.common.notAvailable") }), _jsxs("dl", { className: "meta-list", children: [_jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.appPlugins.fields.pluginId") }), _jsx("dd", { children: plugin.pluginId })] }), _jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.appPlugins.fields.version") }), _jsx("dd", { children: plugin.version })] }), _jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.appPlugins.fields.capabilities") }), _jsx("dd", { children: plugin.capabilities.length > 0
                                                        ? plugin.capabilities.join(", ")
                                                        : t("settingsPanel.common.notAvailable") })] }), _jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.appPlugins.fields.installPath") }), _jsx("dd", { children: plugin.installPath })] })] })] }, plugin.pluginId));
                    }) })) })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChipsButton, ChipsCardShell, ChipsEmptyState } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { DropZone } from "../../shared/ui/DropZone";
import { NotificationStack } from "../../shared/ui/NotificationStack";
import { PageFrame } from "../../shared/ui/PageFrame";
import { SearchField } from "../../shared/ui/SearchField";
import { SectionStateBoundary } from "../../shared/ui/SectionStateBoundary";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { useThemeGovernance } from "./useThemeGovernance";
export function ThemePage() {
    const { t } = useI18n();
    const { themes, loading, error, searchTerm, setSearchTerm, activeActionId, installWithFilePicker, installFromDroppedFiles, applyTheme, uninstallTheme, refresh, feedback, dropActive, setDropActive, } = useThemeGovernance();
    return (_jsxs(PageFrame, { title: t("settingsPanel.themes.title"), subtitle: t("settingsPanel.themes.subtitle"), actions: _jsx(ChipsButton, { onPress: installWithFilePicker, children: t("settingsPanel.themes.actions.install") }), children: [_jsx(NotificationStack, { ariaLabel: t("settingsPanel.feedback.ariaLabel"), items: feedback }), _jsx("div", { className: "control-bar", children: _jsx(SearchField, { value: searchTerm, placeholder: t("settingsPanel.themes.searchPlaceholder"), onChange: setSearchTerm }) }), _jsx("div", { onDragEnter: () => setDropActive(true), onDragLeave: () => setDropActive(false), children: _jsx(DropZone, { title: t("settingsPanel.themes.dropzone.title"), description: t("settingsPanel.themes.dropzone.description"), active: dropActive, onDropFiles: installFromDroppedFiles }) }), _jsx(SectionStateBoundary, { loading: loading, error: error, loadingLabel: t("settingsPanel.themes.loading"), onRetry: () => {
                    void refresh();
                }, children: themes.length === 0 ? (_jsx(ChipsEmptyState, { ariaLabel: t("settingsPanel.themes.empty.ariaLabel"), title: t("settingsPanel.themes.empty.title"), description: t("settingsPanel.themes.empty.description"), actionLabel: t("settingsPanel.themes.actions.install"), onAction: installWithFilePicker })) : (_jsx("div", { className: "card-grid", children: themes.map((theme) => {
                        const busy = activeActionId === theme.pluginId;
                        return (_jsx(ChipsCardShell, { title: theme.displayName, toolbar: _jsxs("div", { className: "action-row action-row--tight", children: [theme.current ? (_jsx(StatusBadge, { tone: "positive", label: t("settingsPanel.themes.badges.current") })) : null, theme.enabled && !theme.current ? (_jsx(StatusBadge, { tone: "attention", label: t("settingsPanel.themes.badges.enabled") })) : null, theme.isDefault ? (_jsx(StatusBadge, { tone: "neutral", label: t("settingsPanel.themes.badges.default") })) : null] }), footer: _jsxs("div", { className: "action-row", children: [_jsx(ChipsButton, { disabled: busy || theme.current, onPress: () => void applyTheme(theme), children: t("settingsPanel.themes.actions.apply") }), _jsx(ChipsButton, { disabled: busy, onPress: () => void uninstallTheme(theme), children: t("settingsPanel.themes.actions.uninstall") })] }), children: _jsxs("dl", { className: "meta-list", children: [_jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.themes.fields.themeId") }), _jsx("dd", { children: theme.themeId })] }), _jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.themes.fields.version") }), _jsx("dd", { children: theme.version })] }), _jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.themes.fields.publisher") }), _jsx("dd", { children: theme.publisher ?? t("settingsPanel.common.notAvailable") })] }), _jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.themes.fields.installPath") }), _jsx("dd", { children: theme.installPath })] })] }) }, theme.pluginId));
                    }) })) })] }));
}

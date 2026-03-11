import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { ChipsThemeProvider } from "@chips/component-library";
import { appConfig } from "../../config/app-config";
import { I18nProvider, useI18n } from "./providers/I18nProvider";
import { RuntimeProvider, useRuntimeContext } from "./providers/RuntimeProvider";
import { MENU_REGISTRY } from "./menu-registry";
import { NotificationStack } from "../shared/ui/NotificationStack";
import { StatusBadge } from "../shared/ui/StatusBadge";
function AppShell() {
    const { t } = useI18n();
    const { currentLocale, currentTheme, eventSource, ready, runtimeError, refreshRuntimeState } = useRuntimeContext();
    const [activeMenuId, setActiveMenuId] = React.useState("themes");
    const activeEntry = React.useMemo(() => {
        return MENU_REGISTRY.find((entry) => entry.id === activeMenuId) ?? MENU_REGISTRY[0];
    }, [activeMenuId]);
    const feedbackItems = React.useMemo(() => {
        if (!runtimeError) {
            return [];
        }
        return [
            {
                id: runtimeError.code,
                tone: "error",
                title: t("settingsPanel.feedback.runtimeErrorTitle"),
                message: runtimeError.message,
                durationMs: 0,
            },
        ];
    }, [runtimeError, t]);
    return (_jsx(ChipsThemeProvider, { themeId: currentTheme?.themeId ?? "chips-official.default-theme", version: currentTheme?.version ?? "0.1.0", eventSource: eventSource, eventName: "theme.changed", children: _jsxs("div", { className: "settings-app-shell", children: [_jsxs("aside", { className: "settings-sidebar", children: [_jsxs("div", { className: "settings-sidebar__brand settings-drag-region", children: [_jsx("div", { className: "settings-sidebar__eyebrow", children: t("settingsPanel.app.eyebrow") }), _jsx("h1", { className: "settings-sidebar__title", children: t("settingsPanel.app.title") }), _jsx("p", { className: "settings-sidebar__subtitle", children: t("settingsPanel.app.subtitle") })] }), _jsxs("div", { className: "settings-sidebar__runtime", children: [_jsxs("div", { className: "settings-sidebar__runtime-row", children: [_jsx("span", { children: t("settingsPanel.app.currentTheme") }), _jsx(StatusBadge, { tone: "positive", label: currentTheme?.displayName ?? t("settingsPanel.common.notAvailable") })] }), _jsxs("div", { className: "settings-sidebar__runtime-row", children: [_jsx("span", { children: t("settingsPanel.app.currentLocale") }), _jsx(StatusBadge, { tone: "neutral", label: currentLocale })] })] }), _jsx("nav", { className: "settings-sidebar__nav", "aria-label": t("settingsPanel.menu.ariaLabel"), children: MENU_REGISTRY.map((entry) => (_jsxs("button", { type: "button", className: `settings-menu-item${entry.id === activeEntry.id ? " settings-menu-item--active" : ""}`, onClick: () => setActiveMenuId(entry.id), "data-no-drag": "true", children: [_jsx("span", { className: "settings-menu-item__title", children: t(entry.titleKey) }), _jsx("span", { className: "settings-menu-item__summary", children: t(entry.summaryKey) })] }, entry.id))) })] }), _jsxs("main", { className: "settings-content settings-no-drag", children: [_jsx(NotificationStack, { ariaLabel: t("settingsPanel.feedback.ariaLabel"), items: feedbackItems }), !ready ? (_jsx("div", { className: "settings-content__loading", children: t("settingsPanel.app.loading") })) : (activeEntry.render()), runtimeError ? (_jsx("div", { className: "settings-content__footer-action", children: _jsx("button", { type: "button", className: "text-button", onClick: () => void refreshRuntimeState(), children: t("settingsPanel.app.retry") }) })) : null] })] }) }));
}
export function App() {
    return (_jsx(RuntimeProvider, { children: _jsx(I18nProvider, { children: _jsx(AppShell, {}) }) }));
}
export const APP_ID = appConfig.appId;

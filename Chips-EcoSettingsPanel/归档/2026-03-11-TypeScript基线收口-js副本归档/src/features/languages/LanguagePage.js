import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChipsButton, ChipsCardShell, ChipsEmptyState } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { NotificationStack } from "../../shared/ui/NotificationStack";
import { PageFrame } from "../../shared/ui/PageFrame";
import { SectionStateBoundary } from "../../shared/ui/SectionStateBoundary";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { useLanguageGovernance } from "./useLanguageGovernance";
export function LanguagePage() {
    const { t } = useI18n();
    const { languages, loading, error, activeLocale, switchLocale, refresh, feedback } = useLanguageGovernance();
    return (_jsxs(PageFrame, { title: t("settingsPanel.languages.title"), subtitle: t("settingsPanel.languages.subtitle"), children: [_jsx(NotificationStack, { ariaLabel: t("settingsPanel.feedback.ariaLabel"), items: feedback }), _jsx(SectionStateBoundary, { loading: loading, error: error, loadingLabel: t("settingsPanel.languages.loading"), onRetry: () => {
                    void refresh();
                }, children: languages.length === 0 ? (_jsx(ChipsEmptyState, { ariaLabel: t("settingsPanel.languages.empty.ariaLabel"), title: t("settingsPanel.languages.empty.title"), description: t("settingsPanel.languages.empty.description") })) : (_jsx("div", { className: "card-grid card-grid--compact", children: languages.map((language) => {
                        const busy = activeLocale === language.locale;
                        return (_jsx(ChipsCardShell, { title: language.displayName, toolbar: language.current ? _jsx(StatusBadge, { tone: "positive", label: t("settingsPanel.languages.badges.current") }) : null, footer: _jsx("div", { className: "action-row", children: _jsx(ChipsButton, { disabled: busy || language.current, onPress: () => void switchLocale(language.locale), children: t("settingsPanel.languages.actions.apply") }) }), children: _jsxs("dl", { className: "meta-list", children: [_jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.languages.fields.locale") }), _jsx("dd", { children: language.locale })] }), _jsxs("div", { children: [_jsx("dt", { children: t("settingsPanel.languages.fields.nativeName") }), _jsx("dd", { children: language.nativeName })] })] }) }, language.locale));
                    }) })) })] }));
}

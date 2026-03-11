import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChipsCardShell, ChipsTabs } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { useRuntimeContext } from "../../app/providers/RuntimeProvider";
import { PageFrame } from "../../shared/ui/PageFrame";
import { COMPONENT_GROUPS } from "./registry";
export function ComponentGalleryPage() {
    const { t } = useI18n();
    const { currentTheme } = useRuntimeContext();
    return (_jsxs(PageFrame, { title: t("settingsPanel.gallery.title"), subtitle: t("settingsPanel.gallery.subtitle", {
            theme: currentTheme?.displayName ?? t("settingsPanel.common.notAvailable"),
        }), children: [_jsx("div", { className: "gallery-header-note", children: t("settingsPanel.gallery.description") }), _jsx(ChipsTabs, { items: COMPONENT_GROUPS.map((group) => ({
                    value: group.id,
                    label: t(group.titleKey),
                    content: (_jsx("div", { className: "gallery-grid", children: group.items.map((item) => {
                            const Preview = item.preview;
                            return (_jsx(ChipsCardShell, { title: item.name, toolbar: _jsx("span", { className: "gallery-scope-tag", children: item.scope }), footer: _jsx("div", { className: "gallery-parts", children: item.parts.join(" · ") }), children: _jsx(Preview, {}) }, item.name));
                        }) })),
                })) })] }));
}

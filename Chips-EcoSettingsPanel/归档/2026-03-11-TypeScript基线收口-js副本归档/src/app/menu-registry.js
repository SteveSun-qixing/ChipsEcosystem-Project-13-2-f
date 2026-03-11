import { jsx as _jsx } from "react/jsx-runtime";
import { AppPluginsPage } from "../features/app-plugins/AppPluginsPage";
import { ComponentGalleryPage } from "../features/component-gallery/ComponentGalleryPage";
import { LanguagePage } from "../features/languages/LanguagePage";
import { ThemePage } from "../features/themes/ThemePage";
const MENU_ENTRIES = [
    {
        id: "themes",
        titleKey: "settingsPanel.menu.themes.title",
        summaryKey: "settingsPanel.menu.themes.summary",
        order: 10,
        render: () => _jsx(ThemePage, {}),
    },
    {
        id: "languages",
        titleKey: "settingsPanel.menu.languages.title",
        summaryKey: "settingsPanel.menu.languages.summary",
        order: 20,
        render: () => _jsx(LanguagePage, {}),
    },
    {
        id: "app-plugins",
        titleKey: "settingsPanel.menu.appPlugins.title",
        summaryKey: "settingsPanel.menu.appPlugins.summary",
        order: 30,
        render: () => _jsx(AppPluginsPage, {}),
    },
    {
        id: "component-gallery",
        titleKey: "settingsPanel.menu.gallery.title",
        summaryKey: "settingsPanel.menu.gallery.summary",
        order: 40,
        render: () => _jsx(ComponentGalleryPage, {}),
    },
];
export const MENU_REGISTRY = MENU_ENTRIES.sort((left, right) => left.order - right.order);

import type { ReactElement } from "react";
import { AppPluginsPage } from "../features/app-plugins/AppPluginsPage";
import { ComponentGalleryPage } from "../features/component-gallery/ComponentGalleryPage";
import { LanguagePage } from "../features/languages/LanguagePage";
import { ThemePage } from "../features/themes/ThemePage";

export type MenuId = "themes" | "languages" | "app-plugins" | "component-gallery";

export interface MenuRegistration {
  id: MenuId;
  titleKey: string;
  summaryKey: string;
  order: number;
  render: () => ReactElement;
}

const MENU_ENTRIES: MenuRegistration[] = [
  {
    id: "themes",
    titleKey: "settingsPanel.menu.themes.title",
    summaryKey: "settingsPanel.menu.themes.summary",
    order: 10,
    render: () => <ThemePage />,
  },
  {
    id: "languages",
    titleKey: "settingsPanel.menu.languages.title",
    summaryKey: "settingsPanel.menu.languages.summary",
    order: 20,
    render: () => <LanguagePage />,
  },
  {
    id: "app-plugins",
    titleKey: "settingsPanel.menu.appPlugins.title",
    summaryKey: "settingsPanel.menu.appPlugins.summary",
    order: 30,
    render: () => <AppPluginsPage />,
  },
  {
    id: "component-gallery",
    titleKey: "settingsPanel.menu.gallery.title",
    summaryKey: "settingsPanel.menu.gallery.summary",
    order: 40,
    render: () => <ComponentGalleryPage />,
  },
];

export const MENU_REGISTRY: MenuRegistration[] = MENU_ENTRIES.sort((left, right) => left.order - right.order);

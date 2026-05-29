import type { ReactElement } from "react";
import { AppPluginsPage } from "../features/app-plugins/AppPluginsPage";
import { ComponentGalleryPage } from "../features/component-gallery/ComponentGalleryPage";
import { LanguagePage } from "../features/languages/LanguagePage";
import { PreviewQualityPage } from "../features/preview-quality/PreviewQualityPage";
import { CardPluginsPage } from "../features/runtime-plugins/CardPluginsPage";
import { LayoutPluginsPage } from "../features/runtime-plugins/LayoutPluginsPage";
import { ModulePluginsPage } from "../features/runtime-plugins/ModulePluginsPage";
import { ThemeDiagnosticsPage } from "../features/theme-diagnostics/ThemeDiagnosticsPage";
import { ThemePage } from "../features/themes/ThemePage";

export type MenuId =
  | "themes"
  | "theme-diagnostics"
  | "languages"
  | "app-plugins"
  | "card-plugins"
  | "layout-plugins"
  | "module-plugins"
  | "component-gallery"
  | "preview-quality";

export interface MenuRegistration {
  id: MenuId;
  titleKey: string;
  summaryKey: string;
  categoryKey: string;
  order: number;
  render: () => ReactElement;
}

const MENU_ENTRIES: MenuRegistration[] = [
  {
    id: "themes",
    titleKey: "settingsPanel.menu.themes.title",
    summaryKey: "settingsPanel.menu.themes.summary",
    categoryKey: "settingsPanel.menu.categories.personalization",
    order: 10,
    render: () => <ThemePage />,
  },
  {
    id: "languages",
    titleKey: "settingsPanel.menu.languages.title",
    summaryKey: "settingsPanel.menu.languages.summary",
    categoryKey: "settingsPanel.menu.categories.personalization",
    order: 30,
    render: () => <LanguagePage />,
  },
  {
    id: "app-plugins",
    titleKey: "settingsPanel.menu.appPlugins.title",
    summaryKey: "settingsPanel.menu.appPlugins.summary",
    categoryKey: "settingsPanel.menu.categories.plugins",
    order: 40,
    render: () => <AppPluginsPage />,
  },
  {
    id: "card-plugins",
    titleKey: "settingsPanel.menu.cardPlugins.title",
    summaryKey: "settingsPanel.menu.cardPlugins.summary",
    categoryKey: "settingsPanel.menu.categories.plugins",
    order: 50,
    render: () => <CardPluginsPage />,
  },
  {
    id: "layout-plugins",
    titleKey: "settingsPanel.menu.layoutPlugins.title",
    summaryKey: "settingsPanel.menu.layoutPlugins.summary",
    categoryKey: "settingsPanel.menu.categories.plugins",
    order: 60,
    render: () => <LayoutPluginsPage />,
  },
  {
    id: "module-plugins",
    titleKey: "settingsPanel.menu.modulePlugins.title",
    summaryKey: "settingsPanel.menu.modulePlugins.summary",
    categoryKey: "settingsPanel.menu.categories.plugins",
    order: 70,
    render: () => <ModulePluginsPage />,
  },
  {
    id: "theme-diagnostics",
    titleKey: "settingsPanel.menu.themeDiagnostics.title",
    summaryKey: "settingsPanel.menu.themeDiagnostics.summary",
    categoryKey: "settingsPanel.menu.categories.developer",
    order: 80,
    render: () => <ThemeDiagnosticsPage />,
  },
  {
    id: "component-gallery",
    titleKey: "settingsPanel.menu.gallery.title",
    summaryKey: "settingsPanel.menu.gallery.summary",
    categoryKey: "settingsPanel.menu.categories.developer",
    order: 90,
    render: () => <ComponentGalleryPage />,
  },
  {
    id: "preview-quality",
    titleKey: "settingsPanel.menu.previewQuality.title",
    summaryKey: "settingsPanel.menu.previewQuality.summary",
    categoryKey: "settingsPanel.menu.categories.developer",
    order: 100,
    render: () => <PreviewQualityPage />,
  },
];

export const MENU_REGISTRY: MenuRegistration[] = MENU_ENTRIES.sort((left, right) => left.order - right.order);

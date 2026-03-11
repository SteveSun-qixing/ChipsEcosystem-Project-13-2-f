import React from "react";
import { ChipsSelect, ChipsThemeProvider } from "@chips/component-library";
import { appConfig } from "../../config/app-config";
import { I18nProvider, useI18n } from "./providers/I18nProvider";
import { RuntimeProvider, useRuntimeContext } from "./providers/RuntimeProvider";
import { MENU_REGISTRY, type MenuId } from "./menu-registry";
import { NotificationStack } from "../shared/ui/NotificationStack";

function AppShell(): React.ReactElement {
  const { t } = useI18n();
  const { currentTheme, eventSource, ready, runtimeError, refreshRuntimeState } = useRuntimeContext();
  const [activeMenuId, setActiveMenuId] = React.useState<MenuId>("themes");

  const activeEntry = React.useMemo(() => {
    return MENU_REGISTRY.find((entry) => entry.id === activeMenuId) ?? MENU_REGISTRY[0];
  }, [activeMenuId]);

  const mobileMenuOptions = React.useMemo(() => {
    return MENU_REGISTRY.map((entry) => ({
      value: entry.id,
      label: t(entry.titleKey),
    }));
  }, [t]);

  const feedbackItems = React.useMemo(() => {
    if (!runtimeError) {
      return [];
    }
    return [
      {
        id: runtimeError.code,
        tone: "error" as const,
        title: t("settingsPanel.feedback.runtimeErrorTitle"),
        message: runtimeError.message,
        durationMs: 0,
      },
    ];
  }, [runtimeError, t]);

  return (
    <ChipsThemeProvider
      themeId={currentTheme?.themeId ?? "chips-official.default-theme"}
      version={currentTheme?.version ?? "0.1.0"}
      eventSource={eventSource}
      eventName="theme.changed"
    >
      <div className="settings-app-shell">
        <aside className="settings-sidebar">
          <div className="settings-sidebar__brand">
            <div className="settings-sidebar__eyebrow">{t("settingsPanel.app.eyebrow")}</div>
            <h1 className="settings-sidebar__title">{t("settingsPanel.app.title")}</h1>
            <p className="settings-sidebar__subtitle">{t("settingsPanel.app.subtitle")}</p>
          </div>
          <nav className="settings-sidebar__nav" aria-label={t("settingsPanel.menu.ariaLabel")}>
            {MENU_REGISTRY.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`settings-menu-item${entry.id === activeEntry.id ? " settings-menu-item--active" : ""}`}
                onClick={() => setActiveMenuId(entry.id)}
              >
                <span className="settings-menu-item__title">{t(entry.titleKey)}</span>
                <span className="settings-menu-item__summary">{t(entry.summaryKey)}</span>
              </button>
            ))}
          </nav>
        </aside>
        <main className="settings-content">
          <div className="settings-mobile-nav">
            <div className="settings-mobile-nav__label">{t("settingsPanel.menu.mobileLabel")}</div>
            <ChipsSelect
              value={activeEntry.id}
              ariaLabel={t("settingsPanel.menu.mobileAriaLabel")}
              options={mobileMenuOptions}
              onValueChange={(nextValue) => setActiveMenuId(nextValue as MenuId)}
            />
            <p className="settings-mobile-nav__summary">{t(activeEntry.summaryKey)}</p>
          </div>
          <NotificationStack ariaLabel={t("settingsPanel.feedback.ariaLabel")} items={feedbackItems} />
          {!ready ? (
            <div className="settings-content__loading">{t("settingsPanel.app.loading")}</div>
          ) : (
            activeEntry.render()
          )}
          {runtimeError ? (
            <div className="settings-content__footer-action">
              <button type="button" className="text-button" onClick={() => void refreshRuntimeState()}>
                {t("settingsPanel.app.retry")}
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </ChipsThemeProvider>
  );
}

export function App(): React.ReactElement {
  return (
    <RuntimeProvider>
      <I18nProvider>
        <AppShell />
      </I18nProvider>
    </RuntimeProvider>
  );
}

export const APP_ID = appConfig.appId;

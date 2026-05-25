import React from "react";
import {
  ChipsCommandPalette,
  ChipsCommandProvider,
  ChipsMenuBar,
  ChipsSelect,
  ChipsToolbar,
} from "@chips/component-library";
import { useI18n } from "./providers/I18nProvider";
import { NotificationStack } from "../shared/ui/NotificationStack";
import { sceneDefinitions, type SettingsSceneId } from "./scene-registry";
import { useAppRuntime } from "./AppRuntimeProvider";
import { settingsCommandViews } from "../commands/settings-commands";
import { useSettingsCommands } from "../commands/useSettingsCommands";

export function AppShell(): React.ReactElement {
  const { t } = useI18n();
  const runtime = useAppRuntime();
  const { activeScene, activeSceneId, currentTheme, ready, runtimeError, setActiveSceneId, refreshRuntimeState } = runtime;
  const commands = useSettingsCommands(runtime.client);
  const handledInvocationRef = React.useRef<string | null>(null);

  const mobileSceneOptions = React.useMemo(() => {
    return sceneDefinitions.map((scene) => ({
      value: scene.id,
      label: t(scene.titleKey),
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

  const menuDescriptors = React.useMemo(() => [
    { menuId: "settings", label: t("settingsPanel.commands.menu.settings") },
  ], [t]);

  React.useEffect(() => {
    if (!commands.lastInvoked) {
      return;
    }

    const invocationKey = commands.lastInvoked.invocationId ?? `${commands.lastInvoked.commandId}:${commands.lastInvoked.source}`;
    if (handledInvocationRef.current === invocationKey) {
      return;
    }
    handledInvocationRef.current = invocationKey;
    setActiveSceneId(commands.lastInvoked.sceneId);
  }, [commands.lastInvoked, setActiveSceneId]);

  const invokeSceneCommand = React.useCallback((sceneId: SettingsSceneId) => {
    const command = settingsCommandViews.find((item) => item.handlerId === `open-scene:${sceneId}`);
    if (command) {
      void commands.invokeCommand(command.commandId, "toolbar");
      return;
    }
    setActiveSceneId(sceneId);
  }, [commands, setActiveSceneId]);

  return (
    <ChipsCommandProvider adapter={commands.adapter} commands={settingsCommandViews} i18n={t}>
      <div className="settings-app-shell" data-app-id={runtime.environment.appId} data-scene-id={activeSceneId}>
        <aside className="settings-sidebar">
          <div className="settings-sidebar__brand">
            <div className="settings-sidebar__eyebrow">{t("settingsPanel.app.eyebrow")}</div>
            <h1 className="settings-sidebar__title">{t("settingsPanel.app.title")}</h1>
            <p className="settings-sidebar__subtitle">{t("settingsPanel.app.subtitle")}</p>
          </div>
          <nav className="settings-sidebar__nav" aria-label={t("settingsPanel.menu.ariaLabel")}>
            {sceneDefinitions.map((scene) => (
              <button
                key={scene.id}
                type="button"
                className={`settings-menu-item${scene.id === activeSceneId ? " settings-menu-item--active" : ""}`}
                onClick={() => invokeSceneCommand(scene.id)}
              >
                <span className="settings-menu-item__title">{t(scene.titleKey)}</span>
                <span className="settings-menu-item__summary">{t(scene.summaryKey)}</span>
              </button>
            ))}
          </nav>
        </aside>
        <main className="settings-content" data-theme-id={currentTheme?.themeId}>
          <div className="settings-command-row">
            <ChipsMenuBar
              adapter={commands.adapter}
              commands={settingsCommandViews}
              menus={menuDescriptors}
              ariaLabel={t("settingsPanel.commands.menu.ariaLabel")}
            />
            <ChipsToolbar
              adapter={commands.adapter}
              commands={settingsCommandViews}
              toolbarId="settings"
              ariaLabel={t("settingsPanel.commands.toolbar.ariaLabel")}
            />
            <ChipsCommandPalette
              adapter={commands.adapter}
              commands={settingsCommandViews}
              ariaLabel={t("settingsPanel.commands.palette.ariaLabel")}
              inputPlaceholder={t("settingsPanel.commands.palette.searchPlaceholder")}
            />
          </div>
          <div className="settings-mobile-nav">
            <div className="settings-mobile-nav__label">{t("settingsPanel.menu.mobileLabel")}</div>
            <ChipsSelect
              value={activeScene.id}
              aria-label={t("settingsPanel.menu.mobileAriaLabel")}
              options={mobileSceneOptions}
              onValueChange={(nextValue) => invokeSceneCommand(nextValue as SettingsSceneId)}
            />
            <p className="settings-mobile-nav__summary">{t(activeScene.summaryKey)}</p>
          </div>
          <NotificationStack ariaLabel={t("settingsPanel.feedback.ariaLabel")} items={feedbackItems} />
          {!ready ? (
            <div className="settings-content__loading">{t("settingsPanel.app.loading")}</div>
          ) : (
            activeScene.render()
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
    </ChipsCommandProvider>
  );
}

import React from "react";
import {
  ChipsBox,
  ChipsButton,
  ChipsCommandProvider,
  ChipsIcon,
  ChipsLoadingBoundary,
  ChipsNavigationSplitView,
  ChipsSearchField,
  ChipsSelect,
  ChipsStack,
  ChipsText,
} from "@chips/component-library";
import { useI18n } from "./providers/I18nProvider";
import { NotificationStack } from "../shared/ui/NotificationStack";
import { sceneDefinitions, type SettingsSceneId } from "./scene-registry";
import { useAppRuntime } from "./AppRuntimeProvider";
import { settingsCommandViews } from "../commands/settings-commands";
import { useSettingsCommands } from "../commands/useSettingsCommands";
import { SETTINGS_SCENE_ICONS } from "./settings-scene-icons";

export function AppShell(): React.ReactElement {
  const { t } = useI18n();
  const runtime = useAppRuntime();
  const { activeScene, activeSceneId, currentTheme, ready, runtimeError, setActiveSceneId, refreshRuntimeState } = runtime;
  const commands = useSettingsCommands(runtime.client);
  const handledInvocationRef = React.useRef<string | null>(null);
  const [navQuery, setNavQuery] = React.useState("");

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

  const navGroups = React.useMemo<Array<{ key: string; scenes: typeof sceneDefinitions }>>(() => {
    const normalizedQuery = navQuery.trim().toLocaleLowerCase();
    const groups: Array<{ key: string; scenes: typeof sceneDefinitions }> = [];

    sceneDefinitions.forEach((scene) => {
      const title = t(scene.titleKey);
      const summary = t(scene.summaryKey);
      const category = t(scene.categoryKey);
      const searchable = `${title} ${summary} ${category}`.toLocaleLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) {
        return;
      }

      const existing = groups.find((group) => group.key === scene.categoryKey);
      if (existing) {
        existing.scenes.push(scene);
        return;
      }
      groups.push({ key: scene.categoryKey, scenes: [scene] });
    });

    return groups;
  }, [navQuery, t]);

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
      void commands.invokeCommand(command.commandId, "api");
      return;
    }
    setActiveSceneId(sceneId);
  }, [commands, setActiveSceneId]);

  return (
    <ChipsCommandProvider adapter={commands.adapter} commands={settingsCommandViews} i18n={t}>
      <ChipsNavigationSplitView.Root
        className="settings-app-shell"
        ariaLabel={t("settingsPanel.app.title")}
        data-app-id={runtime.environment.appId}
        data-scene-id={activeSceneId}
      >
        <ChipsNavigationSplitView.Sidebar
          className="settings-shell__sidebar"
          ariaLabel={t("settingsPanel.menu.ariaLabel")}
        >
          <ChipsStack className="settings-sidebar-inner" gap="var(--chips-layout-gap-md, 16px)" align="stretch">
            <ChipsStack className="settings-brand" gap="var(--chips-layout-gap-xs, 6px)" align="stretch">
              <ChipsText className="settings-brand__title" as="strong" text={t("settingsPanel.app.title")} emphasis="strong" />
              <ChipsText className="settings-brand__subtitle" as="p" text={t("settingsPanel.app.subtitle")} tone="muted" />
            </ChipsStack>
            <div className="settings-nav-search">
              <ChipsSearchField
                value={navQuery}
                ariaLabel={t("settingsPanel.menu.searchAriaLabel")}
                placeholder={t("settingsPanel.menu.searchPlaceholder")}
                clearLabel={t("settingsPanel.menu.searchClear")}
                onValueChange={setNavQuery}
              />
            </div>
            <nav className="settings-nav-list" aria-label={t("settingsPanel.menu.ariaLabel")}>
              {navGroups.map((group) => (
                <div className="settings-nav-group" key={group.key}>
                  <ChipsText className="settings-nav-group__label" as="span" text={t(group.key)} tone="muted" />
                  <div className="settings-nav-group__items">
                    {group.scenes.map((scene) => {
                      const sceneIcon = SETTINGS_SCENE_ICONS[scene.id];
                      return (
                        <ChipsButton
                          key={scene.id}
                          toggleable
                          pressed={scene.id === activeSceneId}
                          onPress={() => invokeSceneCommand(scene.id)}
                        >
                          <span className="settings-nav-icon" aria-hidden="true">
                            <ChipsIcon descriptor={{ name: sceneIcon.name, style: "rounded", decorative: true, fill: 1 }} size={18} />
                          </span>
                          <span className="settings-nav-label">
                            <ChipsText as="span" text={t(scene.titleKey)} emphasis="strong" />
                            <ChipsText as="span" text={t(scene.summaryKey)} tone="muted" />
                          </span>
                        </ChipsButton>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </ChipsStack>
        </ChipsNavigationSplitView.Sidebar>
        <ChipsNavigationSplitView.Detail
          as="main"
          className="settings-shell__detail"
          ariaLabel={t(activeScene.titleKey)}
          data-theme-id={currentTheme?.themeId}
        >
          <ChipsStack className="settings-shell__content" gap="var(--chips-layout-gap-md, 18px)" align="stretch">
            <ChipsBox className="settings-mobile-nav" padding="var(--chips-layout-gap-md, 16px)" radius="var(--chips-sys-radius-container, 14px)">
              <ChipsText className="settings-mobile-nav__label" as="span" text={t("settingsPanel.menu.mobileLabel")} tone="muted" />
              <ChipsSelect
                value={activeScene.id}
                aria-label={t("settingsPanel.menu.mobileAriaLabel")}
                options={mobileSceneOptions}
                onValueChange={(nextValue) => invokeSceneCommand(nextValue as SettingsSceneId)}
              />
              <ChipsText className="settings-mobile-nav__summary" as="p" text={t(activeScene.summaryKey)} tone="muted" />
            </ChipsBox>
            <NotificationStack
              ariaLabel={t("settingsPanel.feedback.ariaLabel")}
              closeButtonLabel={t("settingsPanel.common.close")}
              items={feedbackItems}
            />
            {!ready ? (
              <ChipsLoadingBoundary
                loading
                delayMs={0}
                loadingText={t("settingsPanel.app.loading")}
                ariaLabel={t("settingsPanel.app.loading")}
              />
            ) : (
              activeScene.render()
            )}
            {runtimeError ? (
              <div className="settings-shell__footer-action">
                <ChipsButton onPress={() => void refreshRuntimeState()}>
                  {t("settingsPanel.app.retry")}
                </ChipsButton>
              </div>
            ) : null}
          </ChipsStack>
        </ChipsNavigationSplitView.Detail>
      </ChipsNavigationSplitView.Root>
    </ChipsCommandProvider>
  );
}

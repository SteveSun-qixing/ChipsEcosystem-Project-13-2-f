import React from "react";
import {
  ChipsBox,
  ChipsButton,
  ChipsCommandPalette,
  ChipsCommandProvider,
  ChipsGrid,
  ChipsLoadingBoundary,
  ChipsMenuBar,
  ChipsNavigationSplitView,
  ChipsSelect,
  ChipsStack,
  ChipsText,
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
          <ChipsStack gap="var(--chips-layout-gap-lg, 24px)" align="stretch">
            <ChipsStack className="settings-brand" gap="var(--chips-layout-gap-sm, 10px)" align="stretch">
              <ChipsText className="settings-brand__eyebrow" as="span" text={t("settingsPanel.app.eyebrow")} tone="muted" />
              <ChipsText className="settings-brand__title" as="strong" text={t("settingsPanel.app.title")} emphasis="strong" />
              <ChipsText className="settings-brand__subtitle" as="p" text={t("settingsPanel.app.subtitle")} tone="muted" />
            </ChipsStack>
            <ChipsStack
              className="settings-nav-list"
              as="nav"
              gap="var(--chips-layout-gap-sm, 10px)"
              aria-label={t("settingsPanel.menu.ariaLabel")}
              align="stretch"
            >
              {sceneDefinitions.map((scene) => (
                <ChipsButton
                  key={scene.id}
                  toggleable
                  pressed={scene.id === activeSceneId}
                  onPress={() => invokeSceneCommand(scene.id)}
                >
                  <span className="settings-nav-label">
                    <ChipsText as="span" text={t(scene.titleKey)} emphasis="strong" />
                    <ChipsText as="span" text={t(scene.summaryKey)} tone="muted" />
                  </span>
                </ChipsButton>
              ))}
            </ChipsStack>
          </ChipsStack>
        </ChipsNavigationSplitView.Sidebar>
        <ChipsNavigationSplitView.Detail
          as="main"
          className="settings-shell__detail"
          ariaLabel={t(activeScene.titleKey)}
          data-theme-id={currentTheme?.themeId}
        >
          <ChipsStack className="settings-shell__content" gap="var(--chips-layout-gap-md, 18px)" align="stretch">
          <ChipsGrid className="settings-command-row" minItemSize="220px" gap="var(--chips-layout-gap-sm, 12px)">
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
          </ChipsGrid>
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
          <NotificationStack ariaLabel={t("settingsPanel.feedback.ariaLabel")} items={feedbackItems} />
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

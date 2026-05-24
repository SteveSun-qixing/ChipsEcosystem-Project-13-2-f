import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChipsBadge,
  ChipsButton,
  ChipsCommandPalette,
  ChipsCommandProvider,
  ChipsErrorBoundary,
  ChipsLoadingBoundary,
  ChipsMenuBar,
  ChipsNavigationSplitView,
  ChipsScrollView,
  ChipsStack,
  ChipsText,
  ChipsToolbar,
  useChipsDiagnostics,
  useChipsI18n,
  useChipsPermission,
  useChipsSurface,
  useChipsTheme,
} from "@chips/component-library";
import type { CommandSource } from "chips-sdk";
import { appConfig } from "../../config/app-config";
import {
  APP_COMMAND_HANDLER_IDS,
  APP_COMMAND_IDS,
  appCommandDefinitions,
  appCommandViews,
} from "../commands/app-commands";
import { useAppCommands } from "../commands/useAppCommands";
import { useAppText } from "../i18n/useAppText";
import { MainScene } from "../scenes/MainScene";
import { SettingsScene } from "../scenes/SettingsScene";
import { getSceneDefinition, type AppSceneId } from "./scene-registry";

function nextLocale(locale: string) {
  return locale === "zh-CN" ? "en-US" : "zh-CN";
}

export function AppShell() {
  const [activeSceneId, setActiveSceneId] = useState<AppSceneId>(
    getSceneDefinition(appConfig.defaultSceneId).id,
  );
  const handledInvocationRef = useRef<string | null>(null);
  const { locale, text } = useAppText();
  const i18n = useChipsI18n();
  const theme = useChipsTheme();
  const surface = useChipsSurface();
  const permission = useChipsPermission();
  const diagnostics = useChipsDiagnostics();
  const commands = useAppCommands();
  const activeScene = getSceneDefinition(activeSceneId);
  const commandStatusKey = `app.commands.status.${commands.phase}`;
  const menuDescriptors = useMemo(
    () => [{ menuId: "app", label: text("app.commands.menu.app") }],
    [text],
  );
  const canInvokeCommand = permission.hasPermission("command.invoke");

  useEffect(() => {
    if (!commands.lastInvoked) {
      return;
    }

    const invocationKey =
      commands.lastInvoked.invocationId ??
      `${commands.lastInvoked.commandId}:${commands.lastInvoked.source}`;
    if (handledInvocationRef.current === invocationKey) {
      return;
    }
    handledInvocationRef.current = invocationKey;

    if (commands.lastInvoked.handlerId === APP_COMMAND_HANDLER_IDS.openWorkspace) {
      setActiveSceneId("main");
    }
    if (commands.lastInvoked.handlerId === APP_COMMAND_HANDLER_IDS.refreshTheme) {
      void theme.refresh();
    }
  }, [commands.lastInvoked, theme]);

  function handleLanguageSwitch() {
    void i18n.setLocale(nextLocale(locale));
  }

  function invokeCommand(commandId: string, source: CommandSource) {
    void commands.invokeCommand(commandId, source);
  }

  return (
    <ChipsCommandProvider
      adapter={commands.adapter}
      commands={appCommandViews}
      i18n={text}
      query={{ source: "palette", includeDisabled: true }}
    >
      <ChipsErrorBoundary
        title={text("app.errors.boundaryTitle")}
        description={text("app.errors.boundaryDescription")}
        retryLabel={text("app.errors.retry")}
        showErrorMessage
      >
        <ChipsLoadingBoundary
          loading={commands.phase === "registering" || surface.status === "loading"}
          loadingText={text("app.shell.loading")}
        >
          <div className="app-shell" data-app-id={appConfig.appId}>
            <header className="app-shell__header">
              <ChipsStack gap="sm" className="app-shell__title-group">
                <ChipsText as="div" role="heading" aria-level={1} className="app-shell__title">
                  {text("app.identity.displayName")}
                </ChipsText>
                <ChipsText className="app-shell__subtitle">
                  {text("app.shell.subtitle")}
                </ChipsText>
              </ChipsStack>
              <div className="app-shell__actions">
                <ChipsBadge
                  tone={commands.phase === "ready" ? "success" : "warning"}
                  label={text(commandStatusKey)}
                />
                <ChipsButton type="button" onPress={handleLanguageSwitch}>
                  {text("app.shell.languageSwitch", { locale: nextLocale(locale) })}
                </ChipsButton>
              </div>
            </header>

            <div className="app-shell__command-row">
              <ChipsMenuBar
                adapter={commands.adapter}
                commands={appCommandViews}
                menus={menuDescriptors}
                ariaLabel={text("app.commands.menu.ariaLabel")}
              />
              <ChipsToolbar
                adapter={commands.adapter}
                commands={appCommandViews}
                toolbarId="main"
                ariaLabel={text("app.commands.toolbar.ariaLabel")}
              />
            </div>

            <ChipsNavigationSplitView ariaLabel={text("app.shell.navigationLabel")}>
              <ChipsNavigationSplitView.Sidebar
                className="app-shell__sidebar"
                ariaLabel={text("app.shell.navigationLabel")}
              >
                <ChipsStack gap="sm">
                  <ChipsButton
                    type="button"
                    pressed={activeSceneId === "main"}
                    onPress={() => setActiveSceneId("main")}
                  >
                    {text("app.scenes.main.title")}
                  </ChipsButton>
                  <ChipsButton
                    type="button"
                    pressed={activeSceneId === "settings"}
                    onPress={() => setActiveSceneId("settings")}
                  >
                    {text("app.scenes.settings.title")}
                  </ChipsButton>
                  <ChipsButton
                    type="button"
                    disabled={!canInvokeCommand}
                    onPress={() => invokeCommand(APP_COMMAND_IDS.openWorkspace, "toolbar")}
                  >
                    {text("app.commands.openWorkspace.title")}
                  </ChipsButton>
                  <ChipsButton
                    type="button"
                    disabled={!canInvokeCommand}
                    onPress={() => invokeCommand(APP_COMMAND_IDS.refreshTheme, "toolbar")}
                  >
                    {text("app.commands.refreshTheme.title")}
                  </ChipsButton>
                </ChipsStack>
              </ChipsNavigationSplitView.Sidebar>

              <ChipsNavigationSplitView.Content
                className="app-shell__content"
                ariaLabel={text("app.shell.contentLabel")}
              >
                <ChipsScrollView axis="vertical" className="app-shell__scroll">
                  <ChipsStack gap="lg">
                    <section className="app-shell__scene-heading" aria-labelledby="app-scene-title">
                      <ChipsText
                        as="div"
                        role="heading"
                        aria-level={2}
                        id="app-scene-title"
                        className="app-shell__scene-title"
                      >
                        {text(activeScene.titleKey)}
                      </ChipsText>
                      <ChipsText>{text(activeScene.descriptionKey)}</ChipsText>
                    </section>
                    {activeSceneId === "main" ? (
                      <MainScene
                        activeSceneId={activeSceneId}
                        onSelectScene={setActiveSceneId}
                      />
                    ) : (
                      <SettingsScene />
                    )}
                  </ChipsStack>
                </ChipsScrollView>
              </ChipsNavigationSplitView.Content>

              <ChipsNavigationSplitView.Detail
                className="app-shell__detail"
                ariaLabel={text("app.shell.detailLabel")}
              >
                <ChipsStack gap="md">
                  <ChipsText as="div" role="heading" aria-level={2} className="app-shell__panel-title">
                    {text("app.commands.sectionTitle")}
                  </ChipsText>
                  <ChipsCommandPalette
                    adapter={commands.adapter}
                    commands={appCommandViews}
                    inputPlaceholder={text("app.commands.palette.searchPlaceholder")}
                    ariaLabel={text("app.commands.palette.ariaLabel")}
                  />
                  <ChipsText>
                    {commands.lastInvoked
                      ? text("app.commands.status.lastInvoked", {
                          commandId: commands.lastInvoked.commandId,
                          source: commands.lastInvoked.source,
                        })
                      : text(commandStatusKey)}
                  </ChipsText>
                  {commands.errorCode ? (
                    <ChipsText>
                      {text("app.commands.status.errorWithCode", { code: commands.errorCode })}
                    </ChipsText>
                  ) : null}
                  <ChipsText>
                    {diagnostics.diagnostics.length === 0
                      ? text("app.workspace.emptyTitle")
                      : text("app.workspace.diagnosticsLabel")}
                  </ChipsText>
                </ChipsStack>
              </ChipsNavigationSplitView.Detail>
            </ChipsNavigationSplitView>
          </div>
        </ChipsLoadingBoundary>
      </ChipsErrorBoundary>
    </ChipsCommandProvider>
  );
}

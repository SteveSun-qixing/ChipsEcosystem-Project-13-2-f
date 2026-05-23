import React, { useMemo } from "react";
import {
  ChipsButton,
  ChipsCommandPalette,
  ChipsCommandProvider,
  ChipsEnvironmentProvider,
  ChipsInput,
  ChipsMenuBar,
  ChipsThemeProvider,
  ChipsToolbar,
  resolveI18nText,
  useChipsDiagnostics,
  useChipsEnvironment,
  useChipsI18n,
  useChipsPermission,
  useChipsSurface,
  useChipsTheme,
} from "@chips/component-library";
import { ExamplePanel } from "./components/ExamplePanel";
import { useAppCommands } from "./commands/useAppCommands";
import { chipsClient } from "./runtime/chips-client";
import { translateLocalKey } from "./i18n/locales";

type TextParams = Record<string, string | number>;
type TextResolver = (key: string, fallback?: string, params?: TextParams) => string;

const DEFAULT_THEME_ID = "chips-official.default-theme";
const DEFAULT_THEME_VERSION = "1.0.0";

function useTemplateI18n(): {
  locale: string;
  translate: (key: string, params?: TextParams) => string;
  text: TextResolver;
} {
  const i18n = useChipsI18n();
  const locale = i18n.locale || "zh-CN";
  const translate = useMemo(
    () => (key: string, params?: TextParams) => translateLocalKey(key, locale, params),
    [locale],
  );
  const text = useMemo<TextResolver>(
    () => (key, fallback = key, params) => resolveI18nText({
      i18n: translate,
      key,
      fallback,
      params,
    }),
    [translate],
  );

  return { locale, translate, text };
}

function Header() {
  const { text } = useTemplateI18n();

  return (
    <header
      data-chips-app="app-standard.header"
      style={{
        padding: "24px 24px 16px",
        borderBottom: "1px solid var(--chips-border-subtle)",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 18 }}>{{ DISPLAY_NAME }}</h1>
      <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.8 }}>
        {text("app-standard.shell.subtitle")}
      </p>
    </header>
  );
}

function CommandWorkspace() {
  const { text, translate } = useTemplateI18n();
  const {
    adapter,
    phase,
    errorCode,
    lastInvoked,
  } = useAppCommands();
  const menuDescriptors = useMemo(
    () => [
      {
        menuId: "app",
        label: text("app-standard.commands.menu.app"),
      },
    ],
    [text],
  );
  const statusText = lastInvoked
    ? text("app-standard.commands.status.lastInvoked", "command invoked", {
        commandId: lastInvoked.commandId,
        source: lastInvoked.source,
      })
    : text(`app-standard.commands.status.${phase}`);
  const errorText = errorCode
    ? text("app-standard.commands.status.errorWithCode", "command error", { code: errorCode })
    : null;

  return (
    <section
      data-chips-app="app-standard.commands"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <h2 style={{ fontSize: 14, margin: 0 }}>{text("app-standard.commands.sectionTitle")}</h2>
      <ChipsCommandProvider adapter={adapter} i18n={translate}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ChipsMenuBar
            menus={menuDescriptors}
            ariaLabel={text("app-standard.commands.menu.ariaLabel")}
          />
          <ChipsToolbar
            toolbarId="main"
            ariaLabel={text("app-standard.commands.toolbar.ariaLabel")}
          />
          <ChipsCommandPalette
            triggerLabel={text("app-standard.commands.palette.trigger")}
            searchPlaceholder={text("app-standard.commands.palette.searchPlaceholder")}
            ariaLabel={text("app-standard.commands.palette.ariaLabel")}
          />
        </div>
      </ChipsCommandProvider>
      <p style={{ margin: 0, fontSize: 12 }}>{statusText}</p>
      {errorText ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--chips-sys-color-danger)" }}>
          {errorText}
        </p>
      ) : null}
    </section>
  );
}

function EnvironmentStatus() {
  const { locale, text } = useTemplateI18n();
  const theme = useChipsTheme();
  const surface = useChipsSurface();
  const permission = useChipsPermission();
  const diagnostics = useChipsDiagnostics();
  const themeInfo = theme.theme;
  const surfaceInfo = surface.surface;
  const errorCode = theme.error?.code || surface.error?.code || diagnostics.error?.code;
  const unknown = text("app-standard.environment.unknown");
  const commandPermissionText = permission.hasPermission("command.invoke")
    ? text("app-standard.environment.permissionReady")
    : text("app-standard.environment.permissionMissing");

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ fontSize: 14, marginBottom: 8 }}>{text("app-standard.environment.title")}</h2>
      <p style={{ fontSize: 12, margin: 0 }}>
        {text("app-standard.environment.themeLabel")}
        <code>
          {themeInfo?.themeId || unknown} / {themeInfo?.displayName || unknown}
        </code>
      </p>
      <p style={{ fontSize: 12, margin: 0 }}>
        {text("app-standard.environment.localeLabel")}
        <code>{locale}</code>
      </p>
      <p style={{ fontSize: 12, margin: 0 }}>
        {text("app-standard.environment.surfaceLabel")}
        <code>
          {surfaceInfo?.kind || unknown} / {surfaceInfo?.sceneId || unknown}
        </code>
      </p>
      <p style={{ fontSize: 12, margin: 0 }}>
        {text("app-standard.environment.permissionLabel")}
        <code>{commandPermissionText}</code>
      </p>
      <p style={{ fontSize: 12, margin: 0 }}>
        {text("app-standard.environment.diagnosticsLabel")}
        <code>{diagnostics.diagnostics.length}</code>
      </p>
      {errorCode ? (
        <p style={{ color: "var(--chips-sys-color-danger)", fontSize: 12, margin: 0 }}>
          {text("app-standard.environment.error", "environment error", { code: errorCode })}
        </p>
      ) : null}
    </section>
  );
}

function MainContent() {
  const { text } = useTemplateI18n();

  return (
    <main
      data-chips-app="app-standard.main"
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <section>
        <h2 style={{ fontSize: 14, marginBottom: 8 }}>
          {text("app-standard.sample.form.title")}
        </h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ChipsInput placeholder={text("app-standard.sample.input.placeholder")} />
          <ChipsButton variant="primary">{text("app-standard.actions.submit")}</ChipsButton>
        </div>
      </section>

      <CommandWorkspace />

      <EnvironmentStatus />

      <ExamplePanel title={text("app-standard.examplePanel.title")} />
    </main>
  );
}

function AppShell() {
  const environment = useChipsEnvironment();
  const theme = useChipsTheme();
  const themeId = theme.theme?.themeId || DEFAULT_THEME_ID;
  const version = theme.theme?.version || DEFAULT_THEME_VERSION;

  return (
    <ChipsThemeProvider
      themeId={themeId}
      version={version}
      eventSource={environment.eventSource}
      eventName="theme.changed"
    >
      <div
        data-chips-app="app-standard.shell"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--chips-sys-color-surface)",
          color: "var(--chips-sys-color-on-surface)",
        }}
      >
        <Header />
        <MainContent />
      </div>
    </ChipsThemeProvider>
  );
}

export function App() {
  return (
    <ChipsEnvironmentProvider
      client={chipsClient}
      initialTheme={{
        themeId: DEFAULT_THEME_ID,
        displayName: "Default",
        version: DEFAULT_THEME_VERSION,
      }}
      initialLocale="zh-CN"
      initialPermissions={[
        "theme.read",
        "i18n.read",
        "command.read",
        "command.write",
        "command.invoke",
      ]}
    >
      <AppShell />
    </ChipsEnvironmentProvider>
  );
}

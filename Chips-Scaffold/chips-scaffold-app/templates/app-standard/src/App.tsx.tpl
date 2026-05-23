import React, { useEffect, useMemo, useState } from "react";
import {
  ChipsButton,
  ChipsCommandPalette,
  ChipsCommandProvider,
  ChipsInput,
  ChipsMenuBar,
  ChipsThemeProvider,
  ChipsToolbar,
  resolveI18nText,
} from "@chips/component-library";
import { ExamplePanel } from "./components/ExamplePanel";
import { useAppCommands } from "./commands/useAppCommands";
import { chipsClient } from "./runtime/chips-client";
import { translateLocalKey } from "./i18n/locales";

declare global {
  interface Window {
    chips?: {
      on?(event: string, handler: (payload: unknown) => void): () => void;
      off?(event: string, handler: (payload: unknown) => void): void;
      addEventListener?(event: string, handler: EventListener): void;
      removeEventListener?(event: string, handler: EventListener): void;
      subscribe?(event: string, handler: (payload: unknown) => void): () => void;
    };
  }
}

type ThemeInfo = {
  themeId?: string;
  displayName?: string;
  version?: string;
};

function t(key: string, params?: Record<string, string | number>): string {
  return translateLocalKey(key, "zh-CN", params);
}

function text(key: string, fallback = key, params?: Record<string, string | number>): string {
  return resolveI18nText({
    i18n: t,
    key,
    fallback,
    params,
  });
}

function useChipsThemeInfo() {
  const [themeInfo, setThemeInfo] = useState<ThemeInfo | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    chipsClient.theme
      .getCurrent()
      .then((info) => {
        if (!cancelled) {
          setThemeInfo(info);
          setErrorCode(null);
        }
      })
      .catch((error: { code?: string }) => {
        if (!cancelled) {
          setErrorCode(error?.code || "THEME_RUNTIME_ERROR");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { themeInfo, errorCode };
}

function Header() {
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
    [],
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
      <ChipsCommandProvider adapter={adapter} i18n={t}>
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

function MainContent() {
  const { themeInfo, errorCode } = useChipsThemeInfo();

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

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8 }}>{text("app-standard.bridge.title")}</h2>
        {errorCode ? (
          <p style={{ color: "var(--chips-sys-color-danger)", fontSize: 12 }}>
            {text("app-standard.bridge.error", "theme error", { code: errorCode })}
          </p>
        ) : (
          <p style={{ fontSize: 12 }}>
            {text("app-standard.bridge.themeLabel")}
            <code>
              {themeInfo?.themeId || "unknown"} / {themeInfo?.displayName || "Unknown"}
            </code>
          </p>
        )}
      </section>

      <ExamplePanel title={text("app-standard.examplePanel.title")} />
    </main>
  );
}

export function App() {
  const themeEventSource = typeof window !== "undefined" ? window.chips : undefined;

  return (
    <ChipsThemeProvider
      themeId="chips-official.default-theme"
      version="1.0.0"
      eventSource={themeEventSource}
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

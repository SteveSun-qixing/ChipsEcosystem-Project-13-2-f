import React from "react";
import type { Client, ThemeState } from "chips-sdk";
import { appConfig } from "../../../config/app-config";
import { getChipsClient } from "../../shared/runtime/client";
import { normalizeSettingsError, type SettingsPanelError } from "../../shared/runtime/errors";
import { createRuntimeEventSource, type RuntimeEventSource } from "../../shared/runtime/event-source";
import { formatMessage } from "../../shared/i18n/messages";

interface RuntimeContextValue {
  client: Client;
  eventSource: RuntimeEventSource;
  currentTheme: ThemeState | null;
  currentLocale: string;
  ready: boolean;
  runtimeError: SettingsPanelError | null;
  refreshRuntimeState: () => Promise<void>;
}

const RuntimeContext = React.createContext<RuntimeContextValue | null>(null);

async function readRuntimeState(client: Client): Promise<{ theme: ThemeState; locale: string }> {
  const [theme, locale] = await Promise.all([
    client.theme.getCurrent({ appId: appConfig.appId }),
    client.i18n.getCurrent(),
  ]);

  return { theme, locale };
}

export function RuntimeProvider({ children }: React.PropsWithChildren): React.ReactElement {
  const client = React.useMemo(() => getChipsClient(), []);
  const eventSource = React.useMemo(() => createRuntimeEventSource(client), [client]);
  const [currentTheme, setCurrentTheme] = React.useState<ThemeState | null>(null);
  const [currentLocale, setCurrentLocale] = React.useState("zh-CN");
  const [ready, setReady] = React.useState(false);
  const [runtimeError, setRuntimeError] = React.useState<SettingsPanelError | null>(null);

  const getRuntimeMessage = React.useCallback((key: string) => {
    return formatMessage(currentLocale, key);
  }, [currentLocale]);

  const refreshRuntimeState = React.useCallback(async () => {
    try {
      const nextState = await readRuntimeState(client);
      setCurrentTheme(nextState.theme);
      setCurrentLocale(nextState.locale);
      setRuntimeError(null);
      setReady(true);
    } catch (error) {
      setRuntimeError(normalizeSettingsError(error, getRuntimeMessage("settingsPanel.errors.runtimeState")));
      setReady(true);
    }
  }, [client, getRuntimeMessage]);

  React.useEffect(() => {
    let active = true;

    void readRuntimeState(client)
      .then((nextState) => {
        if (!active) {
          return;
        }
        setCurrentTheme(nextState.theme);
        setCurrentLocale(nextState.locale);
        setRuntimeError(null);
        setReady(true);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setRuntimeError(normalizeSettingsError(error, getRuntimeMessage("settingsPanel.errors.runtimeState")));
        setReady(true);
      });

    const unsubscribeTheme = client.events.on<{ themeId?: string }>("theme.changed", async () => {
      try {
        const theme = await client.theme.getCurrent({ appId: appConfig.appId });
        if (active) {
          setCurrentTheme(theme);
        }
      } catch (error) {
        if (active) {
          setRuntimeError(normalizeSettingsError(error, getRuntimeMessage("settingsPanel.errors.runtimeThemeRefresh")));
        }
      }
    });

    const unsubscribeLanguage = client.events.on<{ locale?: string }>("language.changed", async (payload) => {
      if (active && typeof payload?.locale === "string") {
        setCurrentLocale(payload.locale);
        return;
      }

      try {
        const locale = await client.i18n.getCurrent();
        if (active) {
          setCurrentLocale(locale);
        }
      } catch (error) {
        if (active) {
          setRuntimeError(normalizeSettingsError(error, getRuntimeMessage("settingsPanel.errors.runtimeLocaleRefresh")));
        }
      }
    });

    return () => {
      active = false;
      unsubscribeTheme();
      unsubscribeLanguage();
    };
  }, [client, getRuntimeMessage]);

  const value = React.useMemo<RuntimeContextValue>(() => {
    return {
      client,
      eventSource,
      currentTheme,
      currentLocale,
      ready,
      runtimeError,
      refreshRuntimeState,
    };
  }, [client, currentLocale, currentTheme, eventSource, ready, refreshRuntimeState, runtimeError]);

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntimeContext(): RuntimeContextValue {
  const context = React.useContext(RuntimeContext);
  if (!context) {
    throw new Error("RuntimeContext is not available.");
  }
  return context;
}

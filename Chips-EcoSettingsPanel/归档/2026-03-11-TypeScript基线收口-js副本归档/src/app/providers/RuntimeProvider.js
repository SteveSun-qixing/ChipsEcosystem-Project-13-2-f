import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { appConfig } from "../../../config/app-config";
import { getChipsClient } from "../../shared/runtime/client";
import { normalizeSettingsError } from "../../shared/runtime/errors";
import { createRuntimeEventSource } from "../../shared/runtime/event-source";
const RuntimeContext = React.createContext(null);
async function readRuntimeState(client) {
    const [theme, locale] = await Promise.all([
        client.theme.getCurrent({ appId: appConfig.appId }),
        client.i18n.getCurrent(),
    ]);
    return { theme, locale };
}
export function RuntimeProvider({ children }) {
    const client = React.useMemo(() => getChipsClient(), []);
    const eventSource = React.useMemo(() => createRuntimeEventSource(client), [client]);
    const [currentTheme, setCurrentTheme] = React.useState(null);
    const [currentLocale, setCurrentLocale] = React.useState("zh-CN");
    const [ready, setReady] = React.useState(false);
    const [runtimeError, setRuntimeError] = React.useState(null);
    const refreshRuntimeState = React.useCallback(async () => {
        try {
            const nextState = await readRuntimeState(client);
            setCurrentTheme(nextState.theme);
            setCurrentLocale(nextState.locale);
            setRuntimeError(null);
            setReady(true);
        }
        catch (error) {
            setRuntimeError(normalizeSettingsError(error, "Failed to read Host runtime state."));
            setReady(true);
        }
    }, [client]);
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
            setRuntimeError(normalizeSettingsError(error, "Failed to read Host runtime state."));
            setReady(true);
        });
        const unsubscribeTheme = client.events.on("theme.changed", async () => {
            try {
                const theme = await client.theme.getCurrent({ appId: appConfig.appId });
                if (active) {
                    setCurrentTheme(theme);
                }
            }
            catch (error) {
                if (active) {
                    setRuntimeError(normalizeSettingsError(error, "Failed to refresh theme state."));
                }
            }
        });
        const unsubscribeLanguage = client.events.on("language.changed", async (payload) => {
            if (active && typeof payload?.locale === "string") {
                setCurrentLocale(payload.locale);
                return;
            }
            try {
                const locale = await client.i18n.getCurrent();
                if (active) {
                    setCurrentLocale(locale);
                }
            }
            catch (error) {
                if (active) {
                    setRuntimeError(normalizeSettingsError(error, "Failed to refresh locale state."));
                }
            }
        });
        return () => {
            active = false;
            unsubscribeTheme();
            unsubscribeLanguage();
        };
    }, [client]);
    const value = React.useMemo(() => {
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
    return _jsx(RuntimeContext.Provider, { value: value, children: children });
}
export function useRuntimeContext() {
    const context = React.useContext(RuntimeContext);
    if (!context) {
        throw new Error("RuntimeContext is not available.");
    }
    return context;
}

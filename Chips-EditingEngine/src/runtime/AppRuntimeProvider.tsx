import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import {
  ChipsEnvironmentProvider,
  ChipsThemeProvider,
  useChipsTheme,
  type ChipsThemeState,
} from '@chips/component-library';
import type { Client } from 'chips-sdk';
import { setLocale } from '../i18n';
import { i18nService } from '../services/i18n-service';
import { getEditingEngineClient } from './chips-client';
import { readLaunchContext, type EditingEngineLaunchSnapshot } from './launch-context';
import { createEditingEngineEnvironmentClient, toEnvironmentLaunchContext } from './environment-client';
import {
  createThemeRuntimeEventSource,
  DEFAULT_THEME_RUNTIME_STATE,
} from './theme-runtime';

export interface AppRuntimeContextValue {
  client: Client;
  launch: EditingEngineLaunchSnapshot;
}

const AppRuntimeContext = createContext<AppRuntimeContextValue | null>(null);

export function useAppRuntime(): AppRuntimeContextValue {
  const runtime = useContext(AppRuntimeContext);
  if (!runtime) {
    throw new Error('useAppRuntime must be used within AppRuntimeProvider');
  }

  return runtime;
}

export interface AppRuntimeProviderProps {
  children: ReactNode;
}

function RuntimeThemeProvider({ client, children }: { client: Client; children: ReactNode }) {
  const { theme } = useChipsTheme();
  const activeTheme = theme ?? DEFAULT_THEME_RUNTIME_STATE;
  const themeEventSource = useMemo(() => createThemeRuntimeEventSource(client), [client]);

  useEffect(() => {
    const unsubscribeLanguage = client.events.on<{ locale?: string }>('language.changed', async (payload) => {
      if (typeof payload?.locale === 'string') {
        setLocale(payload.locale);
        return;
      }

      try {
        await i18nService.initLocale();
      } catch (error) {
        console.warn('[AppRuntime] Failed to refresh locale runtime state:', error);
      }
    });

    return unsubscribeLanguage;
  }, [client]);

  return (
    <ChipsThemeProvider
      themeId={activeTheme.themeId}
      version={activeTheme.version}
      eventSource={themeEventSource}
      eventName="theme.changed"
    >
      {children}
    </ChipsThemeProvider>
  );
}

export function AppRuntimeProvider({ children }: AppRuntimeProviderProps) {
  const client = useMemo(() => getEditingEngineClient(), []);
  const environmentClient = useMemo(() => createEditingEngineEnvironmentClient(client), [client]);
  const launch = useMemo(() => readLaunchContext(client), [client]);
  const environmentLaunchContext = useMemo(() => toEnvironmentLaunchContext(launch.launchContext), [launch.launchContext]);
  const initialTheme = useMemo<ChipsThemeState>(() => DEFAULT_THEME_RUNTIME_STATE, []);

  const contextValue = useMemo<AppRuntimeContextValue>(() => ({
    client,
    launch,
  }), [client, launch]);

  return (
    <AppRuntimeContext.Provider value={contextValue}>
      <ChipsEnvironmentProvider
        client={environmentClient}
        initialTheme={initialTheme}
        initialLaunchContext={environmentLaunchContext}
        initialSurface={environmentLaunchContext?.surfaceContext}
      >
        <RuntimeThemeProvider client={client}>
          {children}
        </RuntimeThemeProvider>
      </ChipsEnvironmentProvider>
    </AppRuntimeContext.Provider>
  );
}

import React from "react";
import type { Client, PlatformLaunchContext, SurfaceContext } from "chips-sdk";
import { useChipsTheme, type ChipsThemeState } from "@chips/component-library";
import { appConfig } from "../../config/app-config";
import { createLogger, createTraceId } from "../../config/logging";
import { resolveLocaleDirection, type SupportedLocale } from "../i18n/messages";
import { useRichTextEditorText, type RichTextEditorTextResolver } from "../i18n/useRichTextEditorText";
import { chipsClient } from "../runtime/chips-client";
import { readLaunchContext } from "../runtime/launch-context";
import { defaultThemeState } from "../runtime/theme-runtime";

export interface RichTextEditorRuntimeEnvironment {
  appId: string;
  pluginId: string;
  hostSceneId: string;
  activeSceneId: "document";
  surfaceId: string | null;
  sessionId: string | null;
  surfaceKind: string;
  launchParams: Record<string, unknown>;
}

export interface RichTextEditorRuntimeValue {
  client: Client;
  traceId: string;
  launchContext: PlatformLaunchContext;
  surface: SurfaceContext | null;
  environment: RichTextEditorRuntimeEnvironment;
  theme: ChipsThemeState;
  locale: SupportedLocale;
  t: RichTextEditorTextResolver;
}

const AppRuntimeContext = React.createContext<RichTextEditorRuntimeValue | null>(null);

function resolveHostSceneId(launchContext: PlatformLaunchContext): string {
  return launchContext.surfaceContext?.sceneId ?? launchContext.sceneId ?? appConfig.defaultSceneId;
}

function resolveSurfaceKind(launchContext: PlatformLaunchContext): string {
  return launchContext.surfaceContext?.kind ?? launchContext.kind ?? "window";
}

function resolveLaunchParams(launchContext: PlatformLaunchContext): Record<string, unknown> {
  return {
    ...launchContext.surfaceContext?.launchParams,
    ...launchContext.launchParams,
  };
}

export interface AppRuntimeProviderProps {
  children: React.ReactNode;
}

export function AppRuntimeProvider({ children }: AppRuntimeProviderProps): React.ReactElement {
  const client = chipsClient;
  const traceId = React.useMemo(() => createTraceId("rte"), []);
  const logger = React.useMemo(
    () =>
      createLogger({
        scope: "app-runtime",
        traceId,
      }),
    [traceId],
  );
  const [launchContext, setLaunchContext] = React.useState<PlatformLaunchContext>(() => readLaunchContext(client));
  const { theme } = useChipsTheme();
  const { locale, text } = useRichTextEditorText();
  const activeTheme = theme ?? defaultThemeState;

  React.useEffect(() => {
    logger.info("富文本编辑器运行时已初始化", {
      appId: appConfig.appId,
    });

    return () => {
      logger.info("富文本编辑器运行时已卸载");
    };
  }, [logger]);

  React.useEffect(() => {
    setLaunchContext(readLaunchContext(client));
  }, [client]);

  React.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousLang = document.documentElement.getAttribute("lang");
    const previousDir = document.documentElement.getAttribute("dir");
    const previousLocale = document.documentElement.getAttribute("data-chips-locale");
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", resolveLocaleDirection(locale));
    document.documentElement.setAttribute("data-chips-locale", locale);

    return () => {
      if (previousLang === null) {
        document.documentElement.removeAttribute("lang");
      } else {
        document.documentElement.setAttribute("lang", previousLang);
      }
      if (previousDir === null) {
        document.documentElement.removeAttribute("dir");
      } else {
        document.documentElement.setAttribute("dir", previousDir);
      }
      if (previousLocale === null) {
        document.documentElement.removeAttribute("data-chips-locale");
      } else {
        document.documentElement.setAttribute("data-chips-locale", previousLocale);
      }
    };
  }, [locale]);

  const environment = React.useMemo<RichTextEditorRuntimeEnvironment>(() => ({
    appId: appConfig.appId,
    pluginId: launchContext.surfaceContext?.pluginId ?? launchContext.pluginId ?? appConfig.appId,
    hostSceneId: resolveHostSceneId(launchContext),
    activeSceneId: "document",
    surfaceId: launchContext.surfaceContext?.surfaceId ?? launchContext.surfaceId ?? null,
    sessionId: launchContext.surfaceContext?.sessionId ?? launchContext.sessionId ?? null,
    surfaceKind: resolveSurfaceKind(launchContext),
    launchParams: resolveLaunchParams(launchContext),
  }), [launchContext]);

  const value = React.useMemo<RichTextEditorRuntimeValue>(() => ({
    client,
    traceId,
    launchContext,
    surface: launchContext.surfaceContext ?? null,
    environment,
    theme: activeTheme,
    locale,
    t: text,
  }), [activeTheme, client, environment, launchContext, locale, text, traceId]);

  return <AppRuntimeContext.Provider value={value}>{children}</AppRuntimeContext.Provider>;
}

export function useAppRuntime(): RichTextEditorRuntimeValue {
  const context = React.useContext(AppRuntimeContext);
  if (!context) {
    throw new Error("AppRuntimeContext is not available.");
  }

  return context;
}

import React from "react";

const TokenResolverContext = React.createContext(null);
const ThemeRuntimeContext = React.createContext({
  themeId: "default",
  version: "0",
  cacheKey: "default:0",
  lastChangedAt: 0
});
const ChipsEnvironmentContext = React.createContext(null);

const EMPTY_ARRAY = Object.freeze([]);

const STATUS_IDLE = "idle";
const STATUS_LOADING = "loading";
const STATUS_READY = "ready";
const STATUS_ERROR = "error";
const DEFAULT_LOCALE = "zh-CN";
const DEFAULT_FALLBACK_LOCALE = "en-US";

function toThemeCacheKey(themeId, version) {
  const safeThemeId = typeof themeId === "string" && themeId.length > 0 ? themeId : "default";
  const safeVersion = typeof version === "string" && version.length > 0 ? version : "0";
  return `${safeThemeId}:${safeVersion}`;
}

function createChipsHookError(code, message, details) {
  const error = new Error(message || code);
  error.code = code;
  if (typeof details !== "undefined") {
    error.details = details;
  }
  return error;
}

function normalizeClient(value) {
  return value && typeof value === "object" ? value : null;
}

function createClientEventSource(client) {
  return {
    subscribe(eventName, handler) {
      if (!client?.events || typeof client.events.on !== "function") {
        return () => {};
      }
      return client.events.on(eventName, handler);
    }
  };
}

function appendDiagnostic(setDiagnostics, diagnostic) {
  if (!diagnostic) {
    return;
  }
  setDiagnostics((current) => [...current, diagnostic]);
}

function toDiagnostic(error, fallbackCode, source) {
  if (!error) {
    return null;
  }
  if (typeof error === "object") {
    return {
      code: typeof error.code === "string" ? error.code : fallbackCode,
      message: typeof error.message === "string" ? error.message : fallbackCode,
      messageKey: typeof error.messageKey === "string" ? error.messageKey : undefined,
      details: error.details,
      retryable: error.retryable === true,
      requestId: typeof error.requestId === "string" ? error.requestId : undefined,
      traceId: typeof error.traceId === "string" ? error.traceId : undefined,
      permission: error.permission,
      source
    };
  }
  return {
    code: fallbackCode,
    message: String(error),
    source
  };
}

function normalizeThemeVersion(theme) {
  if (!theme || typeof theme !== "object") {
    return undefined;
  }
  return theme.version || theme.themeVersion;
}

function resolveSurfaceContext(launchContext) {
  if (!launchContext || typeof launchContext !== "object") {
    return null;
  }
  if (launchContext.surfaceContext && typeof launchContext.surfaceContext === "object") {
    return launchContext.surfaceContext;
  }
  if (
    launchContext.sceneId ||
    launchContext.surfaceId ||
    launchContext.pluginId ||
    launchContext.sessionId ||
    launchContext.kind
  ) {
    return {
      sceneId: launchContext.sceneId || "default-scene",
      surfaceId: launchContext.surfaceId,
      pluginId: launchContext.pluginId,
      sessionId: launchContext.sessionId,
      kind: launchContext.kind || "window",
      presentation: launchContext.presentation || {},
      launchParams: launchContext.launchParams || {}
    };
  }
  return null;
}

function mergePermissions(...sources) {
  const permissions = new Set();
  for (const source of sources) {
    if (!Array.isArray(source)) {
      continue;
    }
    for (const permission of source) {
      if (typeof permission === "string" && permission.length > 0) {
        permissions.add(permission);
      }
    }
  }
  return [...permissions];
}

function normalizeLocaleBundles(bundles) {
  return bundles && typeof bundles === "object" ? bundles : {};
}

function readLocalePath(source, key) {
  if (!source || typeof source !== "object" || typeof key !== "string" || key.length === 0) {
    return undefined;
  }
  return key.split(".").reduce((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return current[segment];
  }, source);
}

function interpolateLocaleText(template, params) {
  if (!params || typeof params !== "object") {
    return template;
  }
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => {
    const replacement = params[name];
    return typeof replacement === "undefined" ? match : String(replacement);
  });
}

function resolveFallbackLocales(options, locale) {
  const locales = [];
  const add = (candidate) => {
    if (typeof candidate === "string" && candidate.length > 0 && !locales.includes(candidate)) {
      locales.push(candidate);
    }
  };
  if (Array.isArray(options.fallbackLocales)) {
    for (const fallbackLocale of options.fallbackLocales) {
      add(fallbackLocale);
    }
  }
  add(options.fallbackLocale || DEFAULT_FALLBACK_LOCALE);
  add(options.defaultLocale || DEFAULT_LOCALE);
  add(locale);
  return locales;
}

export function createChipsI18nText(options = {}) {
  const bundles = normalizeLocaleBundles(options.bundles);
  const locale = options.locale || options.defaultLocale || DEFAULT_LOCALE;
  const fallbackLocales = resolveFallbackLocales(options, locale);
  return (key, params, fallback) => {
    const lookupLocales = [locale, ...fallbackLocales].filter((candidate, index, all) => (
      typeof candidate === "string" && candidate.length > 0 && all.indexOf(candidate) === index
    ));
    for (const lookupLocale of lookupLocales) {
      const value = readLocalePath(bundles[lookupLocale], key);
      if (typeof value === "string") {
        return interpolateLocaleText(value, params);
      }
    }
    if (typeof fallback === "string") {
      return interpolateLocaleText(fallback, params);
    }
    if (typeof options.missingText === "function") {
      return options.missingText(key, { locale, params });
    }
    return key;
  };
}

export function ChipsTokenProvider({ resolver, children }) {
  return React.createElement(TokenResolverContext.Provider, { value: resolver }, children);
}

export function subscribeThemeChanged(eventSource, eventName, handler) {
  if (!eventSource || typeof handler !== "function") {
    return () => {};
  }

  if (typeof eventSource.on === "function" && typeof eventSource.off === "function") {
    eventSource.on(eventName, handler);
    return () => eventSource.off(eventName, handler);
  }

  if (typeof eventSource.addEventListener === "function" && typeof eventSource.removeEventListener === "function") {
    const listener = (event) => {
      if (event && "detail" in event) {
        handler(event.detail);
        return;
      }
      handler(event);
    };

    eventSource.addEventListener(eventName, listener);
    return () => eventSource.removeEventListener(eventName, listener);
  }

  if (typeof eventSource.subscribe === "function") {
    const unsubscribe = eventSource.subscribe(eventName, handler);
    if (typeof unsubscribe === "function") {
      return unsubscribe;
    }
    return () => {};
  }

  return () => {};
}

export function applyThemeVariables(target, variables) {
  if (!target || !target.style || typeof target.style.setProperty !== "function") {
    throw new Error("THEME_VARIABLE_TARGET_INVALID");
  }

  if (!variables || typeof variables !== "object") {
    return;
  }

  for (const [tokenKey, tokenValue] of Object.entries(variables)) {
    if (typeof tokenValue !== "string" && typeof tokenValue !== "number") {
      continue;
    }
    const cssVarName = `--${tokenKey.replaceAll(".", "-")}`;
    target.style.setProperty(cssVarName, String(tokenValue));
  }
}

function waitFrame(scheduler) {
  if (typeof scheduler === "function") {
    return scheduler();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function applyThemeVariablesInBatches(target, variables, options = {}) {
  if (!target || !target.style || typeof target.style.setProperty !== "function") {
    throw new Error("THEME_VARIABLE_TARGET_INVALID");
  }

  const {
    chunkSize = 200,
    scheduler,
    signal,
    onChunkApplied,
    onDiagnostic
  } = options;

  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error("THEME_VARIABLE_CHUNK_SIZE_INVALID");
  }

  if (!variables || typeof variables !== "object") {
    return {
      appliedCount: 0,
      chunkCount: 0,
      durationMs: 0
    };
  }

  const entries = Object.entries(variables).filter(
    ([, value]) => typeof value === "string" || typeof value === "number"
  );

  if (entries.length === 0) {
    return {
      appliedCount: 0,
      chunkCount: 0,
      durationMs: 0
    };
  }

  const startedAt = Date.now();
  let appliedCount = 0;
  let chunkCount = 0;

  for (let offset = 0; offset < entries.length; offset += chunkSize) {
    if (signal && signal.aborted) {
      const error = new Error("Theme variable apply aborted");
      error.code = "THEME_VARIABLE_APPLY_ABORTED";
      error.details = {
        appliedCount,
        totalCount: entries.length
      };
      error.retryable = true;
      throw error;
    }

    const chunk = entries.slice(offset, offset + chunkSize);
    for (const [tokenKey, tokenValue] of chunk) {
      const cssVarName = `--${tokenKey.replaceAll(".", "-")}`;
      target.style.setProperty(cssVarName, String(tokenValue));
      appliedCount += 1;
    }

    chunkCount += 1;

    if (typeof onChunkApplied === "function") {
      onChunkApplied({
        chunkIndex: chunkCount - 1,
        chunkSize: chunk.length,
        appliedCount,
        totalCount: entries.length
      });
    }

    if (typeof onDiagnostic === "function") {
      onDiagnostic({
        code: "THEME_VARIABLE_CHUNK_APPLIED",
        chunkIndex: chunkCount - 1,
        chunkSize: chunk.length,
        appliedCount,
        totalCount: entries.length
      });
    }

    if (offset + chunkSize < entries.length) {
      await waitFrame(scheduler);
    }
  }

  return {
    appliedCount,
    chunkCount,
    durationMs: Date.now() - startedAt
  };
}

export function ChipsThemeProvider(props) {
  const {
    themeId = "default",
    version = "0",
    eventName = "theme.changed",
    eventSource,
    onThemeChanged,
    resolver,
    children
  } = props;

  const [runtimeState, setRuntimeState] = React.useState(() => ({
    themeId,
    version,
    cacheKey: toThemeCacheKey(themeId, version),
    lastChangedAt: 0
  }));

  React.useEffect(() => {
    setRuntimeState((prev) => ({
      ...prev,
      themeId,
      version,
      cacheKey: toThemeCacheKey(themeId, version)
    }));
  }, [themeId, version]);

  React.useEffect(() => {
    const unsubscribe = subscribeThemeChanged(eventSource, eventName, (payload) => {
      const changedThemeId = payload && typeof payload.themeId === "string" ? payload.themeId : themeId;
      const changedVersion =
        payload && typeof payload.version === "string" && payload.version.length > 0
          ? payload.version
          : version;

      setRuntimeState((prev) => ({
        ...prev,
        themeId: changedThemeId,
        version: changedVersion,
        cacheKey: toThemeCacheKey(changedThemeId, changedVersion),
        lastChangedAt: Date.now()
      }));

      if (typeof onThemeChanged === "function") {
        onThemeChanged(payload);
      }
    });

    return unsubscribe;
  }, [eventName, eventSource, onThemeChanged, themeId, version]);

  return React.createElement(
    ThemeRuntimeContext.Provider,
    { value: runtimeState },
    React.createElement(
      TokenResolverContext.Provider,
      { value: resolver || null },
      children
    )
  );
}

export function useTokenResolver() {
  const resolver = React.useContext(TokenResolverContext);
  if (!resolver) {
    throw new Error("TOKEN_RESOLVER_CONTEXT_MISSING");
  }
  return resolver;
}

export function useToken(tokenKey) {
  const resolver = useTokenResolver();
  return resolver.get(tokenKey);
}

export function useComponentTokens(componentScope) {
  if (typeof componentScope !== "string" || componentScope.length === 0) {
    throw new Error("COMPONENT_SCOPE_INVALID");
  }

  const resolver = useTokenResolver();
  return React.useMemo(() => {
    const prefix = `chips.comp.${componentScope}.`;
    const tokenMap = {};
    for (const key of resolver.keys()) {
      if (key.startsWith(prefix)) {
        tokenMap[key] = resolver.get(key);
      }
    }
    return tokenMap;
  }, [componentScope, resolver]);
}

export function useThemeRuntime() {
  return React.useContext(ThemeRuntimeContext);
}

export function ChipsEnvironmentProvider(props) {
  const {
    client: providedClient,
    createClient,
    initialTheme = null,
    initialLocale,
    initialLaunchContext = null,
    initialSurface = null,
    initialPermissions = EMPTY_ARRAY,
    initialDiagnostics = EMPTY_ARRAY,
    onDiagnostic,
    children
  } = props;

  const clientRef = React.useRef(null);
  if (!clientRef.current) {
    clientRef.current = normalizeClient(providedClient) || (typeof createClient === "function" ? normalizeClient(createClient()) : null);
  }
  React.useEffect(() => {
    const nextClient = normalizeClient(providedClient);
    if (nextClient && nextClient !== clientRef.current) {
      clientRef.current = nextClient;
    }
  }, [providedClient]);

  const client = clientRef.current;
  const [theme, setTheme] = React.useState(initialTheme);
  const [locale, setLocale] = React.useState(initialLocale || null);
  const [launchContext, setLaunchContext] = React.useState(initialLaunchContext);
  const [surface, setSurface] = React.useState(initialSurface || resolveSurfaceContext(initialLaunchContext));
  const [permissions, setPermissions] = React.useState(() => mergePermissions(initialPermissions, initialSurface?.permissions));
  const [diagnostics, setDiagnostics] = React.useState(() => (
    Array.isArray(initialDiagnostics) ? [...initialDiagnostics] : []
  ));
  const [status, setStatus] = React.useState({
    theme: initialTheme ? STATUS_READY : STATUS_IDLE,
    i18n: initialLocale ? STATUS_READY : STATUS_IDLE,
    surface: initialSurface || initialLaunchContext ? STATUS_READY : STATUS_IDLE,
    diagnostics: STATUS_IDLE
  });
  const [error, setError] = React.useState(null);

  const eventSource = React.useMemo(() => createClientEventSource(client), [client]);

  const pushDiagnostic = React.useCallback((diagnostic) => {
    if (!diagnostic) {
      return;
    }
    setDiagnostics((current) => [...current, diagnostic]);
    if (typeof onDiagnostic === "function") {
      onDiagnostic(diagnostic);
    }
  }, [onDiagnostic]);

  const clearDiagnostics = React.useCallback(() => {
    setDiagnostics([]);
    setError(null);
  }, []);

  const refreshTheme = React.useCallback(async () => {
    if (!client?.theme || typeof client.theme.getCurrent !== "function") {
      return null;
    }
    setStatus((current) => ({ ...current, theme: STATUS_LOADING }));
    try {
      const nextTheme = await client.theme.getCurrent();
      setTheme(nextTheme);
      setStatus((current) => ({ ...current, theme: STATUS_READY }));
      return nextTheme;
    } catch (nextError) {
      const diagnostic = toDiagnostic(nextError, "CHIPS_THEME_REFRESH_FAILED", "theme");
      setError(diagnostic);
      pushDiagnostic(diagnostic);
      setStatus((current) => ({ ...current, theme: STATUS_ERROR }));
      throw nextError;
    }
  }, [client, pushDiagnostic]);

  const refreshLocale = React.useCallback(async () => {
    if (!client?.i18n || typeof client.i18n.getCurrent !== "function") {
      return null;
    }
    setStatus((current) => ({ ...current, i18n: STATUS_LOADING }));
    try {
      const nextLocale = await client.i18n.getCurrent();
      setLocale(nextLocale);
      setStatus((current) => ({ ...current, i18n: STATUS_READY }));
      return nextLocale;
    } catch (nextError) {
      const diagnostic = toDiagnostic(nextError, "CHIPS_I18N_REFRESH_FAILED", "i18n");
      setError(diagnostic);
      pushDiagnostic(diagnostic);
      setStatus((current) => ({ ...current, i18n: STATUS_ERROR }));
      throw nextError;
    }
  }, [client, pushDiagnostic]);

  const refreshSurface = React.useCallback(async () => {
    if (!client?.platform || typeof client.platform.getLaunchContext !== "function") {
      return null;
    }
    setStatus((current) => ({ ...current, surface: STATUS_LOADING }));
    try {
      const nextLaunchContext = client.platform.getLaunchContext();
      const nextSurface = resolveSurfaceContext(nextLaunchContext);
      setLaunchContext(nextLaunchContext || null);
      setSurface(nextSurface);
      setPermissions((current) => mergePermissions(current, nextSurface?.permissions));
      setStatus((current) => ({ ...current, surface: STATUS_READY }));
      return nextSurface;
    } catch (nextError) {
      const diagnostic = toDiagnostic(nextError, "CHIPS_SURFACE_REFRESH_FAILED", "surface");
      setError(diagnostic);
      pushDiagnostic(diagnostic);
      setStatus((current) => ({ ...current, surface: STATUS_ERROR }));
      throw nextError;
    }
  }, [client, pushDiagnostic]);

  const refreshDiagnostics = React.useCallback(async () => {
    if (!client?.controlPlane || typeof client.controlPlane.diagnose !== "function") {
      return null;
    }
    setStatus((current) => ({ ...current, diagnostics: STATUS_LOADING }));
    try {
      const diagnose = await client.controlPlane.diagnose();
      const diagnostic = {
        code: "CHIPS_CONTROL_PLANE_DIAGNOSE",
        message: "Control plane diagnose completed.",
        details: diagnose,
        source: "controlPlane"
      };
      pushDiagnostic(diagnostic);
      setStatus((current) => ({ ...current, diagnostics: STATUS_READY }));
      return diagnose;
    } catch (nextError) {
      const diagnostic = toDiagnostic(nextError, "CHIPS_DIAGNOSTICS_REFRESH_FAILED", "diagnostics");
      setError(diagnostic);
      pushDiagnostic(diagnostic);
      setStatus((current) => ({ ...current, diagnostics: STATUS_ERROR }));
      throw nextError;
    }
  }, [client, pushDiagnostic]);

  const refresh = React.useCallback(async () => {
    const tasks = [];
    if (client?.theme && typeof client.theme.getCurrent === "function") {
      tasks.push(refreshTheme());
    }
    if (client?.i18n && typeof client.i18n.getCurrent === "function") {
      tasks.push(refreshLocale());
    }
    if (client?.platform && typeof client.platform.getLaunchContext === "function") {
      tasks.push(refreshSurface());
    }
    const results = await Promise.allSettled(tasks);
    return results;
  }, [client, refreshLocale, refreshSurface, refreshTheme]);

  const hasPermission = React.useCallback((permission) => {
    return permissions.includes(permission);
  }, [permissions]);

  const translate = React.useCallback(async (key, params) => {
    if (!client?.i18n || typeof client.i18n.translate !== "function") {
      return key;
    }
    return client.i18n.translate(key, params);
  }, [client]);

  const command = React.useMemo(() => ({
    register: (...args) => client?.command?.register?.(...args),
    unregister: (...args) => client?.command?.unregister?.(...args),
    get: (...args) => client?.command?.get?.(...args),
    list: (...args) => client?.command?.list?.(...args),
    invoke: (...args) => client?.command?.invoke?.(...args),
    setState: (...args) => client?.command?.setState?.(...args),
    onRegistered: (...args) => client?.command?.onRegistered?.(...args),
    onUnregistered: (...args) => client?.command?.onUnregistered?.(...args),
    onChanged: (...args) => client?.command?.onChanged?.(...args),
    onInvoked: (...args) => client?.command?.onInvoked?.(...args)
  }), [client]);

  React.useEffect(() => {
    if (!client) {
      const diagnostic = {
        code: "CHIPS_CLIENT_MISSING",
        message: "Chips client is required by ChipsEnvironmentProvider.",
        source: "environment"
      };
      setError(diagnostic);
      appendDiagnostic(setDiagnostics, diagnostic);
      return undefined;
    }

    const boot = async () => {
      await refresh();
    };
    boot();
    return undefined;
  }, [client, pushDiagnostic, refresh]);

  React.useEffect(() => {
    if (!client?.theme || typeof client.theme.onChanged !== "function") {
      return undefined;
    }
    return client.theme.onChanged((payload) => {
      if (payload && typeof payload === "object") {
        setTheme((current) => ({
          ...(current && typeof current === "object" ? current : {}),
          themeId: payload.themeId || current?.themeId,
          version: normalizeThemeVersion(payload) || current?.version
        }));
      }
      refreshTheme().catch(() => {});
    });
  }, [client, refreshTheme]);

  React.useEffect(() => {
    const subscribe = client?.i18n && typeof client.i18n.onChanged === "function"
      ? client.i18n.onChanged.bind(client.i18n)
      : client?.events && typeof client.events.on === "function"
        ? (handler) => client.events.on("language.changed", handler)
        : null;
    if (!subscribe) {
      return undefined;
    }
    return subscribe((payload) => {
      if (payload && typeof payload.locale === "string") {
        setLocale(payload.locale);
      } else {
        refreshLocale().catch(() => {});
      }
    });
  }, [client, refreshLocale]);

  const value = React.useMemo(() => ({
    client,
    eventSource,
    theme,
    locale,
    launchContext,
    surface,
    permissions,
    diagnostics,
    status,
    error,
    ready: Boolean(client) && status.theme !== STATUS_LOADING && status.i18n !== STATUS_LOADING && status.surface !== STATUS_LOADING,
    refresh,
    refreshTheme,
    refreshLocale,
    refreshSurface,
    refreshDiagnostics,
    hasPermission,
    translate,
    command,
    pushDiagnostic,
    clearDiagnostics
  }), [
    client,
    eventSource,
    theme,
    locale,
    launchContext,
    surface,
    permissions,
    diagnostics,
    status,
    error,
    refresh,
    refreshTheme,
    refreshLocale,
    refreshSurface,
    refreshDiagnostics,
    hasPermission,
    translate,
    command,
    pushDiagnostic,
    clearDiagnostics
  ]);

  return React.createElement(ChipsEnvironmentContext.Provider, { value }, children);
}

export function useChipsEnvironment() {
  const context = React.useContext(ChipsEnvironmentContext);
  if (!context) {
    throw createChipsHookError(
      "CHIPS_ENVIRONMENT_CONTEXT_MISSING",
      "useChipsEnvironment must be used inside ChipsEnvironmentProvider."
    );
  }
  return context;
}

export function useChipsClient() {
  const environment = useChipsEnvironment();
  if (!environment.client) {
    throw createChipsHookError("CHIPS_CLIENT_MISSING", "Chips client is not available in the current environment.");
  }
  return environment.client;
}

export function useChipsTheme() {
  const environment = useChipsEnvironment();
  return {
    theme: environment.theme,
    status: environment.status.theme,
    error: environment.error?.source === "theme" ? environment.error : null,
    refresh: environment.refreshTheme,
    apply: async (themeId) => {
      const client = environment.client;
      if (!client?.theme || typeof client.theme.apply !== "function") {
        throw createChipsHookError("CHIPS_THEME_API_MISSING", "client.theme.apply is not available.");
      }
      await client.theme.apply(themeId);
      return environment.refreshTheme();
    }
  };
}

export function useChipsI18n() {
  const environment = useChipsEnvironment();
  return {
    locale: environment.locale,
    status: environment.status.i18n,
    error: environment.error?.source === "i18n" ? environment.error : null,
    t: environment.translate,
    translate: environment.translate,
    refresh: environment.refreshLocale,
    setLocale: async (locale) => {
      const client = environment.client;
      if (!client?.i18n || typeof client.i18n.setCurrent !== "function") {
        throw createChipsHookError("CHIPS_I18N_API_MISSING", "client.i18n.setCurrent is not available.");
      }
      await client.i18n.setCurrent(locale);
      return environment.refreshLocale();
    }
  };
}

export function useChipsI18nText(options = {}) {
  const i18n = useChipsI18n();
  const locale = i18n.locale || options.defaultLocale || DEFAULT_LOCALE;
  return React.useMemo(() => createChipsI18nText({
    ...options,
    locale
  }), [locale, options.bundles, options.defaultLocale, options.fallbackLocale, options.fallbackLocales, options.missingText]);
}

export function useChipsSurface() {
  const environment = useChipsEnvironment();
  return {
    surface: environment.surface,
    launchContext: environment.launchContext,
    status: environment.status.surface,
    error: environment.error?.source === "surface" ? environment.error : null,
    refresh: environment.refreshSurface
  };
}

export function useChipsPermission() {
  const environment = useChipsEnvironment();
  return {
    permissions: environment.permissions,
    hasPermission: environment.hasPermission,
    diagnostics: environment.diagnostics.filter((diagnostic) => diagnostic?.permission),
    latest: environment.error?.permission ? environment.error.permission : null
  };
}

export function useChipsCommand() {
  const environment = useChipsEnvironment();
  return environment.command;
}

export function useChipsDiagnostics() {
  const environment = useChipsEnvironment();
  return {
    diagnostics: environment.diagnostics,
    status: environment.status.diagnostics,
    error: environment.error,
    refresh: environment.refreshDiagnostics,
    push: environment.pushDiagnostic,
    clear: environment.clearDiagnostics
  };
}

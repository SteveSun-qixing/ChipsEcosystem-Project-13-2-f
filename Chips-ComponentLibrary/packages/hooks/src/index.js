import React from "react";

const TokenResolverContext = React.createContext(null);
const ThemeRuntimeContext = React.createContext({
  themeId: "default",
  version: "0",
  cacheKey: "default:0",
  lastChangedAt: 0
});

function toThemeCacheKey(themeId, version) {
  const safeThemeId = typeof themeId === "string" && themeId.length > 0 ? themeId : "default";
  const safeVersion = typeof version === "string" && version.length > 0 ? version : "0";
  return `${safeThemeId}:${safeVersion}`;
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

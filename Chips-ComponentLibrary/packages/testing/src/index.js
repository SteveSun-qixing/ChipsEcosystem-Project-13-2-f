export function assertHasContractAttrs(nodeAttrs) {
  const required = ["data-scope", "data-part", "data-state"];
  for (const key of required) {
    if (!Object.hasOwn(nodeAttrs, key)) {
      throw new Error(`TEST_CONTRACT_ATTR_MISSING:${key}`);
    }
  }
  return true;
}

export function createComponentFixture(options = {}) {
  const {
    scope = "component",
    part = "root",
    state = "idle",
    role = "region",
    ariaLabel = "fixture"
  } = options;

  return {
    "data-scope": scope,
    "data-part": part,
    "data-state": state,
    role,
    "aria-label": ariaLabel
  };
}

export function assertAriaRole(nodeAttrs, expectedRole) {
  if (!nodeAttrs || typeof nodeAttrs !== "object") {
    throw new Error("TEST_ARIA_NODE_INVALID");
  }

  if (nodeAttrs.role !== expectedRole) {
    throw new Error(`TEST_ARIA_ROLE_MISMATCH:${expectedRole}`);
  }

  return true;
}

export function assertStatePriority(state, priorityList) {
  if (typeof state !== "string" || state.length === 0) {
    throw new Error("TEST_STATE_INVALID");
  }

  if (!Array.isArray(priorityList) || priorityList.length === 0) {
    throw new Error("TEST_PRIORITY_LIST_INVALID");
  }

  if (!priorityList.includes(state)) {
    throw new Error(`TEST_STATE_NOT_IN_PRIORITY:${state}`);
  }

  return true;
}

export function createThemeFallbackFixture(overrides = {}) {
  return {
    global: {},
    app: {},
    box: {},
    "composite-card": {},
    "base-card": {},
    component: {},
    ...overrides
  };
}

export function resolveFallbackScopeValue(fixture, key) {
  const chain = ["component", "base-card", "composite-card", "box", "app", "global"];
  const source = fixture && typeof fixture === "object" ? fixture : {};
  for (const scope of chain) {
    const tokenMap = source[scope];
    if (tokenMap && Object.hasOwn(tokenMap, key)) {
      return {
        scope,
        value: tokenMap[key]
      };
    }
  }
  return null;
}

export function injectFault(type, payload = {}) {
  return {
    type,
    payload
  };
}

export function createMockChipsClient(options = {}) {
  const listeners = new Map();
  const calls = [];
  const state = {
    theme: options.theme || {
      themeId: "chips-official.default-theme",
      displayName: "薯片官方 · 默认主题",
      version: "1.0.0"
    },
    locale: options.locale || "zh-CN",
    launchContext: options.launchContext || {
      sceneId: "test-scene",
      surfaceId: "test-surface",
      kind: "window",
      surfaceContext: {
        sceneId: "test-scene",
        surfaceId: "test-surface",
        kind: "window",
        presentation: {},
        launchParams: {},
        permissions: options.permissions || []
      },
      launchParams: {}
    },
    diagnostics: options.diagnostics || {
      routeCount: 0,
      serviceCount: 0,
      config: {},
      runtimeSnapshot: {},
      topFailureRoutes: []
    },
    commands: Array.isArray(options.commands) ? [...options.commands] : []
  };

  const emitLocal = (eventName, payload) => {
    const handlers = listeners.get(eventName);
    if (!handlers) {
      return;
    }
    for (const handler of [...handlers]) {
      handler(payload);
    }
  };

  const on = (eventName, handler) => {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }
    listeners.get(eventName).add(handler);
    return () => {
      listeners.get(eventName)?.delete(handler);
    };
  };

  const client = {
    calls,
    state,
    events: {
      on,
      once(eventName, handler) {
        const unsubscribe = on(eventName, (payload) => {
          unsubscribe();
          handler(payload);
        });
        return unsubscribe;
      },
      async emit(eventName, payload) {
        emitLocal(eventName, payload);
      }
    },
    theme: {
      async getCurrent() {
        calls.push({ action: "theme.getCurrent", payload: {} });
        if (options.failTheme) throw options.failTheme;
        return state.theme;
      },
      async apply(themeId) {
        calls.push({ action: "theme.apply", payload: { themeId } });
        const previousThemeId = state.theme.themeId;
        state.theme = {
          ...state.theme,
          themeId
        };
        emitLocal("theme.changed", {
          previousThemeId,
          themeId,
          themeVersion: state.theme.version,
          timestamp: Date.now(),
          diagnosticsSummary: { total: 0, blocking: 0, bySeverity: {}, byCode: {}, status: "complete" }
        });
      },
      onChanged(handler) {
        return on("theme.changed", handler);
      }
    },
    i18n: {
      async getCurrent() {
        calls.push({ action: "i18n.getCurrent", payload: {} });
        if (options.failI18n) throw options.failI18n;
        return state.locale;
      },
      async setCurrent(locale) {
        calls.push({ action: "i18n.setCurrent", payload: { locale } });
        state.locale = locale;
        emitLocal("language.changed", { locale });
      },
      async translate(key, params) {
        calls.push({ action: "i18n.translate", payload: { key, params } });
        if (options.translations && Object.hasOwn(options.translations, key)) {
          return String(options.translations[key]);
        }
        return key;
      },
      onChanged(handler) {
        return on("language.changed", handler);
      }
    },
    platform: {
      getLaunchContext() {
        calls.push({ action: "platform.getLaunchContext", payload: {} });
        return state.launchContext;
      }
    },
    command: {
      async register(definition) {
        calls.push({ action: "command.register", payload: definition });
        state.commands.push(definition);
        emitLocal("command.changed", { reason: "registered" });
        return definition;
      },
      async unregister(commandId) {
        calls.push({ action: "command.unregister", payload: { commandId } });
        state.commands = state.commands.filter((command) => command.commandId !== commandId);
        emitLocal("command.changed", { reason: "unregistered" });
      },
      async get(commandId) {
        calls.push({ action: "command.get", payload: { commandId } });
        return state.commands.find((command) => command.commandId === commandId);
      },
      async list(options) {
        calls.push({ action: "command.list", payload: options || {} });
        return state.commands;
      },
      async invoke(commandId, payload, invokeOptions) {
        calls.push({ action: "command.invoke", payload: { commandId, payload, options: invokeOptions } });
        emitLocal("command.invoked", { commandId, payload, options: invokeOptions });
        return { commandId, payload };
      },
      async setState(commandId, commandState, setStateOptions) {
        calls.push({ action: "command.setState", payload: { commandId, state: commandState, options: setStateOptions } });
        return state.commands.find((command) => command.commandId === commandId);
      },
      onRegistered(handler) {
        return on("command.registered", handler);
      },
      onUnregistered(handler) {
        return on("command.unregistered", handler);
      },
      onChanged(handler) {
        return on("command.changed", handler);
      },
      onInvoked(handler) {
        return on("command.invoked", handler);
      }
    },
    controlPlane: {
      async diagnose() {
        calls.push({ action: "control-plane.diagnose", payload: {} });
        if (options.failDiagnostics) throw options.failDiagnostics;
        return state.diagnostics;
      }
    }
  };

  return client;
}

export function createMockChipsEnvironment(options = {}) {
  const client = options.client || createMockChipsClient(options);
  const launchContext = client.state?.launchContext || null;
  const surface = launchContext?.surfaceContext || null;
  return {
    client,
    initialTheme: options.initialTheme || client.state?.theme || null,
    initialLocale: options.initialLocale || client.state?.locale,
    initialLaunchContext: launchContext,
    initialSurface: options.initialSurface || surface,
    initialPermissions: options.initialPermissions || surface?.permissions || [],
    initialDiagnostics: options.initialDiagnostics || []
  };
}

import { createAndExposeBridgeForKernel, type BridgeContextOptions } from './create-bridge';

const CHIPS_BRIDGE_CONTEXT_ARG_PREFIX = '--chips-bridge-context=';

const parseBridgeContext = (): BridgeContextOptions => {
  const targetArg = process.argv.find((value) => value.startsWith(CHIPS_BRIDGE_CONTEXT_ARG_PREFIX));
  if (!targetArg) {
    return {
      callerId: 'plugin-preload',
      callerType: 'plugin',
      permissions: []
    };
  }

  try {
    const encoded = targetArg.slice(CHIPS_BRIDGE_CONTEXT_ARG_PREFIX.length);
    const decoded = Buffer.from(encoded, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded) as {
      pluginId?: unknown;
      permissions?: unknown;
    };

    return {
      callerId: 'plugin-preload',
      callerType: 'plugin',
      pluginId: typeof parsed.pluginId === 'string' ? parsed.pluginId : undefined,
      permissions: Array.isArray(parsed.permissions)
        ? parsed.permissions.filter((item): item is string => typeof item === 'string')
        : []
    };
  } catch {
    return {
      callerId: 'plugin-preload',
      callerType: 'plugin',
      permissions: []
    };
  }
};

const THEME_STYLE_ELEMENT_ID = 'chips-plugin-theme-style';
const THEME_ID_ATTRIBUTE = 'data-chips-theme-id';
const THEME_VERSION_ATTRIBUTE = 'data-chips-theme-version';

const getDomGlobals = (): { document?: any; window?: any } => {
  return globalThis as { document?: any; window?: any };
};

const applyThemeVariables = (target: any, variables: Record<string, unknown>): void => {
  for (const [tokenKey, tokenValue] of Object.entries(variables)) {
    if (typeof tokenValue !== 'string' && typeof tokenValue !== 'number') {
      continue;
    }
    target.style.setProperty(`--${tokenKey.replaceAll('.', '-')}`, String(tokenValue));
  }
};

const ensureThemeStyleElement = (documentRef: any): any => {
  const existing = documentRef.getElementById(THEME_STYLE_ELEMENT_ID);
  if (existing && typeof existing.tagName === 'string' && existing.tagName.toLowerCase() === 'style') {
    return existing;
  }

  const styleEl = documentRef.createElement('style');
  styleEl.id = THEME_STYLE_ELEMENT_ID;
  documentRef.head.appendChild(styleEl);
  return styleEl;
};

const bridge = createAndExposeBridgeForKernel(null, parseBridgeContext());

const syncThemeToDocument = async (): Promise<void> => {
  const { document, window } = getDomGlobals();
  if (!document || !window) {
    return;
  }

  const [current, cssResult, resolved] = await Promise.all([
    bridge.invoke<{ themeId: string; displayName: string; version: string }>('theme.getCurrent', {}),
    bridge.invoke<{ css: string; themeId: string }>('theme.getAllCss', {}),
    bridge.invoke<{
      resolved: Array<{ id: string; displayName: string; order: number }>;
      tokens: Record<string, unknown>;
    }>('theme.resolve', { chain: [] })
  ]);

  const root = document.documentElement;
  const styleEl = ensureThemeStyleElement(document);
  styleEl.textContent = cssResult.css;
  root.setAttribute(THEME_ID_ATTRIBUTE, current.themeId);
  root.setAttribute(THEME_VERSION_ATTRIBUTE, current.version);
  applyThemeVariables(root, resolved.tokens);
};

const bootThemeRuntime = (): void => {
  const { document, window } = getDomGlobals();
  if (!document || !window) {
    return;
  }

  let refreshPromise: Promise<void> | null = null;

  const refresh = () => {
    if (!refreshPromise) {
      refreshPromise = syncThemeToDocument().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  };

  const onReady = () => {
    void refresh();
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }

  bridge.on('theme.changed', () => {
    void refresh();
  });
};

bootThemeRuntime();

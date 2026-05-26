import type { PlatformLaunchContext } from './create-bridge';

type CommandScopeKind = 'global' | 'app' | 'scene' | 'surface' | 'document';
type CommandSource = 'menu' | 'toolbar' | 'shortcut' | 'palette' | 'context-menu' | 'api';

interface CommandCondition {
  key: string;
  equals?: unknown;
  notEquals?: unknown;
  in?: unknown[];
  truthy?: boolean;
}

interface CommandScope {
  kind: CommandScopeKind;
  appId?: string;
  sceneId?: string;
  surfaceId?: string;
  documentId?: string;
}

interface CommandShortcut {
  accelerator: string;
  platform?: string;
  when?: boolean | CommandCondition;
  preventDefault?: boolean;
}

interface CommandDiagnostic {
  visible: boolean;
  enabled: boolean;
}

interface CommandView {
  commandId: string;
  shortcut: CommandShortcut[];
  scope: CommandScope;
  ownerPluginId?: string;
  diagnostic?: CommandDiagnostic;
}

interface CommandListResult {
  commands: CommandView[];
}

interface CommandInvocationContext {
  pluginId?: string;
  sceneId?: string;
  surfaceId?: string;
  documentId?: string;
  data?: Record<string, unknown>;
}

interface ShortcutRuntimeBridge {
  invoke<T = unknown>(action: string, payload: unknown): Promise<T>;
  on?(event: string, handler: (payload: unknown) => void): () => void;
}

interface ShortcutKeyboardEvent {
  altKey: boolean;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  isComposing: boolean;
  key: string;
  metaKey: boolean;
  preventDefault(): void;
  repeat: boolean;
  shiftKey: boolean;
  stopPropagation(): void;
  target?: unknown;
  composedPath?: () => unknown[];
}

interface ShortcutEventTarget {
  addEventListener(event: 'keydown', handler: (event: ShortcutKeyboardEvent) => void, options?: boolean): void;
  removeEventListener(event: 'keydown', handler: (event: ShortcutKeyboardEvent) => void, options?: boolean): void;
}

interface ShortcutDocument {}

interface ShortcutNavigator {
  platform?: string;
}

interface ShortcutElementLike {
  getAttribute?: (name: string) => string | null;
  isContentEditable?: boolean;
  tagName?: string;
  type?: string;
}

interface ShortcutRuntimeGlobals {
  window?: ShortcutEventTarget;
  document?: ShortcutDocument;
  navigator?: ShortcutNavigator;
}

interface ShortcutMatch {
  command: CommandView;
  shortcut: CommandShortcut;
}

const SHORTCUT_REFRESH_EVENTS = ['command.registered', 'command.changed', 'command.unregistered'] as const;

const TEXT_INPUT_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week'
]);

const EDITABLE_ROLES = new Set(['combobox', 'searchbox', 'spinbutton', 'textbox']);

const resolveShortcutPluginId = (launchContext: PlatformLaunchContext): string | undefined =>
  launchContext.pluginId ?? launchContext.surfaceContext?.pluginId;

const resolveShortcutSceneId = (launchContext: PlatformLaunchContext): string | undefined =>
  launchContext.sceneId ?? launchContext.surfaceContext?.sceneId;

const resolveShortcutSurfaceId = (launchContext: PlatformLaunchContext): string | undefined =>
  launchContext.surfaceId ?? launchContext.surfaceContext?.surfaceId;

const resolveShortcutDocumentId = (launchContext: PlatformLaunchContext): string | undefined =>
  launchContext.surfaceContext?.documentContext?.documentId;

const isApplePlatform = (navigatorRef?: ShortcutNavigator): boolean => {
  const platform = navigatorRef?.platform?.toLowerCase().trim();
  if (platform) {
    return /mac|iphone|ipad/.test(platform);
  }
  return typeof process !== 'undefined' && process.platform === 'darwin';
};

const normalizeShortcutToken = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, '');

const normalizeEventKey = (key: string): string => {
  const normalized = key.length === 1 ? key.toLowerCase() : normalizeShortcutToken(key);
  if (normalized === ' ') {
    return 'space';
  }
  if (normalized === 'esc') {
    return 'escape';
  }
  if (normalized === 'return') {
    return 'enter';
  }
  if (normalized === 'arrowup') {
    return 'up';
  }
  if (normalized === 'arrowdown') {
    return 'down';
  }
  if (normalized === 'arrowleft') {
    return 'left';
  }
  if (normalized === 'arrowright') {
    return 'right';
  }
  return normalized;
};

const normalizeAcceleratorKey = (token: string): string => {
  const normalized = normalizeShortcutToken(token);
  if (normalized === 'space' || normalized === 'spacebar') {
    return 'space';
  }
  if (normalized === 'esc') {
    return 'escape';
  }
  if (normalized === 'return') {
    return 'enter';
  }
  if (normalized === 'comma') {
    return ',';
  }
  if (normalized === 'period') {
    return '.';
  }
  if (normalized === 'plus') {
    return '+';
  }
  if (normalized === 'minus') {
    return '-';
  }
  if (normalized === 'equal') {
    return '=';
  }
  if (normalized === 'slash') {
    return '/';
  }
  if (normalized === 'backslash') {
    return '\\';
  }
  if (normalized === 'quote') {
    return "'";
  }
  if (normalized === 'semicolon') {
    return ';';
  }
  if (normalized === 'leftbracket') {
    return '[';
  }
  if (normalized === 'rightbracket') {
    return ']';
  }
  if (normalized === 'arrowup') {
    return 'up';
  }
  if (normalized === 'arrowdown') {
    return 'down';
  }
  if (normalized === 'arrowleft') {
    return 'left';
  }
  if (normalized === 'arrowright') {
    return 'right';
  }
  return normalized;
};

const splitAccelerator = (accelerator: string): string[] => {
  const trimmed = accelerator.trim();
  if (trimmed.endsWith('++')) {
    return [...trimmed.slice(0, -1).split('+'), '+'].filter((item) => item.length > 0);
  }
  return trimmed.split('+').filter((item) => item.length > 0);
};

export const matchesCommandAccelerator = (
  accelerator: string,
  event: ShortcutKeyboardEvent,
  navigatorRef?: ShortcutNavigator
): boolean => {
  const tokens = splitAccelerator(accelerator);
  if (tokens.length === 0 || event.key === 'Process' || event.key === 'Dead') {
    return false;
  }

  const expected = {
    alt: false,
    ctrl: false,
    meta: false,
    shift: false
  };
  let expectedKey: string | null = null;
  const useMetaForMod = isApplePlatform(navigatorRef);

  for (const token of tokens) {
    const normalized = normalizeShortcutToken(token);
    if (normalized === 'mod' || normalized === 'commandorcontrol' || normalized === 'cmdorctrl') {
      if (useMetaForMod) {
        expected.meta = true;
      } else {
        expected.ctrl = true;
      }
      continue;
    }
    if (normalized === 'cmd' || normalized === 'command' || normalized === 'meta' || normalized === 'super') {
      expected.meta = true;
      continue;
    }
    if (normalized === 'ctrl' || normalized === 'control') {
      expected.ctrl = true;
      continue;
    }
    if (normalized === 'alt' || normalized === 'option') {
      expected.alt = true;
      continue;
    }
    if (normalized === 'shift') {
      expected.shift = true;
      continue;
    }
    expectedKey = normalizeAcceleratorKey(token);
  }

  if (!expectedKey) {
    return false;
  }

  return (
    event.altKey === expected.alt &&
    event.ctrlKey === expected.ctrl &&
    event.metaKey === expected.meta &&
    event.shiftKey === expected.shift &&
    normalizeEventKey(event.key) === expectedKey
  );
};

const isEditableElement = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const element = value as ShortcutElementLike;
  const tagName = typeof element.tagName === 'string' ? element.tagName.toLowerCase() : '';
  if (tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (tagName === 'input') {
    const inputType = (element.type || 'text').toLowerCase();
    return TEXT_INPUT_TYPES.has(inputType);
  }
  if (element.isContentEditable) {
    return true;
  }
  const role = typeof element.getAttribute === 'function' ? element.getAttribute('role') : null;
  return Boolean(role && EDITABLE_ROLES.has(role.toLowerCase()));
};

export const isEditableShortcutEvent = (event: ShortcutKeyboardEvent): boolean => {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  if (path.some((entry) => isEditableElement(entry))) {
    return true;
  }
  return isEditableElement(event.target);
};

const evaluateShortcutCondition = (
  condition: boolean | CommandCondition | undefined,
  context: CommandInvocationContext
): boolean => {
  if (typeof condition === 'undefined') {
    return true;
  }
  if (typeof condition === 'boolean') {
    return condition;
  }
  const actual = context.data?.[condition.key];
  if (typeof condition.equals !== 'undefined' && actual !== condition.equals) {
    return false;
  }
  if (typeof condition.notEquals !== 'undefined' && actual === condition.notEquals) {
    return false;
  }
  if (condition.in && !condition.in.some((item) => item === actual)) {
    return false;
  }
  if (typeof condition.truthy === 'boolean' && Boolean(actual) !== condition.truthy) {
    return false;
  }
  return true;
};

const buildShortcutContext = (
  launchContext: PlatformLaunchContext,
  data?: Record<string, unknown>
): CommandInvocationContext => {
  const context: CommandInvocationContext = {};
  const pluginId = resolveShortcutPluginId(launchContext);
  const sceneId = resolveShortcutSceneId(launchContext);
  const surfaceId = resolveShortcutSurfaceId(launchContext);
  const documentId = resolveShortcutDocumentId(launchContext);
  if (pluginId) {
    context.pluginId = pluginId;
  }
  if (sceneId) {
    context.sceneId = sceneId;
  }
  if (surfaceId) {
    context.surfaceId = surfaceId;
  }
  if (documentId) {
    context.documentId = documentId;
  }
  if (data && Object.keys(data).length > 0) {
    context.data = data;
  }
  return context;
};

const commandBelongsToLaunchContext = (
  command: CommandView,
  launchContext: PlatformLaunchContext
): boolean => {
  const pluginId = resolveShortcutPluginId(launchContext);
  const sceneId = resolveShortcutSceneId(launchContext);
  const surfaceId = resolveShortcutSurfaceId(launchContext);
  const documentId = resolveShortcutDocumentId(launchContext);

  if (command.ownerPluginId && pluginId && command.ownerPluginId !== pluginId) {
    return false;
  }

  if (command.scope.kind === 'global') {
    return true;
  }
  if (command.scope.kind === 'app') {
    return Boolean(pluginId && command.scope.appId === pluginId);
  }
  if (command.scope.kind === 'scene') {
    return Boolean(sceneId && command.scope.sceneId === sceneId);
  }
  if (command.scope.kind === 'surface') {
    return Boolean(surfaceId && command.scope.surfaceId === surfaceId);
  }
  if (command.scope.kind === 'document') {
    return Boolean(documentId && command.scope.documentId === documentId);
  }
  return false;
};

const shortcutMatchesCurrentHost = (shortcut: CommandShortcut): boolean =>
  !shortcut.platform || shortcut.platform === 'all' || shortcut.platform === 'desktop';

const scopeSpecificity = (command: CommandView): number => {
  if (command.scope.kind === 'document') {
    return 5;
  }
  if (command.scope.kind === 'surface') {
    return 4;
  }
  if (command.scope.kind === 'scene') {
    return 3;
  }
  if (command.scope.kind === 'app') {
    return 2;
  }
  return 1;
};

const sortShortcutMatches = (left: ShortcutMatch, right: ShortcutMatch): number => {
  const specificity = scopeSpecificity(right.command) - scopeSpecificity(left.command);
  if (specificity !== 0) {
    return specificity;
  }
  return left.command.commandId.localeCompare(right.command.commandId);
};

const findShortcutMatch = (
  commands: CommandView[],
  event: ShortcutKeyboardEvent,
  launchContext: PlatformLaunchContext,
  navigatorRef: ShortcutNavigator | undefined,
  context: CommandInvocationContext
): ShortcutMatch | null => {
  const matches: ShortcutMatch[] = [];
  for (const command of commands) {
    if (!command.diagnostic?.visible || !command.diagnostic.enabled) {
      continue;
    }
    if (!commandBelongsToLaunchContext(command, launchContext)) {
      continue;
    }
    for (const shortcut of command.shortcut) {
      if (!shortcutMatchesCurrentHost(shortcut)) {
        continue;
      }
      if (!evaluateShortcutCondition(shortcut.when, context)) {
        continue;
      }
      if (matchesCommandAccelerator(shortcut.accelerator, event, navigatorRef)) {
        matches.push({ command, shortcut });
      }
    }
  }
  return matches.sort(sortShortcutMatches)[0] ?? null;
};

const normalizeCommandListResult = (value: unknown): CommandView[] => {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const commands = (value as Partial<CommandListResult>).commands;
  if (!Array.isArray(commands)) {
    return [];
  }
  return commands.filter((command): command is CommandView => {
    if (!command || typeof command !== 'object') {
      return false;
    }
    return (
      typeof command.commandId === 'string' &&
      Array.isArray(command.shortcut) &&
      Boolean(command.scope) &&
      typeof command.scope.kind === 'string'
    );
  });
};

export const bootCommandShortcutRuntime = (
  bridge: ShortcutRuntimeBridge,
  launchContext: PlatformLaunchContext,
  globals: ShortcutRuntimeGlobals = globalThis as ShortcutRuntimeGlobals
): (() => void) => {
  const windowRef = globals.window;
  const documentRef = globals.document;
  if (!windowRef || !documentRef) {
    return () => undefined;
  }

  let disposed = false;
  let commands: CommandView[] = [];
  let refreshPromise: Promise<void> | null = null;
  const shortcutContext = () => buildShortcutContext(launchContext, { editable: false });

  const refresh = (): Promise<void> => {
    if (refreshPromise) {
      return refreshPromise;
    }
    refreshPromise = bridge
      .invoke<CommandListResult>('command.list', {
        includeDisabled: true,
        includeHidden: false,
        context: shortcutContext()
      })
      .then((result) => {
        if (!disposed) {
          commands = normalizeCommandListResult(result).filter((command) =>
            commandBelongsToLaunchContext(command, launchContext)
          );
        }
      })
      .catch(() => {
        if (!disposed) {
          commands = [];
        }
      })
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  };

  const invokeShortcut = (match: ShortcutMatch): void => {
    void bridge
      .invoke('command.invoke', {
        commandId: match.command.commandId,
        source: 'shortcut' satisfies CommandSource,
        payload: {
          accelerator: match.shortcut.accelerator
        },
        context: shortcutContext()
      })
      .catch(() => {
        void refresh();
      });
  };

  const handleKeyDown = (event: ShortcutKeyboardEvent): void => {
    if (event.defaultPrevented || event.repeat || event.isComposing) {
      return;
    }
    if (isEditableShortcutEvent(event)) {
      return;
    }

    const context = shortcutContext();
    const match = findShortcutMatch(commands, event, launchContext, globals.navigator, context);
    if (!match) {
      return;
    }

    if (match.shortcut.preventDefault !== false) {
      event.preventDefault();
      event.stopPropagation();
    }
    invokeShortcut(match);
  };

  windowRef.addEventListener('keydown', handleKeyDown, true);
  void refresh();

  const disposers = SHORTCUT_REFRESH_EVENTS.map((eventName) => {
    if (typeof bridge.on !== 'function') {
      return () => undefined;
    }
    return bridge.on(eventName, () => {
      void refresh();
    });
  });

  return () => {
    disposed = true;
    windowRef.removeEventListener('keydown', handleKeyDown, true);
    for (const dispose of disposers) {
      dispose();
    }
  };
};

import { createError } from './errors';

export type WindowChromeTitleBarStyle = 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';
export type PluginSurfaceKind = 'window' | 'tab' | 'route' | 'modal' | 'sheet' | 'fullscreen';
export type PluginRuntimeTargetId = 'desktop' | 'web' | 'mobile' | 'headless';

export interface WindowChromeOverlayOptions {
  color?: string;
  symbolColor?: string;
  height?: number;
}

export interface WindowChromeOptions {
  frame?: boolean;
  transparent?: boolean;
  backgroundColor?: string;
  titleBarStyle?: WindowChromeTitleBarStyle;
  titleBarOverlay?: boolean | WindowChromeOverlayOptions;
}

export interface PluginWindowUiConfig {
  chrome?: WindowChromeOptions;
}

export interface PluginLauncherUiConfig {
  displayName?: string;
  icon?: string;
}

export interface PluginSurfaceUiConfig {
  defaultKind?: PluginSurfaceKind;
  preferredKinds?: Partial<Record<PluginRuntimeTargetId, PluginSurfaceKind>>;
}

export interface PluginUiConfig {
  window?: PluginWindowUiConfig;
  launcher?: PluginLauncherUiConfig;
  surface?: PluginSurfaceUiConfig;
}

const titleBarStyles: WindowChromeTitleBarStyle[] = ['default', 'hidden', 'hiddenInset', 'customButtonsOnHover'];
const surfaceKinds: PluginSurfaceKind[] = ['window', 'tab', 'route', 'modal', 'sheet', 'fullscreen'];
const runtimeTargetIds: PluginRuntimeTargetId[] = ['desktop', 'web', 'mobile', 'headless'];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const asNonEmptyString = (
  value: unknown,
  manifestPath: string,
  field: string
): string | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createError('PLUGIN_INVALID', `${field} must be a non-empty string`, {
      manifestPath,
      field
    });
  }
  return value.trim();
};

const asOptionalBoolean = (
  value: unknown,
  manifestPath: string,
  field: string
): boolean | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw createError('PLUGIN_INVALID', `${field} must be a boolean`, {
      manifestPath,
      field
    });
  }
  return value;
};

const asOptionalNumber = (
  value: unknown,
  manifestPath: string,
  field: string
): number | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw createError('PLUGIN_INVALID', `${field} must be a non-negative number`, {
      manifestPath,
      field
    });
  }
  return value;
};

const parseWindowChromeOverlay = (
  value: unknown,
  manifestPath: string,
  field: string
): boolean | WindowChromeOverlayOptions | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (!isRecord(value)) {
    throw createError('PLUGIN_INVALID', `${field} must be a boolean or object`, {
      manifestPath,
      field
    });
  }

  const overlay: WindowChromeOverlayOptions = {};
  const color = asNonEmptyString(value.color, manifestPath, `${field}.color`);
  const symbolColor = asNonEmptyString(value.symbolColor, manifestPath, `${field}.symbolColor`);
  const height = asOptionalNumber(value.height, manifestPath, `${field}.height`);

  if (color) {
    overlay.color = color;
  }
  if (symbolColor) {
    overlay.symbolColor = symbolColor;
  }
  if (typeof height === 'number') {
    overlay.height = height;
  }

  return Object.keys(overlay).length > 0 ? overlay : true;
};

export const cloneWindowChromeOptions = (chrome: WindowChromeOptions | undefined): WindowChromeOptions | undefined => {
  if (!chrome) {
    return undefined;
  }

  return {
    ...chrome,
    titleBarOverlay:
      chrome.titleBarOverlay && typeof chrome.titleBarOverlay === 'object'
        ? { ...chrome.titleBarOverlay }
        : chrome.titleBarOverlay
  };
};

const clonePluginSurfaceUiConfig = (surface: PluginSurfaceUiConfig | undefined): PluginSurfaceUiConfig | undefined => {
  if (!surface) {
    return undefined;
  }

  return {
    defaultKind: surface.defaultKind,
    preferredKinds: surface.preferredKinds ? { ...surface.preferredKinds } : undefined
  };
};

export const parseWindowChromeOptions = (
  value: unknown,
  manifestPath: string,
  field = 'ui.window.chrome'
): WindowChromeOptions | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (!isRecord(value)) {
    throw createError('PLUGIN_INVALID', `${field} must be an object`, {
      manifestPath,
      field
    });
  }

  const chrome: WindowChromeOptions = {};
  const frame = asOptionalBoolean(value.frame, manifestPath, `${field}.frame`);
  const transparent = asOptionalBoolean(value.transparent, manifestPath, `${field}.transparent`);
  const backgroundColor = asNonEmptyString(value.backgroundColor, manifestPath, `${field}.backgroundColor`);
  const titleBarStyle = asNonEmptyString(value.titleBarStyle, manifestPath, `${field}.titleBarStyle`);
  const titleBarOverlay = parseWindowChromeOverlay(value.titleBarOverlay, manifestPath, `${field}.titleBarOverlay`);

  if (typeof frame === 'boolean') {
    chrome.frame = frame;
  }
  if (typeof transparent === 'boolean') {
    chrome.transparent = transparent;
  }
  if (backgroundColor) {
    chrome.backgroundColor = backgroundColor;
  }
  if (titleBarStyle) {
    if (!titleBarStyles.includes(titleBarStyle as WindowChromeTitleBarStyle)) {
      throw createError('PLUGIN_INVALID', `${field}.titleBarStyle is invalid`, {
        manifestPath,
        field: `${field}.titleBarStyle`,
        value: titleBarStyle
      });
    }
    chrome.titleBarStyle = titleBarStyle as WindowChromeTitleBarStyle;
  }
  if (typeof titleBarOverlay !== 'undefined') {
    chrome.titleBarOverlay = titleBarOverlay;
  }

  return Object.keys(chrome).length > 0 ? chrome : undefined;
};

export const parsePluginUiConfig = (value: unknown, manifestPath: string): PluginUiConfig | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (!isRecord(value)) {
    throw createError('PLUGIN_INVALID', 'ui must be an object', {
      manifestPath,
      field: 'ui'
    });
  }

  const window = isRecord(value.window)
    ? {
        chrome: parseWindowChromeOptions(value.window.chrome, manifestPath)
      }
    : typeof value.window === 'undefined'
      ? undefined
      : (() => {
          throw createError('PLUGIN_INVALID', 'ui.window must be an object', {
            manifestPath,
            field: 'ui.window'
          });
        })();

  const launcher = isRecord(value.launcher)
    ? {
        displayName: asNonEmptyString(value.launcher.displayName, manifestPath, 'ui.launcher.displayName'),
        icon: asNonEmptyString(value.launcher.icon, manifestPath, 'ui.launcher.icon')
      }
    : typeof value.launcher === 'undefined'
      ? undefined
      : (() => {
          throw createError('PLUGIN_INVALID', 'ui.launcher must be an object', {
            manifestPath,
            field: 'ui.launcher'
          });
        })();

  const surface = isRecord(value.surface)
    ? (() => {
        const defaultKind = asNonEmptyString(value.surface.defaultKind, manifestPath, 'ui.surface.defaultKind');
        if (defaultKind && !surfaceKinds.includes(defaultKind as PluginSurfaceKind)) {
          throw createError('PLUGIN_INVALID', 'ui.surface.defaultKind is invalid', {
            manifestPath,
            field: 'ui.surface.defaultKind',
            value: defaultKind
          });
        }

        const preferredKindsValue = value.surface.preferredKinds;
        if (typeof preferredKindsValue !== 'undefined' && !isRecord(preferredKindsValue)) {
          throw createError('PLUGIN_INVALID', 'ui.surface.preferredKinds must be an object', {
            manifestPath,
            field: 'ui.surface.preferredKinds'
          });
        }

        const preferredKinds: Partial<Record<PluginRuntimeTargetId, PluginSurfaceKind>> = {};
        if (isRecord(preferredKindsValue)) {
          for (const [targetId, targetKindValue] of Object.entries(preferredKindsValue)) {
            if (!runtimeTargetIds.includes(targetId as PluginRuntimeTargetId)) {
              throw createError('PLUGIN_INVALID', `ui.surface.preferredKinds.${targetId} is invalid`, {
                manifestPath,
                field: `ui.surface.preferredKinds.${targetId}`,
                value: targetId
              });
            }
            const targetKind = asNonEmptyString(
              targetKindValue,
              manifestPath,
              `ui.surface.preferredKinds.${targetId}`
            );
            if (!targetKind || !surfaceKinds.includes(targetKind as PluginSurfaceKind)) {
              throw createError('PLUGIN_INVALID', `ui.surface.preferredKinds.${targetId} must be a valid surface kind`, {
                manifestPath,
                field: `ui.surface.preferredKinds.${targetId}`,
                value: targetKindValue
              });
            }
            preferredKinds[targetId as PluginRuntimeTargetId] = targetKind as PluginSurfaceKind;
          }
        }

        if (!defaultKind && Object.keys(preferredKinds).length === 0) {
          return undefined;
        }

        return {
          defaultKind: defaultKind as PluginSurfaceKind | undefined,
          preferredKinds: Object.keys(preferredKinds).length > 0 ? preferredKinds : undefined
        };
      })()
    : typeof value.surface === 'undefined'
      ? undefined
      : (() => {
          throw createError('PLUGIN_INVALID', 'ui.surface must be an object', {
            manifestPath,
            field: 'ui.surface'
          });
        })();

  if (!window?.chrome && !launcher && !surface) {
    return undefined;
  }

  return {
    window: window?.chrome
      ? {
          chrome: cloneWindowChromeOptions(window.chrome)
        }
      : undefined,
    launcher:
      launcher && (launcher.displayName || launcher.icon)
        ? {
            displayName: launcher.displayName,
            icon: launcher.icon
          }
        : undefined,
    surface: clonePluginSurfaceUiConfig(surface)
  };
};

export const resolveManifestWindowChrome = (ui: PluginUiConfig | undefined): WindowChromeOptions | undefined => {
  return cloneWindowChromeOptions(ui?.window?.chrome);
};

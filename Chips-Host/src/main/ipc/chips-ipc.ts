import { createError, toStandardError } from '../../shared/errors';
import { createId, now } from '../../shared/utils';
import type { RouteInvocationContext } from '../../shared/types';
import type { Kernel } from '../../../packages/kernel/src';
import { loadElectronModule } from '../electron/electron-loader';

export const CHIPS_INVOKE_CHANNEL = 'chips:invoke';
export const CHIPS_EMIT_CHANNEL = 'chips:emit';
export const CHIPS_EVENT_CHANNEL_PREFIX = 'chips:event:';
export const CHIPS_WINDOW_CHANNEL_PREFIX = 'chips:window:';
export const CHIPS_DIALOG_CHANNEL_PREFIX = 'chips:dialog:';
export const CHIPS_PLUGIN_CHANNEL_PREFIX = 'chips:plugin:';
export const CHIPS_CLIPBOARD_CHANNEL_PREFIX = 'chips:clipboard:';
export const CHIPS_SHELL_CHANNEL_PREFIX = 'chips:shell:';
export const CHIPS_PLATFORM_CHANNEL_PREFIX = 'chips:platform:';
export const CHIPS_IPC_ERROR_PREFIX = '__chips_ipc_error__:';

export interface ChipsInvokeRequest {
  action: string;
  payload?: unknown;
  context?: Partial<RouteInvocationContext>;
}

export interface ChipsIpcBinding {
  active: boolean;
  dispose(): void;
}

interface BroadcastEventPayload {
  event: string;
  data: unknown;
}

interface ChipsSubchannelRequest {
  payload?: unknown;
  context?: Partial<RouteInvocationContext>;
}

const CHIPS_SUBCHANNEL_ACTIONS: Record<string, string> = {
  [`${CHIPS_WINDOW_CHANNEL_PREFIX}open`]: 'window.open',
  [`${CHIPS_WINDOW_CHANNEL_PREFIX}focus`]: 'window.focus',
  [`${CHIPS_WINDOW_CHANNEL_PREFIX}resize`]: 'window.resize',
  [`${CHIPS_WINDOW_CHANNEL_PREFIX}setState`]: 'window.setState',
  [`${CHIPS_WINDOW_CHANNEL_PREFIX}getState`]: 'window.getState',
  [`${CHIPS_WINDOW_CHANNEL_PREFIX}close`]: 'window.close',
  [`${CHIPS_DIALOG_CHANNEL_PREFIX}openFile`]: 'platform.dialogOpenFile',
  [`${CHIPS_DIALOG_CHANNEL_PREFIX}saveFile`]: 'platform.dialogSaveFile',
  [`${CHIPS_DIALOG_CHANNEL_PREFIX}showMessage`]: 'platform.dialogShowMessage',
  [`${CHIPS_DIALOG_CHANNEL_PREFIX}showConfirm`]: 'platform.dialogShowConfirm',
  [`${CHIPS_PLUGIN_CHANNEL_PREFIX}install`]: 'plugin.install',
  [`${CHIPS_PLUGIN_CHANNEL_PREFIX}enable`]: 'plugin.enable',
  [`${CHIPS_PLUGIN_CHANNEL_PREFIX}disable`]: 'plugin.disable',
  [`${CHIPS_PLUGIN_CHANNEL_PREFIX}uninstall`]: 'plugin.uninstall',
  [`${CHIPS_PLUGIN_CHANNEL_PREFIX}query`]: 'plugin.query',
  [`${CHIPS_CLIPBOARD_CHANNEL_PREFIX}read`]: 'platform.clipboardRead',
  [`${CHIPS_CLIPBOARD_CHANNEL_PREFIX}write`]: 'platform.clipboardWrite',
  [`${CHIPS_SHELL_CHANNEL_PREFIX}openPath`]: 'platform.shellOpenPath',
  [`${CHIPS_SHELL_CHANNEL_PREFIX}openExternal`]: 'platform.shellOpenExternal',
  [`${CHIPS_SHELL_CHANNEL_PREFIX}showItemInFolder`]: 'platform.shellShowItemInFolder',
  [`${CHIPS_PLATFORM_CHANNEL_PREFIX}getInfo`]: 'platform.getInfo',
  [`${CHIPS_PLATFORM_CHANNEL_PREFIX}getCapabilities`]: 'platform.getCapabilities',
  [`${CHIPS_PLATFORM_CHANNEL_PREFIX}getScreenInfo`]: 'platform.getScreenInfo',
  [`${CHIPS_PLATFORM_CHANNEL_PREFIX}listScreens`]: 'platform.listScreens'
};

const buildContext = (input: Partial<RouteInvocationContext> | undefined, event: unknown): RouteInvocationContext => {
  const senderInfo = event as { sender?: unknown };
  const sender = senderInfo.sender as { id?: number } | undefined;
  return {
    requestId: typeof input?.requestId === 'string' ? input.requestId : createId(),
    caller: {
      id: typeof input?.caller?.id === 'string' ? input.caller.id : 'ipc-renderer',
      type: input?.caller?.type ?? 'plugin',
      pluginId: input?.caller?.pluginId,
      windowId: input?.caller?.windowId ?? (typeof sender?.id === 'number' ? String(sender.id) : undefined),
      permissions: input?.caller?.permissions
    },
    timestamp: typeof input?.timestamp === 'number' ? input.timestamp : now(),
    deadline: input?.deadline
  };
};

const forwardKernelEvents = (kernel: Kernel): (() => void) => {
  const electron = loadElectronModule();
  if (!electron?.BrowserWindow?.getAllWindows) {
    return () => {};
  }

  return kernel.events.on('*', async (payload) => {
    const windows = electron.BrowserWindow?.getAllWindows?.() ?? [];
    const channel = `${CHIPS_EVENT_CHANNEL_PREFIX}${payload.name}`;
    const eventPayload: BroadcastEventPayload = {
      event: payload.name,
      data: payload.data
    };
    for (const window of windows) {
      if (window.isDestroyed()) {
        continue;
      }
      window.webContents.send(channel, eventPayload.data);
    }
  });
};

const encodeIpcError = (error: unknown): Error => {
  const standard = toStandardError(error);
  return new Error(`${CHIPS_IPC_ERROR_PREFIX}${JSON.stringify(standard)}`);
};

export const bindKernelToElectronIpc = (
  kernel: Kernel,
  options?: {
    getPluginQuota?: (pluginId: string) => { messageRateBudget: number } | null | undefined;
  }
): ChipsIpcBinding => {
  const electron = loadElectronModule();
  if (!electron?.ipcMain) {
    return {
      active: false,
      dispose() {}
    };
  }

  interface PluginUsageWindow {
    windowStart: number;
    messages: number;
  }

  const usageByPlugin = new Map<string, PluginUsageWindow>();
  const quotaWindowMs = 1_000;

  const enforcePluginQuota = (context: RouteInvocationContext, action: string): void => {
    if (!options?.getPluginQuota) {
      return;
    }

    const caller = context.caller;
    const pluginId = caller.type === 'plugin' ? caller.pluginId : undefined;
    if (!pluginId) {
      return;
    }

    const quota = options.getPluginQuota(pluginId) ?? undefined;
    const budget = quota?.messageRateBudget ?? 0;
    if (budget <= 0) {
      // 非正配额视为不启用配额限制
      return;
    }

    const nowMs = now();
    const current = usageByPlugin.get(pluginId);
    const withinWindow = current && nowMs - current.windowStart < quotaWindowMs;
    const nextWindow = withinWindow
      ? { windowStart: current.windowStart, messages: current.messages + 1 }
      : { windowStart: nowMs, messages: 1 };

    if (nextWindow.messages > budget) {
      throw createError(
        'PLUGIN_QUOTA_EXCEEDED',
        `Plugin message rate quota exceeded for ${pluginId}`,
        {
          pluginId,
          action,
          windowMs: quotaWindowMs,
          messageRateBudget: budget
        },
        true
      );
    }

    usageByPlugin.set(pluginId, nextWindow);
  };

  const invokeHandler = async (event: unknown, request: unknown): Promise<unknown> => {
    try {
      if (!request || typeof request !== 'object') {
        throw createError('BRIDGE_INVALID_REQUEST', 'chips:invoke payload must be object');
      }
      const typed = request as Record<string, unknown>;
      if (typeof typed.action !== 'string' || typed.action.length === 0) {
        throw createError('BRIDGE_INVALID_REQUEST', 'chips:invoke requires action');
      }
      const context = buildContext(typed.context as Partial<RouteInvocationContext> | undefined, event);
      enforcePluginQuota(context, typed.action);
      return await kernel.invoke(typed.action, typed.payload ?? {}, context);
    } catch (error) {
      throw encodeIpcError(error);
    }
  };

  const emitHandler = async (event: unknown, payload: unknown): Promise<void> => {
    const data = payload as Record<string, unknown>;
    if (!data || typeof data.event !== 'string') {
      return;
    }
    const senderInfo = event as { sender?: unknown };
    const sender = senderInfo.sender as { id?: number } | undefined;
    await kernel.events.emit(data.event, 'renderer', data.data, {
      windowId: typeof sender?.id === 'number' ? String(sender.id) : undefined
    });
  };

  electron.ipcMain.handle(CHIPS_INVOKE_CHANNEL, invokeHandler);
  for (const [channel, action] of Object.entries(CHIPS_SUBCHANNEL_ACTIONS)) {
    electron.ipcMain.handle(channel, async (event: unknown, request: unknown): Promise<unknown> => {
      try {
        const typed = (request ?? {}) as ChipsSubchannelRequest;
        const context = buildContext(typed.context, event);
        enforcePluginQuota(context, action);
        return await kernel.invoke(action, typed.payload ?? {}, context);
      } catch (error) {
        throw encodeIpcError(error);
      }
    });
  }
  electron.ipcMain.on(CHIPS_EMIT_CHANNEL, emitHandler);
  const offEventForward = forwardKernelEvents(kernel);

  return {
    active: true,
    dispose() {
      offEventForward();
      electron.ipcMain?.removeHandler(CHIPS_INVOKE_CHANNEL);
      for (const channel of Object.keys(CHIPS_SUBCHANNEL_ACTIONS)) {
        electron.ipcMain?.removeHandler(channel);
      }
      electron.ipcMain?.off(CHIPS_EMIT_CHANNEL, emitHandler);
    }
  };
};

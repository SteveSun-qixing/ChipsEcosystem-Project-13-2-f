import { createError } from '../../shared/errors';
import { createId, now } from '../../shared/utils';
import type { RouteInvocationContext } from '../../shared/types';
import type { Kernel } from '../../../packages/kernel/src';
import { loadElectronModule } from '../electron/electron-loader';

export const CHIPS_INVOKE_CHANNEL = 'chips:invoke';
export const CHIPS_EMIT_CHANNEL = 'chips:emit';
export const CHIPS_EVENT_CHANNEL_PREFIX = 'chips:event:';

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

export const bindKernelToElectronIpc = (kernel: Kernel): ChipsIpcBinding => {
  const electron = loadElectronModule();
  if (!electron?.ipcMain) {
    return {
      active: false,
      dispose() {}
    };
  }

  const invokeHandler = async (event: unknown, request: unknown): Promise<unknown> => {
    if (!request || typeof request !== 'object') {
      throw createError('BRIDGE_INVALID_REQUEST', 'chips:invoke payload must be object');
    }
    const typed = request as Record<string, unknown>;
    if (typeof typed.action !== 'string' || typed.action.length === 0) {
      throw createError('BRIDGE_INVALID_REQUEST', 'chips:invoke requires action');
    }
    const context = buildContext(typed.context as Partial<RouteInvocationContext> | undefined, event);
    return kernel.invoke(typed.action, typed.payload ?? {}, context);
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
  electron.ipcMain.on(CHIPS_EMIT_CHANNEL, emitHandler);
  const offEventForward = forwardKernelEvents(kernel);

  return {
    active: true,
    dispose() {
      offEventForward();
      electron.ipcMain?.removeHandler(CHIPS_INVOKE_CHANNEL);
      electron.ipcMain?.off(CHIPS_EMIT_CHANNEL, emitHandler);
    }
  };
};

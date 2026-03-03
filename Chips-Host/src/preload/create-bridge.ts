import type { Kernel } from '../../packages/kernel/src';
import type { RouteInvocationContext } from '../shared/types';
import { createId, now } from '../shared/utils';
import { BridgeTransport } from '../../packages/bridge-api/src';
import { loadElectronModule } from '../main/electron/electron-loader';
import { CHIPS_EMIT_CHANNEL, CHIPS_EVENT_CHANNEL_PREFIX, CHIPS_INVOKE_CHANNEL } from '../main/ipc/chips-ipc';

export interface BridgeContextOptions {
  callerId?: string;
  callerType?: RouteInvocationContext['caller']['type'];
  pluginId?: string;
  permissions?: string[];
}

export const HOST_INTERNAL_PERMISSIONS = [
  'file.read',
  'file.write',
  'resource.read',
  'config.read',
  'config.write',
  'theme.read',
  'theme.write',
  'i18n.read',
  'i18n.write',
  'window.control',
  'plugin.manage',
  'module.manage',
  'platform.read',
  'platform.external',
  'log.read',
  'log.write',
  'credential.manage',
  'card.read',
  'card.write',
  'box.pack',
  'box.read',
  'zip.manage',
  'serializer.use',
  'control.read',
  'control.write'
] as const;

const sanitizePermissions = (permissions: string[] | undefined): string[] => {
  if (!permissions) {
    return [];
  }
  return permissions.map((item) => item.trim()).filter((item) => item.length > 0);
};

const buildContext = (options?: BridgeContextOptions): RouteInvocationContext => {
  const callerType = options?.callerType ?? 'plugin';
  return {
    requestId: createId(),
    caller: {
      id: options?.callerId ?? 'renderer-preload',
      type: callerType,
      pluginId: callerType === 'plugin' ? options?.pluginId : undefined,
      permissions: sanitizePermissions(options?.permissions)
    },
    timestamp: now()
  };
};

export const createBridgeForKernel = (kernel: Kernel | null, options?: BridgeContextOptions): BridgeTransport => {
  const electron = loadElectronModule();
  if (electron?.ipcRenderer) {
    return new BridgeTransport(
      async <T>(action: string, payload: unknown) => {
        const result = await electron.ipcRenderer!.invoke(CHIPS_INVOKE_CHANNEL, {
          action,
          payload,
          context: buildContext(options)
        });
        return result as T;
      },
      {
        eventAdapter: {
          on: (event, handler) => {
            const channel = `${CHIPS_EVENT_CHANNEL_PREFIX}${event}`;
            const listener = (_event: unknown, data: unknown) => {
              handler(data);
            };
            electron.ipcRenderer!.on(channel, listener);
            return () => {
              electron.ipcRenderer!.removeListener(channel, listener);
            };
          },
          once: (event, handler) => {
            const channel = `${CHIPS_EVENT_CHANNEL_PREFIX}${event}`;
            electron.ipcRenderer!.once(channel, (_event: unknown, data: unknown) => {
              handler(data);
            });
          },
          emit: (event, data) => {
            electron.ipcRenderer!.send(CHIPS_EMIT_CHANNEL, { event, data });
          }
        }
      }
    );
  }

  if (!kernel) {
    throw new Error('Kernel instance is required when Electron ipcRenderer is not available');
  }

  return new BridgeTransport(async (action, payload) => {
    return kernel.invoke(action, payload, buildContext(options));
  });
};

export const exposeBridgeToMainWorld = (bridge: BridgeTransport, name = 'chips'): void => {
  const electron = loadElectronModule();
  if (electron?.contextBridge) {
    electron.contextBridge.exposeInMainWorld(name, bridge);
    return;
  }

  const target = globalThis as Record<string, unknown>;
  target[name] = bridge;
};

export const createAndExposeBridgeForKernel = (
  kernel: Kernel | null,
  options?: BridgeContextOptions & { exposeName?: string }
): BridgeTransport => {
  const bridge = createBridgeForKernel(kernel, options);
  exposeBridgeToMainWorld(bridge, options?.exposeName ?? 'chips');
  return bridge;
};

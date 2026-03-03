import type { Kernel } from '../../packages/kernel/src';
import type { RouteInvocationContext } from '../shared/types';
import { createId, now } from '../shared/utils';
import { BridgeTransport } from '../../packages/bridge-api/src';
import { loadElectronModule } from '../main/electron/electron-loader';
import { CHIPS_EMIT_CHANNEL, CHIPS_EVENT_CHANNEL_PREFIX, CHIPS_INVOKE_CHANNEL } from '../main/ipc/chips-ipc';

interface BridgeContextOptions {
  callerId?: string;
  pluginId?: string;
  permissions?: string[];
}

const defaultPermissions = [
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
];

export const createBridgeForKernel = (kernel: Kernel, options?: BridgeContextOptions) => {
  const buildContext = (): RouteInvocationContext => ({
    requestId: createId(),
    caller: {
      id: options?.callerId ?? 'renderer-preload',
      type: 'plugin',
      pluginId: options?.pluginId ?? 'local-plugin',
      permissions: options?.permissions ?? defaultPermissions
    },
    timestamp: now()
  });

  const electron = loadElectronModule();
  if (electron?.ipcRenderer) {
    return new BridgeTransport(
      async <T>(action: string, payload: unknown) => {
        const result = await electron.ipcRenderer!.invoke(CHIPS_INVOKE_CHANNEL, {
          action,
          payload,
          context: buildContext()
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

  return new BridgeTransport(async (action, payload) => {
    return kernel.invoke(action, payload, buildContext());
  });
};

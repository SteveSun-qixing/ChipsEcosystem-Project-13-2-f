import type { Kernel } from '../../packages/kernel/src';
import type { RouteInvocationContext } from '../shared/types';
import { createId, now } from '../shared/utils';
import { BridgeTransport } from '../../packages/bridge-api/src';

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
  return new BridgeTransport(async (action, payload) => {
    const context: RouteInvocationContext = {
      requestId: createId(),
      caller: {
        id: options?.callerId ?? 'renderer-preload',
        type: 'plugin',
        pluginId: options?.pluginId ?? 'local-plugin',
        permissions: options?.permissions ?? defaultPermissions
      },
      timestamp: now()
    };

    return kernel.invoke(action, payload, context);
  });
};

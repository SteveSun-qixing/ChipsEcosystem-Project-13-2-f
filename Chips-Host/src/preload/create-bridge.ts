import type { Kernel } from '../../packages/kernel/src';
import type { RouteInvocationContext } from '../shared/types';
import { createId, now } from '../shared/utils';
import { BridgeTransport } from '../../packages/bridge-api/src';

export const createBridgeForKernel = (kernel: Kernel) => {
  return new BridgeTransport(async (action, payload) => {
    const context: RouteInvocationContext = {
      requestId: createId(),
      caller: {
        id: 'renderer-preload',
        type: 'plugin',
        pluginId: 'local-plugin',
        permissions: ['file.read', 'file.write', 'config.read', 'config.write', 'theme.read', 'theme.write', 'i18n.read', 'i18n.write', 'window.control', 'plugin.manage', 'module.manage', 'platform.read', 'platform.external', 'log.read', 'log.write', 'credential.manage', 'card.read', 'card.write', 'box.pack', 'box.read', 'zip.manage', 'serializer.use', 'control.read', 'control.write']
      },
      timestamp: now()
    };

    return kernel.invoke(action, payload, context);
  });
};

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

createAndExposeBridgeForKernel(null, parseBridgeContext());

import { createAndExposeBridgeForKernel, type BridgeContextOptions } from './create-bridge';

export const setupPreloadBridge = (
  options?: BridgeContextOptions & { exposeName?: string }
) => createAndExposeBridgeForKernel(null, options);

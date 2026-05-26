export interface ChipsBridgeLike {
  on?: (event: string, handler: (payload: unknown) => void) => (() => void) | void;
  emit?: (event: string, payload?: unknown) => Promise<void> | void;
  platform?: {
    getLaunchContext?: () => {
      launchParams?: Record<string, unknown>;
    };
    getPathForFile?: (file: unknown) => string;
  };
}

export function useChipsBridge(): ChipsBridgeLike {
  const bridge = (window as Window & { chips?: ChipsBridgeLike }).chips;
  if (!bridge) {
    throw new Error("window.chips 未注入，请确认在 Host 环境中运行或检查 Bridge 配置。");
  }
  return bridge;
}

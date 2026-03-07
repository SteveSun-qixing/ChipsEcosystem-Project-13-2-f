export interface RouteDescriptorMeta {
  action: string;
  schemaIn?: string;
  schemaOut?: string;
  idempotent?: boolean;
  timeoutMs?: number;
}

export interface RouteManifest {
  routes: Record<string, RouteDescriptorMeta>;
}

/**
 * 检查给定动作名是否存在于路由清单中。
 * 该工具函数只依赖传入的 manifest，本身不耦合具体文件路径，
 * 方便在不同仓库或环境中按需传入最新清单。
 */
export function assertKnownAction(action: string, manifest: RouteManifest): void {
  if (!manifest.routes[action]) {
    throw new Error(`Unknown action in route-manifest: ${action}`);
  }
}

export function listActionsByNamespace(namespace: string, manifest: RouteManifest): string[] {
  const prefix = namespace.endsWith(".") ? namespace : `${namespace}.`;
  return Object.keys(manifest.routes).filter((key) => key.startsWith(prefix));
}


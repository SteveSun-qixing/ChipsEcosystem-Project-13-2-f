import { createError } from '../../../src/shared/errors';
import { now } from '../../../src/shared/utils';
import type { RouteDescriptor, ServiceRegistration } from '../../../src/shared/types';

export type KernelModuleFormat = 'service-registration' | 'route-bundle';
export type KernelModuleIsolation = 'shared' | 'isolated';

export interface KernelModuleDependency {
  id: string;
  version?: string;
}

export interface KernelModuleManifest {
  id: string;
  version: string;
  format: KernelModuleFormat;
  dependencies?: KernelModuleDependency[];
  isolation?: KernelModuleIsolation;
}

export interface KernelModuleDefinition {
  manifest: KernelModuleManifest;
  service?: ServiceRegistration;
  routes?: Array<RouteDescriptor<unknown, unknown>>;
}

export interface KernelModuleRecord {
  manifest: KernelModuleManifest;
  routeKeys: string[];
  loadedAt: number;
}

interface ModuleLoadHooks {
  registerRoute: (descriptor: RouteDescriptor<unknown, unknown>) => void;
  registerService: (service: ServiceRegistration) => void;
}

const parseVersion = (input: string): [number, number, number] => {
  const matched = input.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!matched) {
    throw createError('MODULE_VERSION_INVALID', `Invalid module version: ${input}`);
  }
  return [Number(matched[1]), Number(matched[2]), Number(matched[3])];
};

const compareVersion = (left: string, right: string): number => {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  if (leftParts[0] !== rightParts[0]) {
    return leftParts[0] - rightParts[0];
  }
  if (leftParts[1] !== rightParts[1]) {
    return leftParts[1] - rightParts[1];
  }
  return leftParts[2] - rightParts[2];
};

const satisfiesVersion = (actual: string, expected?: string): boolean => {
  if (!expected || expected.trim().length === 0) {
    return true;
  }

  if (expected.startsWith('^')) {
    const baseline = expected.slice(1);
    const [actualMajor] = parseVersion(actual);
    const [baselineMajor] = parseVersion(baseline);
    return actualMajor === baselineMajor && compareVersion(actual, baseline) >= 0;
  }

  if (expected.startsWith('~')) {
    const baseline = expected.slice(1);
    const [actualMajor, actualMinor] = parseVersion(actual);
    const [baselineMajor, baselineMinor] = parseVersion(baseline);
    return actualMajor === baselineMajor && actualMinor === baselineMinor && compareVersion(actual, baseline) >= 0;
  }

  return compareVersion(actual, expected) === 0;
};

export class ModuleLoader {
  private readonly loaded = new Map<string, KernelModuleRecord>();

  public load(module: KernelModuleDefinition, hooks: ModuleLoadHooks): KernelModuleRecord {
    this.validateManifest(module.manifest);

    if (this.loaded.has(module.manifest.id)) {
      throw createError('MODULE_ALREADY_LOADED', `Module already loaded: ${module.manifest.id}`);
    }

    this.ensureDependencies(module.manifest.dependencies ?? []);

    const routeKeys: string[] = [];
    if (module.manifest.format === 'service-registration') {
      if (!module.service) {
        throw createError('MODULE_FORMAT_MISMATCH', `Module ${module.manifest.id} requires service definition`);
      }
      hooks.registerService(module.service);
      for (const descriptor of Object.values(module.service.actions)) {
        routeKeys.push(descriptor.descriptor.key);
      }
    } else {
      const routes = module.routes ?? [];
      if (routes.length === 0) {
        throw createError('MODULE_FORMAT_MISMATCH', `Module ${module.manifest.id} requires route bundle`);
      }
      this.ensureIsolation(module.manifest, routes);
      for (const route of routes) {
        hooks.registerRoute(route);
        routeKeys.push(route.key);
      }
    }

    const record: KernelModuleRecord = {
      manifest: {
        ...module.manifest,
        dependencies: module.manifest.dependencies ? [...module.manifest.dependencies] : []
      },
      routeKeys,
      loadedAt: now()
    };
    this.loaded.set(module.manifest.id, record);
    return {
      manifest: { ...record.manifest, dependencies: [...(record.manifest.dependencies ?? [])] },
      routeKeys: [...record.routeKeys],
      loadedAt: record.loadedAt
    };
  }

  public list(): KernelModuleRecord[] {
    return [...this.loaded.values()].map((record) => ({
      manifest: { ...record.manifest, dependencies: [...(record.manifest.dependencies ?? [])] },
      routeKeys: [...record.routeKeys],
      loadedAt: record.loadedAt
    }));
  }

  public get(moduleId: string): KernelModuleRecord | null {
    const record = this.loaded.get(moduleId);
    if (!record) {
      return null;
    }
    return {
      manifest: { ...record.manifest, dependencies: [...(record.manifest.dependencies ?? [])] },
      routeKeys: [...record.routeKeys],
      loadedAt: record.loadedAt
    };
  }

  private validateManifest(manifest: KernelModuleManifest): void {
    if (manifest.id.trim().length === 0) {
      throw createError('MODULE_ID_REQUIRED', 'Module id is required');
    }
    parseVersion(manifest.version);
    if (manifest.format !== 'service-registration' && manifest.format !== 'route-bundle') {
      throw createError('MODULE_FORMAT_INVALID', `Unsupported module format: ${manifest.format}`);
    }
    if (manifest.isolation && manifest.isolation !== 'shared' && manifest.isolation !== 'isolated') {
      throw createError('MODULE_ISOLATION_INVALID', `Unsupported isolation mode: ${manifest.isolation}`);
    }
  }

  private ensureDependencies(dependencies: KernelModuleDependency[]): void {
    for (const dependency of dependencies) {
      const loaded = this.loaded.get(dependency.id);
      if (!loaded) {
        throw createError('MODULE_DEPENDENCY_MISSING', `Required module not loaded: ${dependency.id}`);
      }
      if (!satisfiesVersion(loaded.manifest.version, dependency.version)) {
        throw createError('MODULE_DEPENDENCY_VERSION_MISMATCH', `Module version mismatch for dependency: ${dependency.id}`, {
          expected: dependency.version,
          actual: loaded.manifest.version
        });
      }
    }
  }

  private ensureIsolation(
    manifest: KernelModuleManifest,
    routes: Array<RouteDescriptor<unknown, unknown>>
  ): void {
    if (manifest.isolation !== 'isolated') {
      return;
    }

    const expectedPrefix = `${manifest.id}.`;
    for (const route of routes) {
      if (!route.key.startsWith(expectedPrefix)) {
        throw createError('MODULE_ISOLATION_ROUTE_VIOLATION', `Isolated module route must start with ${expectedPrefix}`, {
          route: route.key,
          moduleId: manifest.id
        });
      }
    }
  }
}

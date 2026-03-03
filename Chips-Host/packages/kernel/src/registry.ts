import type { LifecycleState } from '../../../src/shared/types';

export interface RegisteredService {
  name: string;
  version: string;
  dependencies: string[];
  state: LifecycleState;
}

export class ServiceRegistry {
  private readonly services = new Map<string, RegisteredService>();

  public register(service: Omit<RegisteredService, 'state'>): void {
    if (this.services.has(service.name)) {
      throw new Error(`Service already registered: ${service.name}`);
    }

    this.services.set(service.name, {
      ...service,
      state: 'unloaded'
    });
  }

  public setState(name: string, state: LifecycleState): void {
    const current = this.services.get(name);
    if (!current) {
      throw new Error(`Service not found: ${name}`);
    }

    current.state = state;
  }

  public get(name: string): RegisteredService | undefined {
    const service = this.services.get(name);
    return service ? { ...service, dependencies: [...service.dependencies] } : undefined;
  }

  public list(): RegisteredService[] {
    return [...this.services.values()].map((service) => ({
      ...service,
      dependencies: [...service.dependencies]
    }));
  }

  public resolveStartupOrder(): string[] {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const order: string[] = [];

    const visit = (name: string): void => {
      if (visited.has(name)) {
        return;
      }
      if (inStack.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      inStack.add(name);
      const service = this.services.get(name);
      if (!service) {
        throw new Error(`Missing service dependency: ${name}`);
      }

      for (const dependency of service.dependencies) {
        visit(dependency);
      }

      inStack.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.services.keys()) {
      visit(name);
    }

    return order;
  }
}

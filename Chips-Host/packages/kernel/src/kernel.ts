import { createError } from '../../../src/shared/errors';
import type { RouteDescriptor, RouteInvocationContext, ServiceRegistration } from '../../../src/shared/types';
import { EventBus } from './event-bus';
import { LifecycleManager } from './lifecycle';
import { ServiceRegistry } from './registry';
import { KernelRouter } from './router';

export class Kernel {
  public readonly router: KernelRouter;
  public readonly registry: ServiceRegistry;
  public readonly events: EventBus;
  public readonly lifecycle: LifecycleManager;

  public constructor() {
    this.router = new KernelRouter();
    this.registry = new ServiceRegistry();
    this.events = new EventBus();
    this.lifecycle = new LifecycleManager();
  }

  public registerRoute<I, O>(descriptor: RouteDescriptor<I, O>): void {
    this.router.register(descriptor);
  }

  public registerService(service: ServiceRegistration): void {
    this.registry.register({
      name: service.name,
      version: '1.0.0',
      dependencies: []
    });

    for (const actionDefinition of Object.values(service.actions)) {
      this.router.register(actionDefinition.descriptor);
    }

    this.lifecycle.transition(service.name, 'loading');
    this.lifecycle.transition(service.name, 'ready');
    this.lifecycle.transition(service.name, 'running');
  }

  public async invoke<TInput, TOutput>(
    key: string,
    input: TInput,
    context: RouteInvocationContext
  ): Promise<TOutput> {
    return this.router.invoke<TInput, TOutput>(key, input, context);
  }

  public getRouteManifest(): string[] {
    return this.router.listRoutes();
  }

  public getHealthReport(): {
    routes: number;
    services: number;
    lifecycle: Record<string, string>;
  } {
    return {
      routes: this.router.listRoutes().length,
      services: this.registry.list().length,
      lifecycle: this.lifecycle.snapshot()
    };
  }

  public ensureServiceState(name: string, expected: 'running'): void {
    const state = this.lifecycle.getState(name);
    if (state !== expected) {
      throw createError('SERVICE_UNAVAILABLE', `Service is not running: ${name}`, { state });
    }
  }
}

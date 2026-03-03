import { describe, expect, it } from 'vitest';
import { Kernel } from '../../packages/kernel/src';
import { objectWithKeys, schemaRegistry } from '../../src/shared/schema';

const registerSchemaPair = (route: string): void => {
  schemaRegistry.register(`schemas/${route}.request.json`, objectWithKeys(['value']));
  schemaRegistry.register(`schemas/${route}.response.json`, objectWithKeys(['value']));
};

describe('Kernel module loader', () => {
  it('loads modules with dependency graph and exposes module list', async () => {
    const kernel = new Kernel();
    registerSchemaPair('chips.core.echo');
    registerSchemaPair('chips.feature.echo');

    kernel.loadModule({
      manifest: {
        id: 'chips.core',
        version: '1.0.0',
        format: 'route-bundle',
        isolation: 'isolated'
      },
      routes: [
        {
          key: 'chips.core.echo',
          schemaIn: 'schemas/chips.core.echo.request.json',
          schemaOut: 'schemas/chips.core.echo.response.json',
          permission: ['demo.read'],
          timeoutMs: 1000,
          idempotent: true,
          retries: 0,
          handler: async (input: unknown) => ({ value: (input as { value: string }).value })
        }
      ]
    });

    kernel.loadModule({
      manifest: {
        id: 'chips.feature',
        version: '1.2.0',
        format: 'route-bundle',
        dependencies: [{ id: 'chips.core', version: '^1.0.0' }],
        isolation: 'isolated'
      },
      routes: [
        {
          key: 'chips.feature.echo',
          schemaIn: 'schemas/chips.feature.echo.request.json',
          schemaOut: 'schemas/chips.feature.echo.response.json',
          permission: ['demo.read'],
          timeoutMs: 1000,
          idempotent: true,
          retries: 0,
          handler: async (input: unknown) => ({ value: (input as { value: string }).value })
        }
      ]
    });

    const output = await kernel.invoke<{ value: string }, { value: string }>('chips.feature.echo', { value: 'ok' }, {
      requestId: 'req-1',
      timestamp: Date.now(),
      caller: {
        id: 'test',
        type: 'service',
        permissions: ['demo.read']
      }
    });

    expect(output.value).toBe('ok');
    const modules = kernel.listModules();
    expect(modules.map((item) => item.manifest.id)).toEqual(['chips.core', 'chips.feature']);
  });

  it('fails when required dependency is missing', () => {
    const kernel = new Kernel();
    registerSchemaPair('chips.feature.read');

    try {
      kernel.loadModule({
        manifest: {
          id: 'chips.feature',
          version: '1.0.0',
          format: 'route-bundle',
          dependencies: [{ id: 'chips.core', version: '^1.0.0' }]
        },
        routes: [
          {
            key: 'chips.feature.read',
            schemaIn: 'schemas/chips.feature.read.request.json',
            schemaOut: 'schemas/chips.feature.read.response.json',
            permission: ['demo.read'],
            timeoutMs: 1000,
            idempotent: true,
            retries: 0,
            handler: async (input: unknown) => ({ value: (input as { value: string }).value })
          }
        ]
      });
      throw new Error('Expected dependency validation to fail');
    } catch (error) {
      expect(error).toMatchObject({ code: 'MODULE_DEPENDENCY_MISSING' });
    }
  });

  it('enforces isolated module route namespace', () => {
    const kernel = new Kernel();
    registerSchemaPair('demo.echo');

    try {
      kernel.loadModule({
        manifest: {
          id: 'chips.isolated',
          version: '1.0.0',
          format: 'route-bundle',
          isolation: 'isolated'
        },
        routes: [
          {
            key: 'demo.echo',
            schemaIn: 'schemas/demo.echo.request.json',
            schemaOut: 'schemas/demo.echo.response.json',
            permission: ['demo.read'],
            timeoutMs: 1000,
            idempotent: true,
            retries: 0,
            handler: async (input: unknown) => ({ value: (input as { value: string }).value })
          }
        ]
      });
      throw new Error('Expected isolation validation to fail');
    } catch (error) {
      expect(error).toMatchObject({ code: 'MODULE_ISOLATION_ROUTE_VIOLATION' });
    }
  });
});

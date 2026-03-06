import { describe, expect, it, vi } from 'vitest';
import {
  EffectDispatcher,
  EventBindingRegistry,
  Form,
  Stack,
  View,
  bindNodeEvent,
  createCompoundComponent,
  createRuntimeEffect,
  createTelemetryEffect,
  createUINode,
  createUIEffect,
  guardAgainstBooleanModeProps
} from '../../src/renderer/declarative-ui';

describe('Declarative UI', () => {
  it('builds semantic primitives with the standard node model fields', () => {
    const node = View({
      id: 'root',
      props: { role: 'main' },
      state: { expanded: true },
      bindings: { title: 'card.title' },
      events: { onSubmit: 'submit.handler' },
      themeScope: 'app.viewer',
      children: [Stack({ id: 'content' })]
    });

    expect(node).toMatchObject({
      id: 'root',
      type: 'View',
      props: { role: 'main' },
      state: { expanded: true },
      bindings: { title: 'card.title' },
      events: { onSubmit: 'submit.handler' },
      themeScope: 'app.viewer'
    });
    expect(node.children?.[0]?.type).toBe('Stack');
  });

  it('rejects invalid node identifiers', () => {
    expect(() =>
      createUINode({
        id: '',
        type: 'View'
      })
    ).toThrow();
  });

  it('binds event handler id into node events', () => {
    const source = View({ id: 'panel' });
    const bound = bindNodeEvent(source, 'onOpenFile', 'open-file.handler');

    expect(bound.events).toMatchObject({
      onOpenFile: 'open-file.handler'
    });
  });

  it('composes explicit slots with compound component definition', () => {
    const FormLayout = createCompoundComponent({
      name: 'FormLayout',
      rootType: 'Form',
      slots: {
        header: { type: 'View', required: true },
        body: { type: 'Stack', required: true },
        footer: { type: 'View', required: false }
      }
    });

    const tree = FormLayout.compose({
      root: {
        id: 'profile-form'
      },
      slots: {
        header: View({ id: 'form-header' }),
        body: Stack({ id: 'form-body' }),
        footer: View({ id: 'form-footer' })
      }
    });

    expect(tree.type).toBe('Form');
    expect(tree.children?.map((node) => node.props?.slot)).toEqual(['header', 'body', 'footer']);
  });

  it('blocks boolean mode props in compound components', () => {
    expect(() => guardAgainstBooleanModeProps({ isCompact: true }, 'DemoPanel')).toThrow();
  });

  it('dispatches ui-effect and telemetry-effect through effect executors', async () => {
    const uiExecutor = vi.fn();
    const telemetryExecutor = vi.fn();
    const dispatcher = new EffectDispatcher({
      'ui-effect': uiExecutor,
      'telemetry-effect': telemetryExecutor
    });
    const registry = new EventBindingRegistry(dispatcher);
    registry.registerHandler('submit.handler', () => ({
      effects: [createUIEffect('focus', { target: 'title' }), createTelemetryEffect('track.submit', { formId: 'f1' })]
    }));

    const node = bindNodeEvent(Form({ id: 'f1' }), 'onSubmit', 'submit.handler');
    await registry.dispatch(node, 'onSubmit', { source: 'button' });

    expect(uiExecutor).toHaveBeenCalledTimes(1);
    expect(telemetryExecutor).toHaveBeenCalledTimes(1);
  });

  it('forbids runtime-effect dispatch in render phase', async () => {
    const runtimeExecutor = vi.fn();
    const dispatcher = new EffectDispatcher({
      'runtime-effect': runtimeExecutor
    });
    const registry = new EventBindingRegistry(dispatcher);
    registry.registerHandler('load.handler', () => ({
      effects: [createRuntimeEffect('file.read', { path: '/tmp/demo.card' })]
    }));
    const node = bindNodeEvent(View({ id: 'viewer' }), 'onLoad', 'load.handler');

    await expect(registry.dispatch(node, 'onLoad', undefined, 'render')).rejects.toMatchObject({
      code: 'DECLARATIVE_UI_RUNTIME_EFFECT_FORBIDDEN_IN_RENDER'
    });
    expect(runtimeExecutor).not.toHaveBeenCalled();
  });

  it('schedules runtime-effect from render phase and flushes in commit phase', async () => {
    const runtimeExecutor = vi.fn();
    const dispatcher = new EffectDispatcher({
      'runtime-effect': runtimeExecutor
    });
    const node = View({ id: 'root' });
    const effect = createRuntimeEffect('config.get', { key: 'editor.mode' });

    dispatcher.schedule(effect, {
      node,
      phase: 'render'
    });
    await dispatcher.flushScheduledRuntimeEffects();

    expect(runtimeExecutor).toHaveBeenCalledTimes(1);
    expect(runtimeExecutor.mock.calls[0]?.[1]).toMatchObject({
      phase: 'commit'
    });
  });
});

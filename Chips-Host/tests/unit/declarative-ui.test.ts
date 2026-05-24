import { describe, expect, it, vi } from 'vitest';
import {
  EffectDispatcher,
  EventBindingRegistry,
  Form,
  Image,
  Media,
  Navigation,
  ScrollView,
  Section,
  StandardCompoundSlotSchemas,
  Stack,
  Table,
  Text,
  Toolbar,
  View,
  Command,
  bindNodeEvent,
  createCompoundComponent,
  createRuntimeEffect,
  createTelemetryEffect,
  createUINode,
  createUIEffect,
  guardAgainstBooleanModeProps,
  validateNodeEventBindings,
  withNodeModifiers
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

  it('builds the expanded semantic primitive set', () => {
    const node = Section({
      id: 'settings',
      modifiers: {
        i18nKey: 'settings.title',
        layout: { display: 'block', gap: 'md' },
        accessibility: { role: 'region', label: 'Settings' },
        testId: 'settings-section'
      },
      children: [
        ScrollView({ id: 'settings-scroll', modifiers: { layout: { scrollAxis: 'vertical' } } }),
        Text({ id: 'settings-title', props: { value: 'Settings' } }),
        Image({ id: 'settings-cover', props: { source: 'card-root://cover.png', alt: 'Cover' } }),
        Media({ id: 'settings-preview', props: { source: 'card-root://preview.mp4', kind: 'video' } }),
        Table({ id: 'settings-table', props: { dataSource: 'settings.rows' } }),
        Navigation({ id: 'settings-nav', props: { current: 'general' } }),
        Toolbar({ id: 'settings-toolbar' })
      ]
    });

    expect(node.type).toBe('Section');
    expect(node.children?.map((child) => child.type)).toEqual([
      'ScrollView',
      'Text',
      'Image',
      'Media',
      'Table',
      'Navigation',
      'Toolbar'
    ]);
    expect(node.modifiers).toMatchObject({
      i18nKey: 'settings.title',
      layout: { display: 'block', gap: 'md' },
      accessibility: { role: 'region', label: 'Settings' },
      testId: 'settings-section'
    });
  });

  it('rejects invalid node identifiers', () => {
    expect(() =>
      createUINode({
        id: '',
        type: 'View'
      })
    ).toThrow();
  });

  it('normalizes modifier theme scope and rejects mismatches', () => {
    const node = createUINode({
      id: 'themed-panel',
      type: 'View',
      modifiers: {
        themeScope: 'app.settings'
      }
    });

    expect(node.themeScope).toBe('app.settings');
    expect(node.modifiers?.themeScope).toBe('app.settings');
    expect(() =>
      createUINode({
        id: 'broken-panel',
        type: 'View',
        themeScope: 'app.a',
        modifiers: {
          themeScope: 'app.b'
        }
      })
    ).toThrow();
  });

  it('rejects visual hardcoding in L8 props', () => {
    let error: unknown;
    try {
      View({
        id: 'visual-panel',
        props: {
          backgroundColor: '#ffffff'
        }
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({ code: 'DECLARATIVE_UI_VISUAL_PROP_FORBIDDEN' });
  });

  it('rejects executable events and non-string bindings', () => {
    expect(() =>
      createUINode({
        id: 'event-panel',
        type: 'View',
        events: {
          onClick: (() => undefined) as unknown as string
        }
      })
    ).toThrow();
    expect(() =>
      createUINode({
        id: 'binding-panel',
        type: 'View',
        bindings: {
          title: { path: 'card.title' } as unknown as string
        }
      })
    ).toThrow();
  });

  it('validates modifier structure and shortcut command bindings', () => {
    const node = withNodeModifiers(View({ id: 'command-panel' }), {
      shortcut: [
        {
          key: 'K',
          modifiers: ['cmd'],
          command: 'palette.open',
          when: 'focusScope:global'
        }
      ],
      permission: {
        action: 'card.update',
        resource: 'card:current',
        fallback: 'disable'
      },
      focusScope: {
        id: 'global',
        trap: false,
        restore: true,
        order: ['search', 'results']
      },
      presentation: {
        surface: 'window',
        mode: 'inline',
        priority: 1
      },
      motion: {
        preset: 'chips.motion.fade',
        reduceMotion: 'respect'
      }
    });

    expect(node.modifiers).toMatchObject({
      shortcut: [{ key: 'K', modifiers: ['cmd'], command: 'palette.open' }],
      permission: { action: 'card.update', fallback: 'disable' },
      focusScope: { id: 'global', restore: true },
      presentation: { surface: 'window', mode: 'inline', priority: 1 },
      motion: { preset: 'chips.motion.fade', reduceMotion: 'respect' }
    });
    expect(() =>
      withNodeModifiers(node, {
        shortcut: {
          key: '',
          command: 'palette.open'
        }
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
        id: 'profile-form',
        modifiers: {
          layout: { direction: 'vertical', gap: 'sm' }
        }
      },
      slots: {
        header: View({ id: 'form-header' }),
        body: Stack({ id: 'form-body' }),
        footer: View({ id: 'form-footer' })
      }
    });

    expect(tree.type).toBe('Form');
    expect(tree.children?.map((node) => node.props?.slot)).toEqual(['header', 'body', 'footer']);
    expect(tree.modifiers?.layout).toMatchObject({ direction: 'vertical', gap: 'sm' });
  });

  it('returns structured slot diagnostics for missing, repeated, undeclared, and mismatched slots', () => {
    const Dialog = createCompoundComponent({
      name: 'Dialog',
      rootType: 'Section',
      slots: StandardCompoundSlotSchemas.Dialog
    });

    const diagnostics = Dialog.validate({
      root: {
        id: 'confirm-dialog'
      },
      slots: {
        body: Text({ id: 'dialog-body' }),
        actions: [Toolbar({ id: 'dialog-actions' }), Toolbar({ id: 'dialog-actions-extra' })],
        ghost: View({ id: 'dialog-ghost' })
      }
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DECLARATIVE_UI_SLOT_REQUIRED',
          path: 'slots.content',
          severity: 'error',
          stage: 'slot-validate',
          suggestion: expect.any(String)
        }),
        expect.objectContaining({
          code: 'DECLARATIVE_UI_SLOT_TYPE_MISMATCH',
          nodeId: 'dialog-body',
          path: 'slots.body',
          details: expect.objectContaining({
            expectedType: ['View', 'Stack', 'Section'],
            actualType: 'Text'
          })
        }),
        expect.objectContaining({
          code: 'DECLARATIVE_UI_SLOT_MULTIPLE_FORBIDDEN',
          path: 'slots.actions'
        }),
        expect.objectContaining({
          code: 'DECLARATIVE_UI_SLOT_UNDEFINED',
          path: 'slots.ghost'
        })
      ])
    );
  });

  it('validates standard compound slot schemas for Dialog, Popover, Tabs, Menu, Select, Form, and DataGrid', () => {
    const Dialog = createCompoundComponent({
      name: 'Dialog',
      rootType: 'Section',
      slots: StandardCompoundSlotSchemas.Dialog
    });
    const Popover = createCompoundComponent({
      name: 'Popover',
      rootType: 'Navigation',
      slots: StandardCompoundSlotSchemas.Popover
    });
    const Tabs = createCompoundComponent({
      name: 'Tabs',
      rootType: 'Navigation',
      slots: StandardCompoundSlotSchemas.Tabs
    });
    const Menu = createCompoundComponent({
      name: 'Menu',
      rootType: 'Navigation',
      slots: StandardCompoundSlotSchemas.Menu
    });
    const Select = createCompoundComponent({
      name: 'Select',
      rootType: 'Navigation',
      slots: StandardCompoundSlotSchemas.Select
    });
    const CompoundForm = createCompoundComponent({
      name: 'Form',
      rootType: 'Form',
      slots: StandardCompoundSlotSchemas.Form
    });
    const DataGrid = createCompoundComponent({
      name: 'DataGrid',
      rootType: 'Table',
      slots: StandardCompoundSlotSchemas.DataGrid
    });

    expect(
      Dialog.validate({
        root: { id: 'dialog-root' },
        slots: {
          trigger: Command({ id: 'dialog-trigger' }),
          content: Section({ id: 'dialog-content' }),
          header: Section({ id: 'dialog-header' }),
          body: View({ id: 'dialog-body' }),
          footer: Toolbar({ id: 'dialog-footer' }),
          actions: Toolbar({ id: 'dialog-actions' }),
          close: Command({ id: 'dialog-close' })
        }
      })
    ).toEqual([]);
    expect(
      Popover.validate({
        root: { id: 'popover-root' },
        slots: {
          trigger: Command({ id: 'popover-trigger' }),
          content: Stack({ id: 'popover-content' }),
          arrow: View({ id: 'popover-arrow' })
        }
      })
    ).toEqual([]);
    expect(
      Tabs.validate({
        root: { id: 'tabs-root' },
        slots: {
          list: Toolbar({ id: 'tabs-list' }),
          trigger: [View({ id: 'bad-trigger' })],
          panel: [Section({ id: 'tabs-panel' })]
        }
      })
    ).toEqual([expect.objectContaining({ code: 'DECLARATIVE_UI_SLOT_TYPE_MISMATCH', path: 'slots.trigger' })]);
    expect(
      Menu.validate({
        root: { id: 'menu-root' },
        slots: {
          content: Section({ id: 'menu-content' }),
          item: [Command({ id: 'menu-open' })],
          group: [Section({ id: 'menu-group' })],
          separator: [View({ id: 'menu-separator' })]
        }
      })
    ).toEqual([]);
    expect(
      Select.validate({
        root: { id: 'select-root' },
        slots: {
          trigger: Command({ id: 'select-trigger' }),
          value: Text({ id: 'select-value' }),
          content: Section({ id: 'select-content' }),
          option: [Command({ id: 'select-option-a' }), Command({ id: 'select-option-b' })]
        }
      })
    ).toEqual([]);
    expect(
      Select.validate({
        root: { id: 'bad-select-root' },
        slots: {
          trigger: Command({ id: 'bad-select-trigger' }),
          content: Section({ id: 'bad-select-content' })
        }
      })
    ).toEqual([expect.objectContaining({ code: 'DECLARATIVE_UI_SLOT_REQUIRED', path: 'slots.option' })]);
    expect(
      CompoundForm.validate({
        root: { id: 'compound-form-root' },
        slots: {
          field: [Form({ id: 'form-field' })],
          control: [Command({ id: 'form-submit' })]
        }
      })
    ).toEqual([]);
    expect(
      DataGrid.validate({
        root: { id: 'grid-root' },
        slots: {
          header: Table({ id: 'grid-header' }),
          row: [Table({ id: 'grid-row' })],
          cell: [Table({ id: 'grid-cell' })]
        }
      })
    ).toEqual([]);
  });

  it('blocks boolean mode props in compound components', () => {
    expect(() => guardAgainstBooleanModeProps({ isCompact: true }, 'DemoPanel')).toThrow();
  });

  it('diagnoses invalid event bindings without executing handlers', () => {
    const node = {
      id: 'event-root',
      type: 'View',
      events: {
        onOpen: 'open.handler'
      },
      children: [
        {
          id: 'event-child',
          type: 'Command',
          events: {
            onPress: '' as string
          }
        }
      ]
    } as Parameters<typeof validateNodeEventBindings>[0];

    expect(validateNodeEventBindings(node)).toEqual([
      expect.objectContaining({
        nodeId: 'event-child',
        type: 'Command',
        path: 'events.onPress',
        stage: 'event-bind',
        code: 'DECLARATIVE_UI_EVENT_HANDLER_INVALID',
        suggestion: expect.any(String)
      })
    ]);
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

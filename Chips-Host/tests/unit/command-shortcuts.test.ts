import { describe, expect, it, vi } from 'vitest';
import {
  bootCommandShortcutRuntime,
  isEditableShortcutEvent,
  matchesCommandAccelerator
} from '../../src/preload/command-shortcuts';
import type { PlatformLaunchContext } from '../../src/preload/create-bridge';

type KeydownHandler = (event: TestKeyboardEvent) => void;

interface TestKeyboardEvent {
  altKey: boolean;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  isComposing: boolean;
  key: string;
  metaKey: boolean;
  preventDefault(): void;
  repeat: boolean;
  shiftKey: boolean;
  stopPropagation(): void;
  target?: unknown;
  composedPath?: () => unknown[];
}

const createKeyEvent = (
  key: string,
  options: Partial<Omit<TestKeyboardEvent, 'key' | 'preventDefault' | 'stopPropagation'>> = {}
): TestKeyboardEvent & { prevented: boolean; stopped: boolean } => {
  const event = {
    altKey: options.altKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    defaultPrevented: options.defaultPrevented ?? false,
    isComposing: options.isComposing ?? false,
    key,
    metaKey: options.metaKey ?? false,
    repeat: options.repeat ?? false,
    shiftKey: options.shiftKey ?? false,
    target: options.target,
    composedPath: options.composedPath,
    prevented: false,
    stopped: false,
    preventDefault() {
      event.defaultPrevented = true;
      event.prevented = true;
    },
    stopPropagation() {
      event.stopped = true;
    }
  };
  return event;
};

const createWindowTarget = () => {
  let handler: KeydownHandler | null = null;
  return {
    addEventListener: vi.fn((_event: 'keydown', nextHandler: KeydownHandler) => {
      handler = nextHandler;
    }),
    removeEventListener: vi.fn((_event: 'keydown', nextHandler: KeydownHandler) => {
      if (handler === nextHandler) {
        handler = null;
      }
    }),
    dispatch(event: TestKeyboardEvent) {
      handler?.(event);
    }
  };
};

const launchContext: PlatformLaunchContext = {
  pluginId: 'chips.richtext.editor',
  sessionId: 'session-richtext',
  sceneId: 'scene-richtext',
  surfaceId: 'surface-richtext',
  kind: 'window',
  surfaceContext: {
    pluginId: 'chips.richtext.editor',
    sessionId: 'session-richtext',
    sceneId: 'scene-richtext',
    surfaceId: 'surface-richtext',
    kind: 'window',
    presentation: {
      title: 'Rich Text Editor'
    }
  },
  launchParams: {}
};

describe('command shortcut runtime', () => {
  it('matches command accelerators using platform specific Mod semantics', () => {
    expect(
      matchesCommandAccelerator('Mod+N', createKeyEvent('n', { metaKey: true }), {
        platform: 'MacIntel'
      } as any)
    ).toBe(true);
    expect(
      matchesCommandAccelerator('Mod+N', createKeyEvent('n', { ctrlKey: true }), {
        platform: 'Win32'
      } as any)
    ).toBe(true);
    expect(
      matchesCommandAccelerator('Mod+Shift+S', createKeyEvent('s', { ctrlKey: true, shiftKey: true }), {
        platform: 'Win32'
      } as any)
    ).toBe(true);
    expect(
      matchesCommandAccelerator('CommandOrControl+,', createKeyEvent(',', { ctrlKey: true }), {
        platform: 'Win32'
      } as any)
    ).toBe(true);
  });

  it('detects editable targets so editor input keeps text editing ownership', () => {
    expect(
      isEditableShortcutEvent(
        createKeyEvent('n', {
          ctrlKey: true,
          target: {
            tagName: 'TEXTAREA'
          }
        })
      )
    ).toBe(true);
    expect(
      isEditableShortcutEvent(
        createKeyEvent('n', {
          metaKey: true,
          composedPath: () => [
            {
              tagName: 'DIV',
              isContentEditable: true
            }
          ]
        })
      )
    ).toBe(true);
  });

  it('invokes focused-surface command shortcuts without running inside editable content', async () => {
    const windowTarget = createWindowTarget();
    const invoke = vi.fn(async (action: string, payload: unknown): Promise<unknown> => {
        if (action === 'command.list') {
          return {
            commands: [
              {
                commandId: 'chips.richtext.editor.file.new',
                shortcut: [{ accelerator: 'Mod+N', preventDefault: true }],
                scope: { kind: 'app', appId: 'chips.richtext.editor' },
                ownerPluginId: 'chips.richtext.editor',
                diagnostic: { visible: true, enabled: true }
              },
              {
                commandId: 'chips.other.file.new',
                shortcut: [{ accelerator: 'Mod+N', preventDefault: true }],
                scope: { kind: 'app', appId: 'chips.other' },
                ownerPluginId: 'chips.other',
                diagnostic: { visible: true, enabled: true }
              }
            ]
          };
        }
        return { dispatched: true, payload };
      });
    const bridge = {
      invoke: invoke as <T = unknown>(action: string, payload: unknown) => Promise<T>,
      on: vi.fn(() => () => undefined)
    };

    const dispose = bootCommandShortcutRuntime(bridge, launchContext, {
      window: windowTarget,
      document: {},
      navigator: { platform: 'MacIntel' } as any
    });
    await Promise.resolve();
    await Promise.resolve();

    const editEvent = createKeyEvent('n', {
      metaKey: true,
      target: {
        tagName: 'DIV',
        isContentEditable: true
      }
    });
    windowTarget.dispatch(editEvent);
    expect(bridge.invoke).toHaveBeenCalledTimes(1);
    expect(editEvent.prevented).toBe(false);

    const appEvent = createKeyEvent('n', { metaKey: true, target: { tagName: 'BUTTON' } });
    windowTarget.dispatch(appEvent);
    expect(appEvent.prevented).toBe(true);
    expect(appEvent.stopped).toBe(true);
    expect(bridge.invoke).toHaveBeenLastCalledWith(
      'command.invoke',
      expect.objectContaining({
        commandId: 'chips.richtext.editor.file.new',
        source: 'shortcut',
        context: expect.objectContaining({
          pluginId: 'chips.richtext.editor',
          sceneId: 'scene-richtext',
          surfaceId: 'surface-richtext'
        })
      })
    );

    dispose();
    expect(windowTarget.removeEventListener).toHaveBeenCalled();
  });
});

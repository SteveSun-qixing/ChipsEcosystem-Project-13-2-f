import { describe, expect, it } from 'vitest';
import { BridgeTransport } from '../../packages/bridge-api/src';

describe('BridgeTransport', () => {
  it('supports invoke and event subscription', async () => {
    const bridge = new BridgeTransport(async (action, payload) => ({ action, payload }) as any);

    const calls: unknown[] = [];
    const off = bridge.on('theme.changed', (payload) => {
      calls.push(payload);
    });

    await bridge.emit('theme.changed', { id: 'theme-1' });
    off();
    await bridge.emit('theme.changed', { id: 'theme-2' });

    const result = await bridge.invoke('config.get', { key: 'lang' });
    expect(result).toMatchObject({ action: 'config.get', payload: { key: 'lang' } });
    expect(calls).toEqual([{ id: 'theme-1' }]);
  });

  it('supports cancellable once subscriptions and awaits event adapter emit', async () => {
    const listeners = new Map<string, Set<(payload: unknown) => void>>();
    const emitted: unknown[] = [];
    const bridge = new BridgeTransport(
      async (action, payload) => ({ action, payload }) as any,
      {
        eventAdapter: {
          on(event, handler) {
            const bucket = listeners.get(event) ?? new Set();
            bucket.add(handler);
            listeners.set(event, bucket);
            return () => {
              bucket.delete(handler);
              if (bucket.size === 0) {
                listeners.delete(event);
              }
            };
          },
          once(event, handler) {
            const off = this.on(event, (payload) => {
              off();
              handler(payload);
            });
            return off;
          },
          async emit(event, data) {
            emitted.push(data);
            for (const handler of listeners.get(event) ?? []) {
              handler(data);
            }
          }
        }
      }
    );

    const calls: unknown[] = [];
    const cancel = bridge.once('theme.changed', (payload) => calls.push(payload));
    cancel();
    await bridge.emit('theme.changed', { id: 'theme-1' });

    bridge.once('theme.changed', (payload) => calls.push(payload));
    await bridge.emit('theme.changed', { id: 'theme-2' });
    await bridge.emit('theme.changed', { id: 'theme-3' });

    expect(emitted).toEqual([{ id: 'theme-1' }, { id: 'theme-2' }, { id: 'theme-3' }]);
    expect(calls).toEqual([{ id: 'theme-2' }]);
  });

  it('exposes window/plugin/platform subdomains', async () => {
    const actions: string[] = [];
    const bridge = new BridgeTransport(async (action) => {
      actions.push(action);
      return { ok: true } as any;
    });

    await bridge.plugin.list();
    await bridge.plugin.get('plugin-1');
    await bridge.plugin.getSelf();
    await bridge.plugin.getCardPlugin('RichTextCard');
    await bridge.plugin.getLayoutPlugin('grid-layout');
    await bridge.window.open({ title: 'demo' });
    await bridge.window.getState('w1');
    await bridge.plugin.query();
    await bridge.clipboard.write('text/plain');
    await bridge.shell.openExternal('https://example.com');
    await bridge.notification.show({ title: 'chips', body: 'ready' });
    await bridge.tray.getState();
    await bridge.shortcut.list();
    await bridge.command.list({ includeHidden: true });
    await bridge.command.invoke('chips.demo.open', { source: 'toolbar' }, { source: 'toolbar' });
    await bridge.ipc.listChannels();

    expect(actions).toEqual([
      'plugin.list',
      'plugin.get',
      'plugin.getSelf',
      'plugin.getCardPlugin',
      'plugin.getLayoutPlugin',
      'window.open',
      'window.getState',
      'plugin.query',
      'platform.clipboardWrite',
      'platform.shellOpenExternal',
      'platform.notificationShow',
      'platform.trayGetState',
      'platform.shortcutList',
      'command.list',
      'command.invoke',
      'platform.ipcListChannels'
    ]);
  });
});

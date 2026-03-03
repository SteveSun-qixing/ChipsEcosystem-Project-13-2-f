import { describe, expect, it } from 'vitest';
import { BridgeTransport } from '../../packages/bridge-api/src';

describe('BridgeTransport', () => {
  it('supports invoke and event subscription', async () => {
    const bridge = new BridgeTransport(async (action, payload) => ({ action, payload }) as any);

    const calls: unknown[] = [];
    const off = bridge.on('theme.changed', (payload) => {
      calls.push(payload);
    });

    bridge.emit('theme.changed', { id: 'theme-1' });
    off();
    bridge.emit('theme.changed', { id: 'theme-2' });

    const result = await bridge.invoke('config.get', { key: 'lang' });
    expect(result).toMatchObject({ action: 'config.get', payload: { key: 'lang' } });
    expect(calls).toEqual([{ id: 'theme-1' }]);
  });

  it('exposes window/plugin/clipboard/shell subdomains', async () => {
    const actions: string[] = [];
    const bridge = new BridgeTransport(async (action) => {
      actions.push(action);
      return { ok: true } as any;
    });

    await bridge.window.open({ title: 'demo' });
    await bridge.window.getState('w1');
    await bridge.plugin.query();
    await bridge.clipboard.write('text/plain');
    await bridge.shell.openExternal('https://example.com');

    expect(actions).toEqual([
      'window.open',
      'window.getState',
      'plugin.query',
      'clipboard.write',
      'shell.openExternal'
    ]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { CardOpenService } from '../../packages/card-open-service/src';

describe('CardOpenService', () => {
  it('launches registered app handlers before falling back', async () => {
    const service = new CardOpenService({
      ensureCardReady: vi.fn().mockResolvedValue(undefined),
      queryHandlerPlugins: vi.fn().mockResolvedValue([
        {
          id: 'chips.viewer.card',
          enabled: true,
          type: 'app'
        }
      ]),
      launchPlugin: vi.fn().mockResolvedValue({
        windowId: 'window-1'
      }),
      openWindow: vi.fn().mockResolvedValue({
        windowId: 'window-2'
      })
    });

    await expect(service.openCard('/tmp/demo.card')).resolves.toEqual({
      mode: 'card-window',
      windowId: 'window-1',
      pluginId: 'chips.viewer.card'
    });
  });

  it('falls back to opening a plain host window when no handler exists', async () => {
    const openWindow = vi.fn().mockResolvedValue({
      windowId: 'window-2'
    });
    const service = new CardOpenService({
      ensureCardReady: vi.fn().mockResolvedValue(undefined),
      queryHandlerPlugins: vi.fn().mockResolvedValue([]),
      launchPlugin: vi.fn(),
      openWindow
    });

    await expect(service.openCard('/tmp/demo.card')).resolves.toEqual({
      mode: 'card-window',
      windowId: 'window-2'
    });
    expect(openWindow).toHaveBeenCalledWith({
      title: 'Card - demo.card',
      width: 1200,
      height: 760
    });
  });
});

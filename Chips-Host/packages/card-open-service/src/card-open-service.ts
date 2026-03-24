import path from 'node:path';
import { createError } from '../../../src/shared/errors';

export interface CardOpenResult {
  mode: 'card-window';
  windowId: string;
  pluginId?: string;
}

interface QueryPluginRecord {
  id: string;
  enabled: boolean;
  type: 'app' | 'card' | 'layout' | 'module' | 'theme';
}

export interface CardOpenServiceOptions {
  ensureCardReady(cardFile: string): Promise<void>;
  queryHandlerPlugins(capability: string): Promise<QueryPluginRecord[]>;
  launchPlugin(pluginId: string, launchParams: Record<string, unknown>): Promise<{ windowId: string }>;
  openWindow(config: { title: string; width: number; height: number }): Promise<{ windowId: string }>;
  defaultWindowSize?: {
    width: number;
    height: number;
  };
}

export class CardOpenService {
  public constructor(private readonly options: CardOpenServiceOptions) {}

  public async openCard(cardFile: string): Promise<CardOpenResult> {
    await this.options.ensureCardReady(cardFile);

    const capability = 'file-handler:.card';
    const plugin = (await this.options.queryHandlerPlugins(capability)).find(
      (item) => item.enabled && item.type === 'app'
    );

    if (plugin) {
      const launched = await this.options.launchPlugin(plugin.id, {
        targetPath: cardFile,
        fileOpenMode: 'card',
        trigger: 'card-open-service'
      });
      return {
        mode: 'card-window',
        windowId: launched.windowId,
        pluginId: plugin.id
      };
    }

    const defaultWidth = this.options.defaultWindowSize?.width ?? 1200;
    const defaultHeight = this.options.defaultWindowSize?.height ?? 760;
    const opened = await this.options.openWindow({
      title: `Card - ${path.basename(cardFile)}`,
      width: defaultWidth,
      height: defaultHeight
    });

    if (!opened.windowId) {
      throw createError('WINDOW_OPEN_FAILED', 'window.open did not return a valid window handle');
    }

    return {
      mode: 'card-window',
      windowId: opened.windowId
    };
  }
}

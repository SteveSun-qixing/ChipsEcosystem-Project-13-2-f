import fs from 'node:fs/promises';
import path from 'node:path';
import { createError } from '../../shared/errors';
import type { PluginUiConfig } from '../../shared/window-chrome';
import { resolveManifestWindowChrome } from '../../shared/window-chrome';
import type { RuntimeClient } from '../../renderer/runtime-client';

interface PluginQueryResponse {
  plugins: Array<{
    id: string;
    enabled: boolean;
    type: 'app' | 'card' | 'layout' | 'module' | 'theme';
    capabilities: string[];
    installPath?: string;
    entry?: string | Record<string, string>;
    ui?: PluginUiConfig;
  }>;
}

interface PluginInitResponse {
  session: {
    sessionId: string;
    sessionNonce: string;
    permissions: string[];
  };
}

interface WindowOpenResponse {
  window: {
    id: string;
  };
}

export interface FileAssociationOpenResult {
  targetPath: string;
  extension: string;
  mode: 'card' | 'box' | 'shell';
  windowId?: string;
  pluginId?: string;
}

const resolveWindowId = (opened: WindowOpenResponse): string => {
  if (!opened.window || typeof opened.window.id !== 'string' || opened.window.id.length === 0) {
    throw createError('WINDOW_OPEN_FAILED', 'window.open did not return a valid window handle');
  }
  return opened.window.id;
};

const findEnabledHandlerPlugin = async (
  runtime: RuntimeClient,
  extension: string
): Promise<{ id: string; installPath?: string; entry?: string | Record<string, string>; ui?: PluginUiConfig } | undefined> => {
  const capability = `file-handler:${extension}`;
  const queried = await runtime.invoke<PluginQueryResponse>('plugin.query', {
    type: 'app',
    capability
  });
  const candidate = queried.plugins.find((plugin) => plugin.enabled && plugin.type === 'app');
  if (!candidate) {
    return undefined;
  }
  return {
    id: candidate.id,
    installPath: candidate.installPath,
    entry: candidate.entry,
    ui: candidate.ui
  };
};

const openByPlugin = async (
  runtime: RuntimeClient,
  plugin: { id: string; installPath?: string; entry?: string | Record<string, string>; ui?: PluginUiConfig },
  targetPath: string,
  defaultTitle: string
): Promise<{ pluginId: string; windowId: string }> => {
  const initialized = await runtime.invoke<PluginInitResponse>('plugin.init', {
    pluginId: plugin.id,
    launchParams: {
      targetPath,
      trigger: 'file-association'
    }
  });
  await runtime.invoke('plugin.handshake.complete', {
    sessionId: initialized.session.sessionId,
    nonce: initialized.session.sessionNonce
  });

  const url =
    plugin.installPath && typeof plugin.entry === 'string'
      ? path.resolve(plugin.installPath, plugin.entry)
      : undefined;

  const opened = await runtime.invoke<WindowOpenResponse>('window.open', {
    config: {
      title: `${defaultTitle} - ${path.basename(targetPath)}`,
      width: 1280,
      height: 800,
      pluginId: plugin.id,
      sessionId: initialized.session.sessionId,
      permissions: initialized.session.permissions,
      url,
      chrome: resolveManifestWindowChrome(plugin.ui)
    }
  });
  return {
    pluginId: plugin.id,
    windowId: resolveWindowId(opened)
  };
};

export const openAssociatedFile = async (runtime: RuntimeClient, inputPath: string): Promise<FileAssociationOpenResult> => {
  const targetPath = path.resolve(inputPath);
  const stats = await fs.stat(targetPath).catch(() => null);
  if (!stats || !stats.isFile()) {
    throw createError('FILE_ASSOCIATION_TARGET_INVALID', `Target file does not exist: ${targetPath}`);
  }

  const extension = path.extname(targetPath).toLowerCase();
  if (extension === '.card') {
    await runtime.invoke('card.render', { cardFile: targetPath });
    const plugin = await findEnabledHandlerPlugin(runtime, extension);
    if (plugin) {
      const opened = await openByPlugin(runtime, plugin, targetPath, 'Card Viewer');
      return {
        targetPath,
        extension,
        mode: 'card',
        pluginId: opened.pluginId,
        windowId: opened.windowId
      };
    }
    const opened = await runtime.invoke<WindowOpenResponse>('window.open', {
      config: {
        title: `Card - ${path.basename(targetPath)}`,
        width: 1200,
        height: 760
      }
    });
    return {
      targetPath,
      extension,
      mode: 'card',
      windowId: resolveWindowId(opened)
    };
  }

  if (extension === '.box') {
    await runtime.invoke('box.inspect', { boxFile: targetPath });
    const plugin = await findEnabledHandlerPlugin(runtime, extension);
    if (plugin) {
      const opened = await openByPlugin(runtime, plugin, targetPath, 'Box Viewer');
      return {
        targetPath,
        extension,
        mode: 'box',
        pluginId: opened.pluginId,
        windowId: opened.windowId
      };
    }
    const opened = await runtime.invoke<WindowOpenResponse>('window.open', {
      config: {
        title: `Box - ${path.basename(targetPath)}`,
        width: 1280,
        height: 800
      }
    });
    return {
      targetPath,
      extension,
      mode: 'box',
      windowId: resolveWindowId(opened)
    };
  }

  await runtime.invoke('platform.shellOpenPath', { path: targetPath });
  return {
    targetPath,
    extension,
    mode: 'shell'
  };
};

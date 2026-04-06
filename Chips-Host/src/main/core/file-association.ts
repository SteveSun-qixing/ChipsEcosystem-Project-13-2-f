import fs from 'node:fs/promises';
import path from 'node:path';
import { createError } from '../../shared/errors';
import type { RuntimeClient } from '../../renderer/runtime-client';

interface PluginQueryResponse {
  plugins: Array<{
    id: string;
    enabled: boolean;
    type: 'app' | 'card' | 'layout' | 'module' | 'theme';
    capabilities: string[];
  }>;
}

export interface FileAssociationOpenResult {
  targetPath: string;
  extension: string;
  mode: 'card' | 'box' | 'plugin' | 'shell';
  windowId?: string;
  pluginId?: string;
}

const findEnabledHandlerPlugin = async (
  runtime: RuntimeClient,
  extension: string
): Promise<{ id: string } | undefined> => {
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
    id: candidate.id
  };
};

const openByPlugin = async (
  runtime: RuntimeClient,
  plugin: { id: string },
  targetPath: string,
  mode?: 'card' | 'box'
): Promise<{ pluginId: string; windowId: string }> => {
  const launchParams: Record<string, unknown> = {
    targetPath,
    trigger: 'file-association'
  };
  if (mode) {
    launchParams.fileOpenMode = mode;
  }

  const launched = await runtime.invoke<{ pluginId: string; window: { id: string } }>('plugin.launch', {
    pluginId: plugin.id,
    launchParams
  });
  return {
    pluginId: plugin.id,
    windowId: launched.window.id
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
    const opened = await runtime.invoke<{ result: { pluginId?: string; windowId?: string } }>('card.open', {
      cardFile: targetPath
    });
    return {
      targetPath,
      extension,
      mode: 'card',
      pluginId: opened.result.pluginId,
      windowId: opened.result.windowId
    };
  }

  if (extension === '.box') {
    await runtime.invoke('box.inspect', { boxFile: targetPath });
    const plugin = await findEnabledHandlerPlugin(runtime, extension);
    if (plugin) {
      const opened = await openByPlugin(runtime, plugin, targetPath, 'box');
      return {
        targetPath,
        extension,
        mode: 'box',
        pluginId: opened.pluginId,
        windowId: opened.windowId
      };
    }
    throw createError('FILE_ASSOCIATION_HANDLER_MISSING', 'No enabled viewer is registered for .box files.', {
      targetPath,
      extension,
      expectedCapability: 'file-handler:.box'
    });
  }

  const plugin = await findEnabledHandlerPlugin(runtime, extension);
  if (plugin) {
    const opened = await openByPlugin(runtime, plugin, targetPath);
    return {
      targetPath,
      extension,
      mode: 'plugin',
      pluginId: opened.pluginId,
      windowId: opened.windowId
    };
  }

  await runtime.invoke('platform.shellOpenPath', { path: targetPath });
  return {
    targetPath,
    extension,
    mode: 'shell'
  };
};

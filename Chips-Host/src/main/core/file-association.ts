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

interface PluginInitResponse {
  session: {
    sessionId: string;
    sessionNonce: string;
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

const findEnabledHandlerPlugin = async (runtime: RuntimeClient, extension: string): Promise<string | undefined> => {
  const capability = `file-handler:${extension}`;
  const queried = await runtime.invoke<PluginQueryResponse>('plugin.query', {
    type: 'app',
    capability
  });
  const candidate = queried.plugins.find((plugin) => plugin.enabled && plugin.type === 'app');
  return candidate?.id;
};

const openByPlugin = async (
  runtime: RuntimeClient,
  pluginId: string,
  targetPath: string,
  defaultTitle: string
): Promise<{ pluginId: string; windowId: string }> => {
  const initialized = await runtime.invoke<PluginInitResponse>('plugin.init', {
    pluginId,
    launchParams: {
      targetPath,
      trigger: 'file-association'
    }
  });
  await runtime.invoke('plugin.handshake.complete', {
    sessionId: initialized.session.sessionId,
    nonce: initialized.session.sessionNonce
  });

  const opened = await runtime.invoke<WindowOpenResponse>('window.open', {
    config: {
      title: `${defaultTitle} - ${path.basename(targetPath)}`,
      width: 1280,
      height: 800
    }
  });
  return {
    pluginId,
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
    const pluginId = await findEnabledHandlerPlugin(runtime, extension);
    if (pluginId) {
      const opened = await openByPlugin(runtime, pluginId, targetPath, 'Card Viewer');
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
    const pluginId = await findEnabledHandlerPlugin(runtime, extension);
    if (pluginId) {
      const opened = await openByPlugin(runtime, pluginId, targetPath, 'Box Viewer');
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

  await runtime.invoke('shell.openPath', { path: targetPath });
  return {
    targetPath,
    extension,
    mode: 'shell'
  };
};

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { bootstrapHostMainProcess } from '../core/main-process';
import { RuntimeClient } from '../../renderer/runtime-client';
import type { PluginUiConfig } from '../../shared/window-chrome';
import { resolveManifestWindowChrome } from '../../shared/window-chrome';
import { parseYamlLite } from '../../shared/yaml-lite';

interface ParsedArgs {
  workspacePath: string;
  manifestPath: string;
}

interface ManifestSummary {
  id?: string;
  name?: string;
}

interface PluginQueryResponse {
  plugins: Array<{
    id: string;
    installPath?: string;
    entry?: string | Record<string, string>;
    ui?: PluginUiConfig;
  }>;
}

interface PluginInstallResponse {
  pluginId: string;
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

const readManifestSummary = async (manifestPath: string): Promise<ManifestSummary> => {
  const raw = await fs.readFile(manifestPath, 'utf-8');
  const parsed = parseYamlLite(raw) as Record<string, unknown>;
  return {
    id: typeof parsed.id === 'string' ? parsed.id : undefined,
    name: typeof parsed.name === 'string' ? parsed.name : undefined
  };
};

const parseArgs = (argv: string[]): ParsedArgs => {
  let workspacePath = '';
  let manifestPath = '';

  for (const item of argv) {
    if (item.startsWith('--workspace=')) {
      workspacePath = item.slice('--workspace='.length);
    } else if (item.startsWith('--manifest=')) {
      manifestPath = item.slice('--manifest='.length);
    }
  }

  if (!workspacePath || !manifestPath) {
    throw new Error('缺少必需参数：--workspace 与 --manifest');
  }

  return {
    workspacePath: path.resolve(workspacePath),
    manifestPath: path.resolve(manifestPath)
  };
};

const resolveWindowId = (opened: WindowOpenResponse): string => {
  if (!opened.window || typeof opened.window.id !== 'string' || opened.window.id.length === 0) {
    throw new Error('window.open 未返回有效窗口 ID');
  }
  return opened.window.id;
};

const run = async (): Promise<void> => {
  const { workspacePath, manifestPath } = parseArgs(process.argv.slice(2));
  const manifest = await readManifestSummary(manifestPath);
  const mainProcess = await bootstrapHostMainProcess({ workspacePath });
  const hostApplication = mainProcess.getHostApplication();
  const runtime = new RuntimeClient(hostApplication.createBridge());

  try {
    const installedPlugins = await runtime.invoke<PluginQueryResponse>('plugin.query', {
      type: 'app'
    });
    const existingPlugin = installedPlugins.plugins.find((item) => item.id === manifest.id);

    if (existingPlugin && manifest.id) {
      try {
        await runtime.invoke('plugin.disable', { pluginId: manifest.id });
      } catch {
        // ignore disable errors and continue uninstall
      }
      await runtime.invoke('plugin.uninstall', { pluginId: manifest.id });
    }

    const installResult = await runtime.invoke<PluginInstallResponse>('plugin.install', { manifestPath });
    const pluginId = installResult.pluginId;

    await runtime.invoke('plugin.enable', { pluginId });

    const initResult = await runtime.invoke<PluginInitResponse>('plugin.init', {
      pluginId,
      launchParams: {
        trigger: 'chipsdev.run'
      }
    });

    await runtime.invoke('plugin.handshake.complete', {
      sessionId: initResult.session.sessionId,
      nonce: initResult.session.sessionNonce
    });

    const queryResult = await runtime.invoke<PluginQueryResponse>('plugin.query', {
      type: 'app'
    });
    const record = queryResult.plugins.find((item) => item.id === pluginId);
    const url =
      record && record.installPath && typeof record.entry === 'string'
        ? path.resolve(record.installPath, record.entry)
        : undefined;

    const opened = await runtime.invoke<WindowOpenResponse>('window.open', {
      config: {
        title: manifest.name || pluginId,
        width: 1280,
        height: 800,
        pluginId,
        sessionId: initResult.session.sessionId,
        permissions: initResult.session.permissions,
        url,
        chrome: resolveManifestWindowChrome(record?.ui)
      }
    });

    process.stdout.write(
      JSON.stringify(
        {
          message: 'Host 已在开发工作区中启动应用插件',
          workspacePath,
          pluginId,
          windowId: resolveWindowId(opened)
        },
        null,
        2
      ) + '\n'
    );
  } catch (error) {
    await mainProcess.stop().catch(() => undefined);
    throw error;
  }
};

void run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

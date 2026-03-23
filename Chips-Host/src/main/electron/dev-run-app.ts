import path from 'node:path';
import process from 'node:process';
import { bootstrapHostMainProcess } from '../core/main-process';
import { RuntimeClient } from '../../renderer/runtime-client';
import { readManifestSummary, reinstallAndEnablePlugin, syncConfiguredWorkspacePlugins } from './dev-plugin-utils';

interface ParsedArgs {
  workspacePath: string;
  manifestPath: string;
}

interface PluginLaunchResponse {
  window: {
    id: string;
  };
}

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

const resolveWindowId = (opened: PluginLaunchResponse): string => {
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
    await syncConfiguredWorkspacePlugins(runtime, workspacePath, {
      skipPluginIds: manifest.id ? [manifest.id] : []
    });
    const installResult = await reinstallAndEnablePlugin(runtime, manifestPath, manifest.id);
    const pluginId = installResult.pluginId;

    const opened = await runtime.invoke<PluginLaunchResponse>('plugin.launch', {
      pluginId,
      launchParams: {
        displayName: manifest.name,
        trigger: 'chipsdev.run'
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
  let message = String(error);
  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as any).message);
    if ('code' in error) {
      message = `[${(error as any).code}] ${message}`;
    }
  }
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

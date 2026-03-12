import process from 'node:process';
import path from 'node:path';
import os from 'node:os';
import { bootstrapHostMainProcess } from '../core/main-process';
import { RuntimeClient } from '../../renderer/runtime-client';
import { toStandardError } from '../../shared/errors';
import { loadElectronModule } from './electron-loader';

interface PluginLaunchRequest {
  workspacePath: string;
  pluginId: string;
  launchParams: Record<string, unknown>;
}

const LAUNCH_PLUGIN_PREFIX = '--chips-launch-plugin=';
const LAUNCH_PAYLOAD_PREFIX = '--chips-launch-payload=';
const WORKSPACE_PREFIX = '--workspace=';

const resolveWorkspacePath = (argv: string[]): string => {
  const workspaceArg = argv.find((item) => item.startsWith(WORKSPACE_PREFIX));
  if (!workspaceArg) {
    return process.env.CHIPS_HOME ?? path.join(os.homedir(), '.chips-host');
  }

  const workspacePath = workspaceArg.slice(WORKSPACE_PREFIX.length).trim();
  return workspacePath.length > 0 ? path.resolve(workspacePath) : process.env.CHIPS_HOME ?? path.join(os.homedir(), '.chips-host');
};

const parseLaunchRequest = (argv: string[]): PluginLaunchRequest | null => {
  const pluginArg = argv.find((item) => item.startsWith(LAUNCH_PLUGIN_PREFIX));
  if (!pluginArg) {
    return null;
  }

  const pluginId = pluginArg.slice(LAUNCH_PLUGIN_PREFIX.length).trim();
  if (!pluginId) {
    return null;
  }

  const payloadArg = argv.find((item) => item.startsWith(LAUNCH_PAYLOAD_PREFIX));
  if (!payloadArg) {
    return {
      workspacePath: resolveWorkspacePath(argv),
      pluginId,
      launchParams: {
        trigger: 'app-shortcut'
      }
    };
  }

  try {
    const encoded = payloadArg.slice(LAUNCH_PAYLOAD_PREFIX.length);
    const decoded = Buffer.from(encoded, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    return {
      workspacePath: resolveWorkspacePath(argv),
      pluginId,
      launchParams: {
        trigger: 'app-shortcut',
        ...parsed
      }
    };
  } catch {
    return {
      workspacePath: resolveWorkspacePath(argv),
      pluginId,
      launchParams: {
        trigger: 'app-shortcut'
      }
    };
  }
};

const run = async (): Promise<void> => {
  const electronApp = loadElectronModule()?.app ?? null;
  const initialRequest = parseLaunchRequest(process.argv);
  if (electronApp?.requestSingleInstanceLock && !electronApp.requestSingleInstanceLock()) {
    electronApp.quit();
    return;
  }

  const workspacePath = initialRequest?.workspacePath ?? resolveWorkspacePath(process.argv);
  const mainProcess = await bootstrapHostMainProcess({ workspacePath });
  const runtime = new RuntimeClient(mainProcess.getHostApplication().createBridge());

  const dispatchLaunch = async (argv: string[], currentRuntime: RuntimeClient): Promise<void> => {
    const request = parseLaunchRequest(argv);
    if (!request) {
      return;
    }
    await currentRuntime.invoke('plugin.launch', {
      pluginId: request.pluginId,
      launchParams: request.launchParams
    });
  };

  if (electronApp) {
    electronApp.on('second-instance', (_event, argv) => {
      void dispatchLaunch(argv, runtime);
    });
  }

  await dispatchLaunch(process.argv, runtime);
};

void run().catch((error) => {
  const standard = toStandardError(error, 'HOST_ELECTRON_BOOT_FAILED');
  process.stderr.write(`${standard.code}: ${standard.message}\n`);
  process.exitCode = 1;
});

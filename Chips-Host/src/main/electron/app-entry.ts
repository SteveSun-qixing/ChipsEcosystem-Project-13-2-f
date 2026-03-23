import process from 'node:process';
import path from 'node:path';
import os from 'node:os';
import { bootstrapHostMainProcess } from '../core/main-process';
import { RuntimeClient } from '../../renderer/runtime-client';
import { openAssociatedFile } from '../core/file-association';
import { toStandardError } from '../../shared/errors';
import type { ElectronAppLike } from './electron-loader';
import { loadElectronModule } from './electron-loader';

interface PluginLaunchRequest {
  workspacePath: string;
  pluginId: string;
  launchParams: Record<string, unknown>;
}

interface RuntimeInvokerLike {
  invoke(action: string, payload?: unknown): Promise<unknown>;
}

interface ProcessWriteLike {
  write(message: string): boolean;
}

interface ProcessRefLike {
  stderr: ProcessWriteLike;
  exitCode?: number;
}

interface HostMainProcessLike {
  getHostApplication(): {
    createBridge(): unknown;
    takeStartupLaunchPluginId(): string | undefined;
  };
}

interface RunElectronAppEntryOptions {
  argv?: string[];
  electronApp?: ElectronAppLike | null;
  bootstrapMainProcess?: (options: { workspacePath: string }) => Promise<HostMainProcessLike>;
  createRuntime?: (mainProcess: HostMainProcessLike) => RuntimeInvokerLike;
  openAssociatedFileFn?: (runtime: RuntimeInvokerLike, inputPath: string) => Promise<unknown>;
  processRef?: ProcessRefLike;
}

const LAUNCH_PLUGIN_PREFIX = '--chips-launch-plugin=';
const LAUNCH_PAYLOAD_PREFIX = '--chips-launch-payload=';
const WORKSPACE_PREFIX = '--workspace=';
const ASSOCIATED_FILE_EXTENSIONS = new Set(['.card', '.box']);

const resolveWorkspacePath = (argv: string[]): string => {
  const workspaceArg = argv.find((item) => item.startsWith(WORKSPACE_PREFIX));
  if (!workspaceArg) {
    return process.env.CHIPS_HOME ?? path.join(os.homedir(), '.chips-host');
  }

  const workspacePath = workspaceArg.slice(WORKSPACE_PREFIX.length).trim();
  return workspacePath.length > 0 ? path.resolve(workspacePath) : process.env.CHIPS_HOME ?? path.join(os.homedir(), '.chips-host');
};

export const parseLaunchRequest = (argv: string[]): PluginLaunchRequest | null => {
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

export const extractAssociatedFilePath = (argv: string[]): string | null => {
  for (let index = argv.length - 1; index >= 0; index -= 1) {
    const value = argv[index]?.trim();
    if (!value || value.startsWith('--')) {
      continue;
    }
    const extension = path.extname(value).toLowerCase();
    if (!ASSOCIATED_FILE_EXTENSIONS.has(extension)) {
      continue;
    }
    return path.resolve(value);
  }
  return null;
};

export const runElectronAppEntry = async (options: RunElectronAppEntryOptions = {}): Promise<void> => {
  const argv = options.argv ?? process.argv;
  const electronApp = options.electronApp ?? loadElectronModule()?.app ?? null;
  const bootstrapMainProcess = options.bootstrapMainProcess ?? bootstrapHostMainProcess;
  const createRuntime = options.createRuntime ?? ((mainProcess: HostMainProcessLike) => (
    new RuntimeClient(mainProcess.getHostApplication().createBridge() as any)
  ));
  const openAssociatedFileFn: NonNullable<RunElectronAppEntryOptions['openAssociatedFileFn']> =
    options.openAssociatedFileFn ??
    (async (runtime, inputPath) => openAssociatedFile(runtime as RuntimeClient, inputPath));
  const processRef = options.processRef ?? process;
  const initialRequest = parseLaunchRequest(argv);
  const pendingAssociatedFiles: string[] = [];

  const writeStartupError = (error: unknown): void => {
    const standard = toStandardError(error, 'HOST_ELECTRON_LAUNCH_FAILED');
    processRef.stderr.write(`${standard.code}: ${standard.message}\n`);
  };

  const dispatchLaunch = async (runtime: RuntimeInvokerLike, launchArgv: string[]): Promise<boolean> => {
    const request = parseLaunchRequest(launchArgv);
    if (!request) {
      return false;
    }
    await runtime.invoke('plugin.launch', {
      pluginId: request.pluginId,
      launchParams: request.launchParams
    });
    return true;
  };

  const dispatchAssociatedFile = async (runtime: RuntimeInvokerLike, targetPath: string): Promise<void> => {
    await openAssociatedFileFn(runtime, targetPath);
  };

  const dispatchStartupInputs = async (runtime: RuntimeInvokerLike, launchArgv: string[]): Promise<boolean> => {
    if (await dispatchLaunch(runtime, launchArgv)) {
      return true;
    }
    const associatedFilePath = extractAssociatedFilePath(launchArgv);
    if (!associatedFilePath) {
      return false;
    }
    await dispatchAssociatedFile(runtime, associatedFilePath);
    return true;
  };

  const queueAssociatedFile = (filePath: string): void => {
    const extension = path.extname(filePath).toLowerCase();
    if (!ASSOCIATED_FILE_EXTENSIONS.has(extension)) {
      return;
    }
    pendingAssociatedFiles.push(path.resolve(filePath));
  };

  if (electronApp) {
    electronApp.on('open-file', (event, filePath) => {
      event.preventDefault?.();
      queueAssociatedFile(filePath);
    });
  }

  if (electronApp?.requestSingleInstanceLock && !electronApp.requestSingleInstanceLock()) {
    electronApp.quit();
    return;
  }

  const workspacePath = initialRequest?.workspacePath ?? resolveWorkspacePath(argv);
  const mainProcess = await bootstrapMainProcess({ workspacePath });
  const runtime = createRuntime(mainProcess);

  while (pendingAssociatedFiles.length > 0) {
    const nextTarget = pendingAssociatedFiles.shift();
    if (!nextTarget) {
      continue;
    }
    await dispatchAssociatedFile(runtime, nextTarget);
  }

  if (electronApp) {
    electronApp.on('second-instance', (_event, argv) => {
      void dispatchStartupInputs(runtime, argv).catch(writeStartupError);
    });
  }

  const handledStartupInput = await dispatchStartupInputs(runtime, argv);
  if (!handledStartupInput) {
    const startupPluginId = mainProcess.getHostApplication().takeStartupLaunchPluginId();
    if (startupPluginId) {
      await runtime.invoke('plugin.launch', {
        pluginId: startupPluginId,
        launchParams: {
          trigger: 'host-first-run'
        }
      });
    }
  }
};

if (require.main === module) {
  void runElectronAppEntry().catch((error) => {
    const standard = toStandardError(error, 'HOST_ELECTRON_BOOT_FAILED');
    process.stderr.write(`${standard.code}: ${standard.message}\n`);
    process.exitCode = 1;
  });
}

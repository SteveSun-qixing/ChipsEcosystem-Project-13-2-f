import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { HostApplication } from '../core/host-application';
import { openAssociatedFile } from '../core/file-association';
import { RuntimeClient } from '../../renderer/runtime-client';

const stateFile = (workspace: string) => path.join(workspace, 'host-state.json');
const pluginFile = (workspace: string) => path.join(workspace, 'plugins.json');
const getWorkspace = (): string => process.env.CHIPS_HOME ?? path.join(os.homedir(), '.chips-host');

const ensureWorkspace = async (workspace: string): Promise<void> => {
  await fs.mkdir(workspace, { recursive: true });
};

const readJson = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
};

const print = (value: unknown): void => {
  if (typeof value === 'string') {
    process.stdout.write(value + '\n');
    return;
  }

  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
};

const withHost = async <T>(workspace: string, run: (runtime: RuntimeClient) => Promise<T>): Promise<T> => {
  const app = new HostApplication({ workspacePath: workspace });
  await app.start();
  const bridge = app.createBridge();
  const runtime = new RuntimeClient(bridge);
  try {
    return await run(runtime);
  } finally {
    await app.stop();
  }
};

const parseArgs = (argv: string[]): { command: string; subcommand?: string; args: string[] } => {
  const [command = 'help', subcommand, ...args] = argv;
  return { command, subcommand, args };
};

export const runCli = async (argv: string[]): Promise<number> => {
  const workspace = getWorkspace();
  await ensureWorkspace(workspace);

  const { command, subcommand, args } = parseArgs(argv);

  if (command === 'help') {
    print('chips host <start|stop|status|config|logs|plugin|update|doctor|open>');
    return 0;
  }

  if (command === 'start') {
    const state = {
      running: true,
      pid: process.pid,
      startedAt: new Date().toISOString()
    };
    await writeJson(stateFile(workspace), state);
    print(state);
    return 0;
  }

  if (command === 'stop') {
    await fs.rm(stateFile(workspace), { force: true });
    print({ running: false });
    return 0;
  }

  if (command === 'status') {
    const state = await readJson(stateFile(workspace), { running: false });
    print(state);
    return 0;
  }

  if (command === 'config') {
    if (subcommand === 'list') {
      const config = await readJson(path.join(workspace, 'config.json'), {});
      print(config);
      return 0;
    }

    if (subcommand === 'set') {
      const [key, value] = args;
      if (!key) {
        print({ error: 'config set requires key and value' });
        return 1;
      }

      await withHost(workspace, async (runtime) => {
        await runtime.invoke('config.set', { key, value });
      });
      print({ ok: true });
      return 0;
    }

    if (subcommand === 'reset') {
      const [key] = args;
      await withHost(workspace, async (runtime) => {
        await runtime.invoke('config.reset', { key });
      });
      print({ ok: true });
      return 0;
    }

    print({ error: 'unsupported config command' });
    return 1;
  }

  if (command === 'logs') {
    const exported = await withHost(workspace, async (runtime) => runtime.invoke('log.export', {}));
    print(exported);
    return 0;
  }

  if (command === 'plugin') {
    const plugins = await readJson<Array<{ id: string; manifestPath: string; enabled: boolean }>>(pluginFile(workspace), []);

    if (subcommand === 'list') {
      print(plugins);
      return 0;
    }

    if (subcommand === 'install') {
      const [manifestPath] = args;
      if (!manifestPath) {
        print({ error: 'plugin install requires manifest path' });
        return 1;
      }

      const result = await withHost(workspace, async (runtime) => {
        return runtime.invoke<{ pluginId: string }>('plugin.install', { manifestPath });
      });

      plugins.push({ id: result.pluginId, manifestPath, enabled: false });
      await writeJson(pluginFile(workspace), plugins);
      print(result);
      return 0;
    }

    if (subcommand === 'uninstall') {
      const [pluginId] = args;
      if (!pluginId) {
        print({ error: 'plugin uninstall requires plugin id' });
        return 1;
      }

      await withHost(workspace, async (runtime) => {
        await runtime.invoke('plugin.uninstall', { pluginId });
      });

      const next = plugins.filter((plugin) => plugin.id !== pluginId);
      await writeJson(pluginFile(workspace), next);
      print({ ok: true });
      return 0;
    }

    if (subcommand === 'enable') {
      const [pluginId] = args;
      if (!pluginId) {
        print({ error: 'plugin enable requires plugin id' });
        return 1;
      }
      await withHost(workspace, async (runtime) => {
        await runtime.invoke('plugin.enable', { pluginId });
      });
      const plugin = plugins.find((item) => item.id === pluginId);
      if (plugin) {
        plugin.enabled = true;
      }
      await writeJson(pluginFile(workspace), plugins);
      print({ ok: true });
      return 0;
    }

    if (subcommand === 'disable') {
      const [pluginId] = args;
      if (!pluginId) {
        print({ error: 'plugin disable requires plugin id' });
        return 1;
      }
      await withHost(workspace, async (runtime) => {
        await runtime.invoke('plugin.disable', { pluginId });
      });
      const plugin = plugins.find((item) => item.id === pluginId);
      if (plugin) {
        plugin.enabled = false;
      }
      await writeJson(pluginFile(workspace), plugins);
      print({ ok: true });
      return 0;
    }

    if (subcommand === 'query') {
      const [type, capability] = args;
      const result = await withHost(workspace, async (runtime) => {
        return runtime.invoke('plugin.query', { type, capability });
      });
      print(result);
      return 0;
    }

    print({ error: 'unsupported plugin command' });
    return 1;
  }

  if (command === 'update') {
    if (subcommand === 'check') {
      print({ currentVersion: '0.1.0', latestVersion: '0.1.0', updateAvailable: false });
      return 0;
    }

    if (subcommand === 'install') {
      print({ installed: true, version: '0.1.0' });
      return 0;
    }

    print({ error: 'unsupported update command' });
    return 1;
  }

  if (command === 'doctor') {
    const checks = {
      workspaceExists: true,
      workspaceWritable: true,
      stateFileExists: await fs
        .access(stateFile(workspace))
        .then(() => true)
        .catch(() => false),
      pluginStoreExists: await fs
        .access(pluginFile(workspace))
        .then(() => true)
        .catch(() => false)
    };
    print({ checks });
    return 0;
  }

  if (command === 'open') {
    const targetPath = subcommand ?? args[0];
    if (!targetPath) {
      print({ error: 'open requires target file path' });
      return 1;
    }

    try {
      const result = await withHost(workspace, async (runtime) => openAssociatedFile(runtime, targetPath));
      print(result);
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      print({ error: message });
      return 1;
    }
  }

  print({ error: `unknown command: ${command}` });
  return 1;
};

if (require.main === module) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

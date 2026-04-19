import path from 'node:path';
import process from 'node:process';
import { bootstrapHostMainProcess } from '../core/main-process';
import { RuntimeClient } from '../../renderer/runtime-client';
import { readManifestSummary, reinstallAndEnablePlugin, waitForModuleJob } from './dev-plugin-utils';
import { toStandardError } from '../../shared/errors';

interface ParsedArgs {
  workspacePath: string;
  manifestPath?: string;
  capability: string;
  method: string;
  input: unknown;
  timeoutMs: number;
}

const WORKSPACE_PREFIX = '--workspace=';
const MANIFEST_PREFIX = '--manifest=';
const CAPABILITY_PREFIX = '--capability=';
const METHOD_PREFIX = '--method=';
const INPUT_PREFIX = '--input-base64=';
const TIMEOUT_PREFIX = '--timeout-ms=';

const parseJsonBase64 = (value: string | undefined): unknown => {
  if (!value || value.trim().length === 0) {
    return {};
  }

  const decoded = Buffer.from(value, 'base64url').toString('utf-8');
  return JSON.parse(decoded) as unknown;
};

const parseTimeout = (argv: string[]): number => {
  const value = argv.find((item) => item.startsWith(TIMEOUT_PREFIX))?.slice(TIMEOUT_PREFIX.length);
  if (!value) {
    return 60_000;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('timeout-ms 必须是正整数。');
  }
  return parsed;
};

const requireArgument = (argv: string[], prefix: string, name: string): string => {
  const value = argv.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim();
  if (!value) {
    throw new Error(`缺少必需参数：${name}`);
  }
  return value;
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const workspacePath = path.resolve(requireArgument(argv, WORKSPACE_PREFIX, '--workspace'));
  const manifestValue = argv.find((item) => item.startsWith(MANIFEST_PREFIX))?.slice(MANIFEST_PREFIX.length).trim();

  return {
    workspacePath,
    manifestPath: manifestValue ? path.resolve(manifestValue) : undefined,
    capability: requireArgument(argv, CAPABILITY_PREFIX, '--capability'),
    method: requireArgument(argv, METHOD_PREFIX, '--method'),
    input: parseJsonBase64(argv.find((item) => item.startsWith(INPUT_PREFIX))?.slice(INPUT_PREFIX.length)),
    timeoutMs: parseTimeout(argv)
  };
};

const run = async (): Promise<void> => {
  const { workspacePath, manifestPath, capability, method, input, timeoutMs } = parseArgs(process.argv.slice(2));
  const mainProcess = await bootstrapHostMainProcess({ workspacePath });
  const hostApplication = mainProcess.getHostApplication();
  const runtime = new RuntimeClient(hostApplication.createBridge(), {
    defaultTimeout: timeoutMs,
    maxRetries: 1,
    retryDelay: 10,
    retryBackoff: 2,
    enableRetry: true
  });

  try {
    const manifest = manifestPath ? await readManifestSummary(manifestPath) : undefined;
    if (manifest && manifest.type !== 'module') {
      throw new Error(`目标 manifest 不是 module 插件：${manifestPath}`);
    }

    const installed = manifestPath ? await reinstallAndEnablePlugin(runtime, manifestPath, manifest?.id) : undefined;
    const invocation = await runtime.invoke<{
      mode: 'sync' | 'job';
      output?: unknown;
      jobId?: string;
    }>('module.invoke', {
      capability,
      method,
      input
    });

    if (invocation.mode === 'sync') {
      process.stdout.write(
        JSON.stringify({
          mode: 'sync',
          installedPluginId: installed?.pluginId,
          output: invocation.output
        }) + '\n'
      );
      await mainProcess.stop({ quitElectronApp: true });
      return;
    }

    if (typeof invocation.jobId !== 'string' || invocation.jobId.length === 0) {
      throw new Error('module.invoke 未返回有效 jobId。');
    }

    const job = await waitForModuleJob(runtime, invocation.jobId, timeoutMs);
    const payload = {
      mode: 'job',
      installedPluginId: installed?.pluginId,
      jobId: invocation.jobId,
      job
    };

    process.stdout.write(JSON.stringify(payload) + '\n');

    if (job.status !== 'completed') {
      throw new Error(`模块任务未成功完成：${JSON.stringify(job.error ?? payload, null, 2)}`);
    }

    await mainProcess.stop({ quitElectronApp: true });
  } catch (error) {
    await mainProcess.stop({ quitElectronApp: true }).catch(() => undefined);
    throw error;
  }
};

void run().catch((error) => {
  const standard = toStandardError(error, 'HOST_ELECTRON_MODULE_INVOKE_FAILED');
  process.stderr.write(`${standard.code}: ${standard.message}\n`);
  if (typeof standard.details !== 'undefined') {
    process.stderr.write(`${JSON.stringify(standard.details, null, 2)}\n`);
  }
  process.exitCode = 1;
});

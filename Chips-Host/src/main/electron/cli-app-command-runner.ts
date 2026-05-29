import process from 'node:process';
import { bootstrapHostMainProcess } from '../core/main-process';
import { RuntimeClient } from '../../renderer/runtime-client';
import { toStandardError } from '../../shared/errors';
import type { StandardError } from '../../shared/types';
import { executeAppCliCommand } from '../cli/index';
import type { CliCommandTargetManifestMeta } from '../../runtime';
import {
  ELECTRON_APP_CLI_ERROR_PREFIX,
  ELECTRON_APP_CLI_REQUEST_PREFIX,
  ELECTRON_APP_CLI_RESULT_PREFIX,
  decodeElectronAppCliPayload,
  encodeElectronAppCliPayload,
  type ElectronAppCliCommandRequest
} from './cli-app-command-protocol';

const findEncodedRequest = (argv: string[]): string | undefined => {
  return argv.find((item) => item.startsWith(ELECTRON_APP_CLI_REQUEST_PREFIX))?.slice(ELECTRON_APP_CLI_REQUEST_PREFIX.length);
};

const writeEnvelope = (prefix: string, payload: unknown): void => {
  process.stdout.write(`${prefix}${encodeElectronAppCliPayload(payload)}\n`);
};

const run = async (): Promise<void> => {
  const encodedRequest = findEncodedRequest(process.argv.slice(2));
  if (!encodedRequest) {
    throw new Error('缺少应用 CLI 执行请求。');
  }

  const request = decodeElectronAppCliPayload<ElectronAppCliCommandRequest>(encodedRequest);
  const mainProcess = await bootstrapHostMainProcess({ workspacePath: request.workspacePath });
  const runtime = new RuntimeClient(mainProcess.getHostApplication().createBridge() as any);

  try {
    const command = request.command as Parameters<typeof executeAppCliCommand>[1];
    const target = command.declaration.target as Extract<CliCommandTargetManifestMeta, { type: 'app' }>;
    const result = await executeAppCliCommand(runtime as any, command, target, request.payload);
    writeEnvelope(ELECTRON_APP_CLI_RESULT_PREFIX, result);
    await mainProcess.stop({ quitElectronApp: true });
  } catch (error) {
    const standard: StandardError = toStandardError(error, 'CLI_ELECTRON_APP_COMMAND_FAILED');
    writeEnvelope(ELECTRON_APP_CLI_ERROR_PREFIX, standard);
    await mainProcess.stop({ quitElectronApp: true }).catch(() => undefined);
    process.exitCode = 1;
  }
};

void run().catch((error) => {
  const standard = toStandardError(error, 'CLI_ELECTRON_APP_COMMAND_BOOT_FAILED');
  writeEnvelope(ELECTRON_APP_CLI_ERROR_PREFIX, standard);
  process.exitCode = 1;
});

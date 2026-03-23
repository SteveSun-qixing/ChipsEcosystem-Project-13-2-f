#!/usr/bin/env node

import path from 'node:path';
import { buildMacHostInstaller } from './macos-installer';
import { toStandardError } from '../../shared/errors';

const parseArgs = (argv: string[]): { command: string; outputDir?: string } => {
  let outputDir: string | undefined;
  const positional: string[] = [];

  for (const item of argv) {
    if (item.startsWith('--output=')) {
      outputDir = item.slice('--output='.length).trim();
      continue;
    }
    positional.push(item);
  }

  return {
    command: positional[0] ?? 'help',
    outputDir
  };
};

const createDefaultOutputDir = (workspaceRoot: string): string => {
  const now = new Date();
  const year = now.getFullYear().toString().padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return path.join(workspaceRoot, 'release-artifacts', `${year}-${month}-${day}`, 'macos-installer');
};

const run = async (): Promise<void> => {
  const hostProjectDir = process.cwd();
  const workspaceRoot = path.resolve(hostProjectDir, '..');
  const { command, outputDir } = parseArgs(process.argv.slice(2));

  if (command !== 'macos') {
    process.stdout.write('Usage: tsx src/main/installer/cli.ts macos [--output=/absolute/or/relative/path]\n');
    return;
  }

  const result = await buildMacHostInstaller({
    hostProjectDir,
    workspaceRoot,
    outputDir: outputDir ? path.resolve(hostProjectDir, outputDir) : createDefaultOutputDir(workspaceRoot)
  });

  process.stdout.write(
    JSON.stringify(
      {
        appBundlePath: result.appBundlePath,
        installerPath: result.installerPath,
        packageVersion: result.packageVersion,
        builtInPluginRoot: result.builtInPluginRoot
      },
      null,
      2
    ) + '\n'
  );
};

if (require.main === module) {
  void run().catch((error) => {
    const standard = toStandardError(error, 'HOST_INSTALLER_BUILD_FAILED');
    process.stderr.write(`${standard.code}: ${standard.message}\n`);
    process.exitCode = 1;
  });
}

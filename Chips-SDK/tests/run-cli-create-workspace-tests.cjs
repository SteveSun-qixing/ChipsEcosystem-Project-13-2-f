/* eslint-disable no-console */
const assert = require('node:assert/strict');
const path = require('node:path');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');

const projectRoot = path.resolve(__dirname, '..');
const ecosystemRoot = path.resolve(projectRoot, '..');
const cliPath = path.join(projectRoot, 'cli', 'index.js');

const run = (args, cwd, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = childProcess.spawn('node', [cliPath, ...args], {
      cwd,
      stdio: 'inherit',
      env
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`chipsdev ${args.join(' ')} exited with code ${code}`));
    });
  });

const runBinary = (command, args, cwd, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });

const symlinkDir = async (source, target) => {
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  await fsp.symlink(source, target, type);
};

const withWritableNpmCache = (env, cacheRoot) => ({
  ...env,
  NPM_CONFIG_CACHE: cacheRoot,
  npm_config_cache: cacheRoot
});

const main = async () => {
  console.log('Running chipsdev create workspace integration tests...');

  const sandboxRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'chipsdev-create-workspace-'));
  const linkedEntries = ['Chips-SDK', 'Chips-Scaffold', 'Chips-ComponentLibrary'];

  try {
    for (const entry of linkedEntries) {
      await symlinkDir(path.join(ecosystemRoot, entry), path.join(sandboxRoot, entry));
    }

    await fsp.writeFile(
      path.join(sandboxRoot, 'package.json'),
      JSON.stringify(
        {
          name: 'chips-ecosystem-workspace',
          private: true,
          volta: {
            node: process.versions.node,
            npm: '10.9.3'
          },
          workspaces: [
            'Chips-*',
            'Chips-BaseCardPlugin/*',
            'Chips-ComponentLibrary/packages/*',
            'Chips-ComponentLibrary/packages/adapters/*',
            'Chips-Scaffold/*',
            'ThemePack/*'
          ]
        },
        null,
        2
      ),
      'utf-8'
    );

    const env = withWritableNpmCache({
      ...process.env,
      CHIPS_ECOSYSTEM_ROOT: sandboxRoot
    }, path.join(sandboxRoot, '.npm-cache'));

    await runBinary('npm', ['run', 'build'], path.join(sandboxRoot, 'Chips-Scaffold', 'chips-scaffold-app'), env);

    const targetRelativePath = path.join('validation-projects', 'card-viewer-smoke');
    const targetDir = path.join(sandboxRoot, targetRelativePath);

    await run(['create', 'app', targetRelativePath], sandboxRoot, env);

    const rootPackage = JSON.parse(await fsp.readFile(path.join(sandboxRoot, 'package.json'), 'utf-8'));
    assert.equal(rootPackage.workspaces.includes('validation-projects/card-viewer-smoke'), true);

    const createdPackage = JSON.parse(await fsp.readFile(path.join(targetDir, 'package.json'), 'utf-8'));
    assert.equal(createdPackage.dependencies['@chips/component-library'], '^0.1.0');
    assert.equal(createdPackage.devDependencies['chips-sdk'], '^0.1.0');
    assert.equal(createdPackage.volta.extends, '../../package.json');

    await runBinary('npm', ['install'], sandboxRoot, env);
    await runBinary('npm', ['run', 'lint'], targetDir, env);
    await runBinary('npm', ['run', 'build'], targetDir, env);
    await runBinary('npm', ['test'], targetDir, env);

    console.log('chipsdev create workspace integration tests completed.');
  } finally {
    await fsp.rm(sandboxRoot, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
